import { NextRequest, NextResponse } from "next/server";

function getHomeByRole(role?: string) {
  switch (role) {
    case "owner":
      return "/owner";
    case "trainer":
      return "/trainer";
    case "client":
      return "/client";
    default:
      return "/login";
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("accessToken")?.value;
  const role = req.cookies.get("role")?.value;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  const isOwnerRoute = pathname.startsWith("/owner");
  const isTrainerRoute = pathname.startsWith("/trainer");
  const isClientRoute = pathname.startsWith("/client");

  if (pathname === "/") {
    return NextResponse.redirect(new URL(getHomeByRole(role), req.url));
  }

  if (isAuthPage) {
    if (token && role) {
      return NextResponse.redirect(new URL(getHomeByRole(role), req.url));
    }
    return NextResponse.next();
  }

  if (!token || !role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isOwnerRoute && role !== "owner") {
    return NextResponse.redirect(new URL(getHomeByRole(role), req.url));
  }

  if (isTrainerRoute && role !== "trainer") {
    return NextResponse.redirect(new URL(getHomeByRole(role), req.url));
  }

  if (isClientRoute && role !== "client") {
    return NextResponse.redirect(new URL(getHomeByRole(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/owner/:path*",
    "/trainer/:path*",
    "/client/:path*",
  ],
};
