import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/owner", "/trainer", "/client"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function continueWithCurrentPath(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-atlas-current-path",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  const role = request.cookies.get("role")?.value;
  const userId = request.cookies.get("userId")?.value;

  if (accessToken && role && userId) {
    return continueWithCurrentPath(request);
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/owner/:path*", "/trainer/:path*", "/client/:path*"],
};
