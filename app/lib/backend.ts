let authRedirectStarted = false;

export async function backendFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options?.headers || {}),
    },
  });

  const text = await response.text();

  if (response.status === 401) {
    handleUnauthorizedSession();

    throw new Error("Sesja wygasła. Zaloguj się ponownie.");
  }

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
    const message = getBackendErrorMessage(data);

    throw new Error(message);
  }

  return data as T;
}

function handleUnauthorizedSession() {
  if (typeof window === "undefined" || authRedirectStarted) {
    return;
  }

  authRedirectStarted = true;

  const nextPath = `${window.location.pathname}${window.location.search}`;
  const loginPath = `/login?reason=session-expired&next=${encodeURIComponent(
    nextPath,
  )}`;

  fetch("/api/auth/logout", {
    method: "POST",
    cache: "no-store",
  }).finally(() => {
    window.location.assign(loginPath);
  });
}

function getBackendErrorMessage(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return "Backend request failed";
  }

  if ("message" in data && data.message) {
    return String(data.message);
  }

  if ("detail" in data && data.detail) {
    return String(data.detail);
  }

  if ("title" in data && data.title) {
    const title = String(data.title);

    if ("errors" in data && typeof data.errors === "object" && data.errors) {
      const errors = Object.entries(data.errors as Record<string, unknown>)
        .flatMap(([field, messages]) => {
          if (Array.isArray(messages)) {
            return messages.map((message) => `${field}: ${String(message)}`);
          }

          return [`${field}: ${String(messages)}`];
        })
        .join(" ");

      return errors ? `${title}: ${errors}` : title;
    }

    return title;
  }

  return "Backend request failed";
}
