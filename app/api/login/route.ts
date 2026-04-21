import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest) {
  try {
    if (!API_URL) {
      return NextResponse.json(
        { message: "Brak konfiguracji NEXT_PUBLIC_API_URL." },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { email, password, rememberMe } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email i hasło są wymagane." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(`${API_URL}/api/Auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "*/*",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          message:
            data?.message ||
            data?.title ||
            "Nie udało się zalogować. Sprawdź dane logowania.",
        },
        { status: backendResponse.status },
      );
    }

    const token = data?.token;
    const refreshToken = data?.refreshToken;
    const role = data?.role;
    const userId = data?.userId;
    const userEmail = data?.email;

    if (!token || !refreshToken || !role) {
      return NextResponse.json(
        { message: "Backend zwrócił niepełne dane logowania." },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();

    const authMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    const refreshMaxAge = rememberMe ? 60 * 60 * 24 * 60 : 60 * 60 * 24 * 7;

    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authMaxAge,
    });

    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: refreshMaxAge,
    });

    cookieStore.set("user_role", role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authMaxAge,
    });

    cookieStore.set("user_email", userEmail ?? email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authMaxAge,
    });

    cookieStore.set("user_id", String(userId ?? ""), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authMaxAge,
    });

    return NextResponse.json({
      success: true,
      user: {
        userId,
        email: userEmail,
        role,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Wewnętrzny błąd serwera podczas logowania." },
      { status: 500 },
    );
  }
}
