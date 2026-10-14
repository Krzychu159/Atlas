import { authCookieNames } from "@/app/lib/server/auth-cookies";

const reservedCookieNames = new Set(authCookieNames.map((name) => name.toLowerCase()));

function cookieName(pair: string) {
  const separator = pair.indexOf("=");
  return (separator === -1 ? "" : pair.slice(0, separator)).trim();
}

function isReserved(name: string) {
  return reservedCookieNames.has(name.toLowerCase());
}

function cookieAttributes(setCookie: string) {
  return setCookie
    .split(";")
    .slice(1)
    .map((attribute) => {
      const [key, ...value] = attribute.split("=");
      return { key: key.trim().toLowerCase(), value: value.join("=").trim() };
    });
}

/**
 * Backend cookies are re-issued as host-only cookies of the frontend domain.
 * Session cookies managed by ATLAS and cookies scoped to another domain are never relayed.
 */
export function isRelayableSetCookie(setCookie: string) {
  const name = cookieName(setCookie.split(";")[0]);
  if (!name || isReserved(name)) return false;

  const attributes = cookieAttributes(setCookie);
  if (attributes.some((attribute) => attribute.key === "domain")) return false;

  const secure = attributes.some((attribute) => attribute.key === "secure");
  const rootPath = attributes.some((attribute) => attribute.key === "path" && attribute.value === "/");
  if (name.startsWith("__Host-")) return secure && rootPath;
  if (name.startsWith("__Secure-")) return secure;

  return true;
}

export function relayBackendSetCookies(source: Headers, target: Headers) {
  for (const setCookie of source.getSetCookie()) {
    if (isRelayableSetCookie(setCookie)) {
      target.append("Set-Cookie", setCookie);
    } else {
      console.warn("BACKEND_SET_COOKIE_SKIPPED", cookieName(setCookie.split(";")[0]) || "(unnamed)");
    }
  }
}

/** Browser cookies for the backend without the ATLAS session tokens. */
export function backendCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;

  const forwarded = cookieHeader
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => {
      const name = cookieName(pair);
      return name && !isReserved(name);
    });

  return forwarded.length ? forwarded.join("; ") : null;
}
