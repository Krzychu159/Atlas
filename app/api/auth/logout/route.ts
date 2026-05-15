import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true, message: "Logged out" });
  const authCookieNames = [
    "accessToken",
    "refreshToken",
    "role",
    "userId",
    "refresh_token",
    "user_role",
  ];

  const expiredCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    expires: new Date(0),
    path: "/",
  };

  authCookieNames.forEach((name) => {
    res.cookies.set(name, "", expiredCookie);
  });

  return res;
}
