import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  const cookiesToClear = [
    "auth_token",
    "refresh_token",
    "user_role",
    "user_email",
    "user_id",
  ];

  for (const cookieName of cookiesToClear) {
    cookieStore.set(cookieName, "", {
      httpOnly: cookieName === "auth_token" || cookieName === "refresh_token",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return NextResponse.json({ success: true });
}
