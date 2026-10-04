import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const backendUrl = process.env.BACKEND_API_URL;

  if (!backendUrl) {
    return jsonError("Usługa jest chwilowo niedostępna. Spróbuj ponownie później.", 500);
  }

  const token = new URL(request.url).searchParams.get("token")?.trim();

  if (!token) {
    return jsonError("Link zaproszenia jest niepełny. Otwórz pełny link z wiadomości e-mail.", 400);
  }

  try {
    const url = new URL(`${backendUrl}/api/invitations/validate`);
    url.searchParams.set("token", token);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await response.text();

    if (!text) {
      return jsonError(
        response.ok
          ? "Nie udało się odczytać zaproszenia. Otwórz ponownie link z wiadomości e-mail."
          : "Nie udało się zweryfikować zaproszenia.",
        response.ok ? 502 : response.status,
      );
    }

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("INVITATION_VALIDATE_PROXY_ERROR", error);

    return jsonError("Nie udało się połączyć z serwerem.", 502);
  }
}

function jsonError(message: string, status: number) {
  const response = NextResponse.json({ message }, { status });
  response.headers.set("Cache-Control", "no-store");

  return response;
}
