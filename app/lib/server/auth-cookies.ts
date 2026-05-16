import type { NextResponse } from "next/server";

export const authCookieNames = [
  "accessToken",
  "refreshToken",
  "role",
  "userId",
  "refresh_token",
  "user_role",
];

export function getAuthCookieOptions(overrides: { expires?: Date } = {}) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...overrides,
  };
}

export function expireAuthCookies(response: NextResponse) {
  const expiredCookie = getAuthCookieOptions({
    expires: new Date(0),
  });

  authCookieNames.forEach((name) => {
    response.cookies.set(name, "", expiredCookie);
  });
}
