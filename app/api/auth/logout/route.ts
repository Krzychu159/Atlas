import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set("accessToken", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  res.cookies.set("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  res.cookies.set("role", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  res.cookies.set("userId", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return res;
}
