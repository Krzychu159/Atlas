import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyBackendSession } from "@/app/lib/server/session";
import { expireAuthCookies } from "@/app/lib/server/auth-cookies";

export async function GET() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("accessToken")?.value;
  if (!accessToken) {
    const response = NextResponse.json(
      { authenticated: false, user: null },
      { status: 401 },
    );
    response.headers.set("Cache-Control", "no-store");

    return response;
  }

  const session = await verifyBackendSession(accessToken);
  if (session.state !== "authenticated") {
    const status = session.state === "unavailable" ? 503 : session.state === "forbidden" ? 403 : 401;
    const response = NextResponse.json({ authenticated: false, user: null }, { status });
    response.headers.set("Cache-Control", "no-store");
    if (status === 401 || status === 403) expireAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({
    authenticated: true,
    user: {
      userId: session.user.id,
      role: session.user.role,
      roles: session.user.roles,
    },
  });
  response.headers.set("Cache-Control", "no-store");

  return response;
}
