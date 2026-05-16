import { NextResponse } from "next/server";
import { expireAuthCookies } from "@/app/lib/server/auth-cookies";

export async function POST() {
  const res = NextResponse.json({ ok: true, message: "Wylogowano." });
  res.headers.set("Cache-Control", "no-store");
  expireAuthCookies(res);

  return res;
}
