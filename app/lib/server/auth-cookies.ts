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

export function setSessionCookies(
  response: NextResponse,
  tokens: { token: string; refreshToken: string },
  user: { role: string; id: string },
) {
  const options = getAuthCookieOptions();
  setTokenCookies(response, tokens);
  response.cookies.set("role", user.role, options);
  response.cookies.set("userId", user.id, options);
}

export function setTokenCookies(response: NextResponse, tokens: { token: string; refreshToken: string }) {
  const options = getAuthCookieOptions();
  response.cookies.set("accessToken", tokens.token, options);
  response.cookies.set("refreshToken", tokens.refreshToken, options);
}
