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
  const { path } = await context.params;
  const backendPath = path.join("/");
  const publicRead = req.method === "GET" &&
    /^public\/group-classes(?:\/(?:locations|packages|\d+|by-slug\/[^/]+|packages\/by-slug\/[^/]+))?$/.test(backendPath);

  if (!token && !publicRead) {
    const response = jsonError("Sesja wygasła.", 401);

    expireAuthCookies(response);

    return response;
  }

  const url = new URL(`${BACKEND_URL}/api/${backendPath}`);

  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        Accept: req.headers.get("accept") || "application/json",
        ...(body?.byteLength
          ? {
              "Content-Type":
                req.headers.get("content-type") || "application/json",
            }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body?.byteLength ? body : undefined,
      cache: "no-store",
    });
  } catch {
    return jsonError("Nie udało się połączyć z backendem.", 502);
  }

  // Public listings remain available when a previously valid session expires.
  const expiredPublicSession = publicRead && response.status === 401 && Boolean(token);
  if (expiredPublicSession) {
    try {
      response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    } catch {
      return jsonError("Nie udało się połączyć z backendem.", 502);
    }
  }

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

  const bodyBytes = await response.arrayBuffer();

  const nextResponse = new NextResponse(bodyBytes, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });

  const contentDisposition = response.headers.get("content-disposition");

  if (contentDisposition) {
    nextResponse.headers.set("Content-Disposition", contentDisposition);
  }

  if (response.status === 401 || expiredPublicSession) {
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
