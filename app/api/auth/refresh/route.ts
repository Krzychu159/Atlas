import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { expireAuthCookies, setSessionCookies, setTokenCookies } from "@/app/lib/server/auth-cookies";
import { hasSameOrigin } from "@/app/lib/server/request-origin";
import { verifyBackendSession } from "@/app/lib/server/session";

function failure(status: number) {
  const response = NextResponse.json({ message: "Nie udało się odświeżyć sesji. Spróbuj zalogować się ponownie." }, { status });
  response.headers.set("Cache-Control", "no-store");
  if (status === 401 || status === 403) expireAuthCookies(response);
  return response;
}

export async function POST(req: Request) {
  if (!hasSameOrigin(req)) {
    const response = NextResponse.json({ message: "Odśwież stronę i spróbuj ponownie." }, { status: 403 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  const backendUrl = process.env.BACKEND_API_URL;
  if (!backendUrl) return failure(503);
  const refreshToken = (await cookies()).get("refreshToken")?.value;
  if (!refreshToken) return failure(401);

  try {
    const response = await fetch(`${backendUrl}/api/Auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return failure(response.status);
    const data = await response.json();
    if (typeof data?.token !== "string" || !data.token || typeof data?.refreshToken !== "string" || !data.refreshToken) return failure(502);

    const session = await verifyBackendSession(data.token, data);
    if (session.state === "unavailable") {
      // The backend has already rotated the pair. Preserve both new tokens
      // for the next verification without granting an unverified identity.
      const result = failure(503);
      setTokenCookies(result, data);
      return result;
    }
    if (session.state !== "authenticated") return failure(session.state === "forbidden" ? 403 : 401);

    const { id: userId, role, roles, organizationId } = session.user;
    const result = NextResponse.json({ ok: true, user: { userId, role, roles, ...(organizationId !== undefined ? { organizationId } : {}) } });
    result.headers.set("Cache-Control", "no-store");
    setSessionCookies(result, data, session.user);
    return result;
  } catch {
    return failure(503);
  }
}
