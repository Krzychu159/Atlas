import { NextRequest, NextResponse } from "next/server";
import { backendCookieHeader, relayBackendSetCookies } from "@/app/lib/server/backend-cookies";
import { escapeHtml, readOutlookCallbackError, type OutlookCallbackError } from "@/app/lib/calendar/outlook-callback";

const BACKEND_URL = process.env.BACKEND_API_URL;

type CallbackOutcome = "connected" | "cancelled" | "expired" | "unknown" | "unavailable";

const outcomes: Record<CallbackOutcome, { status: number; title: string; description: string }> = {
  connected: {
    status: 200,
    title: "Konto Microsoft jest połączone",
    description: "Możesz zamknąć to okno i wrócić do ATLAS. Status połączenia odświeży się automatycznie.",
  },
  cancelled: {
    status: 400,
    title: "Połączenie z Microsoft zostało przerwane",
    description: "Konto nie zostało połączone. Zamknij to okno i spróbuj ponownie w ustawieniach ATLAS.",
  },
  expired: {
    status: 400,
    title: "Nie udało się potwierdzić połączenia",
    description: "Łączenie trwało zbyt długo albo zostało rozpoczęte w innej przeglądarce. Zamknij to okno i spróbuj ponownie w ustawieniach ATLAS.",
  },
  unknown: {
    status: 200,
    title: "Łączenie z Microsoft zostało zakończone",
    description: "Wróć do ATLAS, aby sprawdzić status połączenia w ustawieniach.",
  },
  unavailable: {
    status: 502,
    title: "Nie udało się połączyć konta Microsoft",
    description: "Spróbuj ponownie za chwilę z ustawień ATLAS.",
  },
};

// The OAuth callback is reached by a top-level redirect from Microsoft, so it must not require a CRM session.
// State, the correlation cookie and PKCE are validated exclusively by the backend.
export async function GET(req: NextRequest) {
  const providerError = req.nextUrl.searchParams.has("error");

  if (!BACKEND_URL) {
    return outcomePage("unavailable");
  }

  const cookie = backendCookieHeader(req.headers.get("cookie"));
  let response: Response;

  try {
    response = await fetch(`${BACKEND_URL}/api/outlook/callback${req.nextUrl.search}`, {
      method: "GET",
      headers: {
        Accept: "application/json, text/html;q=0.9",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(30_000)]),
    });
  } catch {
    return outcomePage(providerError ? "cancelled" : "unavailable");
  }

  const redirectTarget = providerError ? null : frontendRedirect(response, req.nextUrl.origin);
  let nextResponse: NextResponse;
  const callbackError = redirectTarget || response.ok ? null : await readCallbackError(response);

  if (redirectTarget) {
    nextResponse = NextResponse.redirect(redirectTarget, 303);
    nextResponse.headers.set("Cache-Control", "no-store");
    nextResponse.headers.set("Referrer-Policy", "no-referrer");
  } else if (callbackError) {
    nextResponse = errorPage(callbackError, response.status >= 500 ? 502 : 400);
  } else {
    nextResponse = outcomePage(providerError
      ? "cancelled"
      : response.ok
        ? "connected"
        : response.status >= 300 && response.status < 400
          ? "unknown"
          : response.status < 500
            ? "expired"
            : "unavailable");
  }

  relayBackendSetCookies(response.headers, nextResponse.headers);

  return nextResponse;
}

// Only redirects back into ATLAS are followed; anything else would turn the callback into an open redirect.
function frontendRedirect(response: Response, frontendOrigin: string) {
  if (response.status < 300 || response.status >= 400) return null;

  const location = response.headers.get("location");
  if (!location) return null;

  try {
    const target = new URL(location, frontendOrigin);
    return target.origin === frontendOrigin ? target : null;
  } catch {
    return null;
  }
}

// The backend describes a failed connection as { code, message, microsoftCode }.
async function readCallbackError(response: Response) {
  if (!(response.headers.get("content-type") || "").includes("json")) return null;
  try {
    return readOutlookCallbackError(await response.json());
  } catch {
    return null;
  }
}

function errorPage(error: OutlookCallbackError, status: number) {
  const detail = error.microsoftCode ? `<small>Kod Microsoft: ${escapeHtml(error.microsoftCode)}</small>` : "";
  return htmlPage("Nie udało się połączyć konta Microsoft", escapeHtml(error.message), status, detail);
}

function outcomePage(outcome: CallbackOutcome) {
  const { status, title, description } = outcomes[outcome];
  return htmlPage(title, description, status);
}

function htmlPage(title: string, description: string, status: number, detail = "") {
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>ATLAS — ${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;box-sizing:border-box;background:#121416;color:#e2e2e5;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:440px;padding:32px;border-radius:16px;background:#1a1c1e}h1{margin:0 0 12px;font-size:20px;line-height:1.3}p{margin:0 0 24px;color:#c3c5d9;line-height:1.6;font-size:14px}small{display:block;margin:-12px 0 24px;color:#8d90a2;font-size:12px}a{display:inline-block;padding:10px 16px;border-radius:8px;background:#0052ff;color:#fff;text-decoration:none;font-weight:600;font-size:14px}a:focus-visible{outline:2px solid #b7c4ff;outline-offset:2px}</style></head><body><main><h1>${title}</h1><p>${description}</p>${detail}<a href="/">Wróć do ATLAS</a></main></body></html>`;

  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}
