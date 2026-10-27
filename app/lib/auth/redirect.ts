import type { SessionRole } from "./user";

const loginLandingPaths: Partial<Record<SessionRole, string>> = {
  owner: "/owner/schedule",
};

export function getLoginRedirectPath(role: SessionRole | undefined, next: string | null) {
  if (!role) return "/login";
  const home = `/${role}`;
  const landing = loginLandingPaths[role] ?? home;
  // Only restore links within the verified role's own panel.
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f]/.test(next)) return landing;
  const pathname = next.split(/[?#]/)[0];
  if (pathname !== home && !pathname.startsWith(`${home}/`)) return landing;
  // Reject URL normalization tricks, including backslashes and dot segments.
  const parsed = new URL(next, "https://atlas.local");
  if (parsed.origin !== "https://atlas.local" || (parsed.pathname !== home && !parsed.pathname.startsWith(`${home}/`))) return landing;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
