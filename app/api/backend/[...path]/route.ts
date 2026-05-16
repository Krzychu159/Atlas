import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { expireAuthCookies } from "@/app/lib/server/auth-cookies";

const BACKEND_URL = process.env.BACKEND_API_URL;

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function handler(req: NextRequest, context: RouteContext) {
  if (!BACKEND_URL) {
    return jsonError("Brakuje konfiguracji BACKEND_API_URL.", 500);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    const response = jsonError("Sesja wygasła.", 401);

    expireAuthCookies(response);

    return response;
  }

  const { path } = await context.params;
  const backendPath = path.join("/");

  const url = new URL(`${BACKEND_URL}/api/${backendPath}`);

  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.text();

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });
  } catch {
    return jsonError("Nie udało się połączyć z backendem.", 502);
  }

  const text = await response.text();

  if ([204, 205, 304].includes(response.status)) {
    const nextResponse = new NextResponse(null, {
      status: response.status,
    });

    nextResponse.headers.set("Cache-Control", "no-store");

    if (response.status === 401) {
      expireAuthCookies(nextResponse);
    }

    return nextResponse;
  }

  const nextResponse = new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });

  if (response.status === 401) {
    expireAuthCookies(nextResponse);
  }

  return nextResponse;
}

function jsonError(message: string, status: number) {
  const response = NextResponse.json({ message }, { status });
  response.headers.set("Cache-Control", "no-store");

  return response;
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
