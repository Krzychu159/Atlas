import { NextResponse } from "next/server";
import { getAuthCookieOptions } from "@/app/lib/server/auth-cookies";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_API_URL;

    if (!backendUrl) {
      return NextResponse.json(
        { message: "Brakuje konfiguracji BACKEND_API_URL." },
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
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || "Nie udało się zalogować." },
        { status: response.status },
      );
    }

    const role = String(data.role || "").toLowerCase();

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
