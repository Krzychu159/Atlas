import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("accessToken")?.value;
  const role = cookieStore.get("role")?.value;
  const userId = cookieStore.get("userId")?.value;

  if (!accessToken || !role || !userId) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId,
      role,
    },
  });
}
