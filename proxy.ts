import { NextRequest, NextResponse } from "next/server";

function getDashboardByRole(role?: string) {
  switch (role) {
    case "Owner":
      return "/owner";
    case "Trainer":
      return "/trainer";
    case "Client":
      return "/client";
    default:
      return "/login";
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("auth_token")?.value;
  const role = req.cookies.get("user_role")?.value;

  const isAuthPage = pathname.startsWith("/login");
  const isOwnerRoute = pathname.startsWith("/owner");
  const isTrainerRoute = pathname.startsWith("/trainer");
  const isClientRoute = pathname.startsWith("/client");

  if (!token && (isOwnerRoute || isTrainerRoute || isClientRoute)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL(getDashboardByRole(role), req.url));
  }

  if (token && isOwnerRoute && role !== "Owner") {
    return NextResponse.redirect(new URL(getDashboardByRole(role), req.url));
  }

  if (token && isTrainerRoute && role !== "Trainer") {
    return NextResponse.redirect(new URL(getDashboardByRole(role), req.url));
  }

  if (token && isClientRoute && role !== "Client") {
    return NextResponse.redirect(new URL(getDashboardByRole(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/owner/:path*", "/trainer/:path*", "/client/:path*"],
};
