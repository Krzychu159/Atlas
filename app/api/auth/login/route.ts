import { NextResponse } from "next/server";
import { getAuthCookieOptions } from "@/app/lib/server/auth-cookies";
import { hasSameOrigin } from "@/app/lib/server/request-origin";

export async function POST(req: Request) {
  if (!hasSameOrigin(req)) return NextResponse.json({ message: "Odśwież stronę i spróbuj ponownie." }, { status: 403 });
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_API_URL;

    if (!backendUrl) {
      return NextResponse.json(
        { message: "Usługa jest chwilowo niedostępna. Spróbuj ponownie później." },
        { status: 500 },
      );
    }

    const response = await fetch(`${backendUrl}/api/Auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Nie udało się zalogować." },
        { status: response.status },
      );
    }

    const role = String(data.role || "").toLowerCase();

    if (typeof data.token !== "string" || !data.token || typeof data.refreshToken !== "string" || !data.refreshToken || !data.userId || !["owner", "trainer", "client"].includes(role)) {
      return NextResponse.json({ message: "Nie udało się potwierdzić logowania. Spróbuj ponownie." }, { status: 502 });
    }

    const res = NextResponse.json({
      ok: true,
      user: {
        userId: data.userId,
        email: data.email,
        role,
      },
    });
    res.headers.set("Cache-Control", "no-store");

    const cookieOptions = getAuthCookieOptions();

    res.cookies.set("accessToken", data.token, cookieOptions);
    res.cookies.set("refreshToken", data.refreshToken, cookieOptions);
    res.cookies.set("role", role, cookieOptions);
    res.cookies.set("userId", String(data.userId), cookieOptions);

    return res;
  } catch (error) {
    console.error("AUTH_LOGIN_ROUTE_ERROR", error);

    return NextResponse.json(
      { message: "Nie udało się obsłużyć logowania." },
      { status: 500 },
    );
  }
}
