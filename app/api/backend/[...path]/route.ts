import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL;
const authCookieNames = [
  "accessToken",
  "refreshToken",
  "role",
  "userId",
  "refresh_token",
  "user_role",
];

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function handler(req: NextRequest, context: RouteContext) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { message: "Missing BACKEND_API_URL" },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    const response = NextResponse.json(
      { message: "Session expired" },
      { status: 401 },
    );

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

  const response = await fetch(url.toString(), {
    method: req.method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    cache: "no-store",
  });

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

function expireAuthCookies(response: NextResponse) {
  const expiredCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    expires: new Date(0),
    path: "/",
  };

  authCookieNames.forEach((name) => {
    response.cookies.set(name, "", expiredCookie);
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
