import { NextResponse } from "next/server";
import { getAuthCookieOptions } from "@/app/lib/server/auth-cookies";

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_API_URL;
  if (!backendUrl) return NextResponse.json({ message: "Brakuje konfiguracji backendu." }, { status: 500 });
  try {
    const body = await request.json();
    const response = await fetch(`${backendUrl}/api/public/group-classes/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email: body.email, password: body.password, firstName: body.firstName,
        lastName: body.lastName, phoneNumber: body.phoneNumber, locationId: body.locationId }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) return NextResponse.json({ message: typeof data?.message === "string" ? data.message : "Nie udało się utworzyć konta. Sprawdź dane i spróbuj ponownie." }, { status: response.status });
    if (!data?.token || !data.refreshToken || !data.userId || String(data.role).toLowerCase() !== "client") {
      return NextResponse.json({ message: "Backend zwrócił niekompletne dane logowania." }, { status: 502 });
    }
    const result = NextResponse.json({ ok: true, user: { userId: data.userId, email: data.email, role: "client" } });
    result.headers.set("Cache-Control", "no-store");
    const options = getAuthCookieOptions();
    result.cookies.set("accessToken", data.token, options);
    result.cookies.set("refreshToken", data.refreshToken, options);
    result.cookies.set("userId", String(data.userId), options);
    result.cookies.set("role", "client", options);
    return result;
  } catch {
    return NextResponse.json({ message: "Nie udało się obsłużyć rejestracji. Spróbuj ponownie." }, { status: 502 });
  }
}
