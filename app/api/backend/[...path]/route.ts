import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { expireAuthCookies } from "@/app/lib/server/auth-cookies";
import { hasSameOrigin } from "@/app/lib/server/request-origin";

const BACKEND_URL = process.env.BACKEND_API_URL;

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function handler(req: NextRequest, context: RouteContext) {
  if (!["GET", "HEAD"].includes(req.method)) {
    if (!hasSameOrigin(req)) {
      return jsonError("Nie można potwierdzić tej czynności. Odśwież stronę i spróbuj ponownie.", 403);
    }
  }
  if (!BACKEND_URL) {
    return jsonError("Usługa jest chwilowo niedostępna. Spróbuj ponownie później.", 500);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const { path } = await context.params;
  if (!path.length || path.some(segment => !segment || segment === "." || segment === ".." || /[\\/\u0000-\u001f]/.test(segment))) {
    return jsonError("Nie znaleziono tych danych.", 400);
  }
  const backendPath = path.join("/");
  const publicRead = req.method === "GET" &&
    /^public\/group-classes(?:\/(?:locations|legal-requirements|packages|\d+|by-slug\/[^/]+|packages\/by-slug\/[^/]+))?$/.test(backendPath);

  if (!token && !publicRead) {
    const response = jsonError("Sesja wygasła.", 401);

    expireAuthCookies(response);

    return response;
  }

  const url = new URL(`${BACKEND_URL}/api/${path.map(segment => encodeURIComponent(segment)).join("/")}`);

  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  let body: ArrayBuffer | undefined;
  try {
    body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  } catch {
    return jsonError("Nie udało się odczytać przesłanych danych. Spróbuj ponownie.", 400);
  }

  let response: Response;
  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(60_000)]);

  try {
    response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        Accept: req.headers.get("accept") || "application/json",
        ...(body?.byteLength
          ? {
              "Content-Type":
                req.headers.get("content-type") || "application/json",
            }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body?.byteLength ? body : undefined,
      cache: "no-store",
      redirect: "error",
      signal,
    });
  } catch {
    return jsonError("Nie udało się połączyć ze studiem. Spróbuj ponownie za chwilę.", 502);
  }

  // Public listings remain available when a previously valid session expires.
  const expiredPublicSession = publicRead && response.status === 401 && Boolean(token);
  if (expiredPublicSession) {
    try {
      response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", redirect: "error", signal });
    } catch {
      return jsonError("Nie udało się połączyć ze studiem. Spróbuj ponownie za chwilę.", 502);
    }
  }

  if (response.status === 401) {
    const nextResponse = jsonError("Sesja wygasła. Zaloguj się ponownie.", 401);
    expireAuthCookies(nextResponse);
    return nextResponse;
  }

  if ([204, 205, 304].includes(response.status)) {
    const nextResponse = new NextResponse(null, {
      status: response.status,
    });

    nextResponse.headers.set("Cache-Control", "no-store");

    if (response.status === 401) {
      expireAuthCookies(nextResponse);
    }

    return nextResponse;
  }

  let bodyBytes: ArrayBuffer;
  try { bodyBytes = await response.arrayBuffer(); }
  catch { return jsonError("Nie udało się pobrać danych. Spróbuj ponownie za chwilę.", 502); }

  const nextResponse = new NextResponse(bodyBytes, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });

  const contentDisposition = response.headers.get("content-disposition");

  if (contentDisposition) {
    nextResponse.headers.set("Content-Disposition", contentDisposition);
  }

  if (response.status === 401 || expiredPublicSession) {
    expireAuthCookies(nextResponse);
  }

  return nextResponse;
}

function jsonError(message: string, status: number) {
  const response = NextResponse.json({ message }, { status });
  response.headers.set("Cache-Control", "no-store");

  return response;
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
