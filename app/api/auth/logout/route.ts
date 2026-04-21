import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true, message: "Logged out" });

  const expiredCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    expires: new Date(0),
    path: "/",
  };

  res.cookies.set("accessToken", "", expiredCookie);
  res.cookies.set("refreshToken", "", expiredCookie);
  res.cookies.set("role", "", expiredCookie);
  res.cookies.set("userId", "", expiredCookie);

  return res;
}
