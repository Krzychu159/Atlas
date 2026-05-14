export async function backendFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/backend/${withOwnerLocation(path)}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options?.headers || {}),
    },
  });

  const text = await response.text();

  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Backend returned non-JSON response. Status: ${response.status}. Body: ${text.slice(
        0,
        120,
      )}`,
    );
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message?: string }).message)
        : "Backend request failed";

    throw new Error(message);
  }

  return data as T;
}

function withOwnerLocation(path: string) {
  const selectedLocationId = getSelectedOwnerLocationId();

  if (!selectedLocationId || !shouldAttachOwnerLocation(path)) return path;

  const [rawPath, rawQuery = ""] = path.split("?");
  const searchParams = new URLSearchParams(rawQuery);

  if (searchParams.has("locationId") || searchParams.has("LocationId")) {
    return path;
  }

  searchParams.set("locationId", selectedLocationId);

  return `${rawPath}?${searchParams.toString()}`;
}

function getSelectedOwnerLocationId() {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem("atlas-owner-location-id");

    return value && value !== "all" ? value : null;
  } catch {
    return null;
  }
}

function shouldAttachOwnerLocation(path: string) {
  const [rawPath] = path.split("?");
  const normalized = rawPath.toLowerCase();

  return [
    "dashboard",
    "clients",
    "trainers",
    "sessions",
    "billing",
    "payments",
    "packages",
    "reports",
    "alerts",
    "invitations",
  ].some((prefix) => normalized.startsWith(prefix));
}
