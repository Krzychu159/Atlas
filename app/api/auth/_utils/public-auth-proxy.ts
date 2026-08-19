import { NextResponse } from "next/server";

type BodyMapper = (body: Record<string, unknown>) => Record<string, unknown>;

export async function proxyPublicAuthPost(
  req: Request,
  backendPath: string,
  mapBody?: BodyMapper,
) {
  try {
    const backendUrl = process.env.BACKEND_API_URL;

    if (!backendUrl) {
      return jsonError("Brakuje konfiguracji BACKEND_API_URL.", 500);
    }

    const body = await req.json().catch(() => ({}));
    const payload = mapBody ? mapBody(body) : body;
    const response = await fetch(`${backendUrl}/api/${backendPath}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const text = await response.text();

    if (!text) {
      return jsonResponse({ ok: response.ok }, response.status);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json") || looksLikeJson(text)) {
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    return jsonResponse({ message: text }, response.status);
  } catch (error) {
    console.error("PUBLIC_AUTH_PROXY_ERROR", error);

    return jsonError("Nie udało się obsłużyć żądania.", 500);
  }
}

function jsonError(message: string, status: number) {
  return jsonResponse({ message }, status);
}

function jsonResponse(payload: unknown, status: number) {
  const response = NextResponse.json(payload, { status });
  response.headers.set("Cache-Control", "no-store");

  return response;
}

function looksLikeJson(text: string) {
  const trimmed = text.trim();

  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}
