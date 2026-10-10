export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || /[\u0000-\u0020\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function safeMicrosoftAuthUrl(value: unknown): string | null {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  // OAuth must leave the application only for Microsoft's authorization host.
  return url.protocol === "https:" && url.hostname === "login.microsoftonline.com" && (!url.port || url.port === "443")
    ? safe : null;
}
