import { NextResponse, type NextRequest } from "next/server";
import { verifyBackendSession, VERIFIED_USER_HEADER } from "@/app/lib/server/session";
import { expireAuthCookies } from "@/app/lib/server/auth-cookies";
import type { CurrentUser } from "@/app/lib/auth/user";

const protectedPrefixes = ["/owner", "/trainer", "/client"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function continueWithCurrentPath(request: NextRequest, user: CurrentUser) {
  const requestHeaders = new Headers(request.headers);
  // Never trust a verification header supplied by the browser.
  requestHeaders.set(VERIFIED_USER_HEADER, encodeURIComponent(JSON.stringify(user)));
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

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  if (accessToken) {
    const session = await verifyBackendSession(accessToken);
    if (session.state === "unavailable") {
      return new NextResponse('<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATLAS — spróbuj ponownie</title><body><main><h1>Nie możemy teraz potwierdzić dostępu</h1><p>Spróbuj ponownie za chwilę. Twoje dane logowania zostały zachowane.</p><a href="">Spróbuj ponownie</a></main></body></html>', {
        status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "5" },
      });
    }
    if (session.state === "authenticated") {
      const expectedRole = pathname.split("/")[1];
      if (session.user.role !== expectedRole) {
        return NextResponse.redirect(new URL(`/${session.user.role}`, request.url));
      }
      return continueWithCurrentPath(request, session.user);
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  const response = NextResponse.redirect(loginUrl);
  expireAuthCookies(response);
  return response;
}

export const config = {
  matcher: ["/owner/:path*", "/trainer/:path*", "/client/:path*"],
};
