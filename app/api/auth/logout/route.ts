import { NextResponse } from "next/server";
import { expireAuthCookies } from "@/app/lib/server/auth-cookies";
import { hasSameOrigin } from "@/app/lib/server/request-origin";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ message: "Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  const res = NextResponse.json({ ok: true, message: "Wylogowano." });
  res.headers.set("Cache-Control", "no-store");
  expireAuthCookies(res);

  return res;
}
