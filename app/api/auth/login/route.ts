import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_API_URL;

    if (!backendUrl) {
      return NextResponse.json(
        { message: "Missing BACKEND_API_URL in .env.local" },
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
        { message: data?.message || "Login failed" },
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

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    res.cookies.set("accessToken", data.token, cookieOptions);
    res.cookies.set("refreshToken", data.refreshToken, cookieOptions);
    res.cookies.set("role", role, cookieOptions);
    res.cookies.set("userId", String(data.userId), cookieOptions);

    return res;
  } catch (error) {
    console.error("AUTH_LOGIN_ROUTE_ERROR", error);

    return NextResponse.json(
      { message: "Internal server error in /api/auth/login" },
      { status: 500 },
    );
  }
}
