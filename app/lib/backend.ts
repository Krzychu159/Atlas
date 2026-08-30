type ApiQueryValue = string | number | boolean | null | undefined;
type ApiQuery = Record<string, ApiQueryValue | ApiQueryValue[]>;

type BackendFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  json?: unknown;
  query?: ApiQuery;
  skipUnauthorizedRedirect?: boolean;
};

type ApiErrorOptions = {
  status: number;
  payload?: unknown;
  path?: string;
};

export type BackendDownload = {
  blob: Blob;
  fileName: string | null;
};

let authRedirectStarted = false;

export class ApiError extends Error {
  status: number;
  payload?: unknown;
  path?: string;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.payload = options.payload;
    this.path = options.path;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

export async function backendFetch<T>(
  path: string,
  options: BackendFetchOptions = {},
): Promise<T> {
  const { json, query, skipUnauthorizedRedirect, ...fetchOptions } = options;
  const body = json !== undefined ? JSON.stringify(json) : fetchOptions.body;
  const headers = new Headers(fetchOptions.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (json !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildBackendUrl(path, query), {
    cache: "no-store",
    ...fetchOptions,
    body,
    headers,
  });
  const payload = await readResponsePayload(response);

  if (response.status === 401) {
    if (!skipUnauthorizedRedirect) {
      handleUnauthorizedSession();
    }

    throw new ApiError("Sesja wygasła. Zaloguj się ponownie.", {
      status: response.status,
      payload,
      path,
    });
  }

  if (response.status === 403) {
    throw new ApiError("Nie masz uprawnień do tej operacji.", {
      status: response.status,
      payload,
      path,
    });
  }

  if (!response.ok) {
    throw new ApiError(getBackendErrorMessage(payload), {
      status: response.status,
      payload,
      path,
    });
  }

  return payload as T;
}

export function backendGet<T>(path: string, query?: ApiQuery) {
  return backendFetch<T>(path, { method: "GET", query });
}

export function backendPost<T>(path: string, json?: unknown, query?: ApiQuery) {
  return backendFetch<T>(path, { method: "POST", json, query });
}

export function backendPut<T>(path: string, json?: unknown, query?: ApiQuery) {
  return backendFetch<T>(path, { method: "PUT", json, query });
}

export function backendPatch<T>(path: string, json?: unknown, query?: ApiQuery) {
  return backendFetch<T>(path, { method: "PATCH", json, query });
}

export function backendDelete<T>(path: string, query?: ApiQuery) {
  return backendFetch<T>(path, { method: "DELETE", query });
}

export async function backendDownload(
  path: string,
  query?: ApiQuery,
): Promise<BackendDownload> {
  const response = await fetch(buildBackendUrl(path, query), {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept:
        "application/pdf, image/*, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword, application/octet-stream",
    },
  });

  if (response.status === 401) {
    handleUnauthorizedSession();
  }

  if (!response.ok) {
    const payload = await readResponsePayload(response);

    throw new ApiError(getBackendErrorMessage(payload), {
      status: response.status,
      payload,
      path,
    });
  }

  return {
    blob: await response.blob(),
    fileName: getDownloadFileName(response.headers.get("content-disposition")),
  };
}

export function getErrorMessage(
  error: unknown,
  fallback = "Wystąpił nieoczekiwany błąd.",
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function isForbiddenError(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

export function isNotFoundError(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

export function isNotFoundLikeError(error: unknown) {
  if (isNotFoundError(error)) return true;

  if (!(error instanceof Error)) return false;

  const message = error.message.trim().toLowerCase();

  return (
    message === "not found" ||
    message === "client profile not found." ||
    message === "client profile not found" ||
    message.includes("client profile not found")
  );
}

function buildBackendUrl(path: string, query?: ApiQuery) {
  const [rawPath, rawSearch = ""] = path.replace(/^\/+/, "").split("?");
  const searchParams = new URLSearchParams(rawSearch);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      appendQueryValue(searchParams, key, value);
    });
  }

  const search = searchParams.toString();

  return `/api/backend/${rawPath}${search ? `?${search}` : ""}`;
}

function appendQueryValue(
  searchParams: URLSearchParams,
  key: string,
  value: ApiQueryValue | ApiQueryValue[],
) {
  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryValue(searchParams, key, item));
    return;
  }

  if (value === null || value === undefined || value === "") {
    return;
  }

  searchParams.set(key, String(value));
}

async function readResponsePayload(response: Response) {
  if ([204, 205, 304].includes(response.status)) {
    return null;
  }

  const text = await response.text();

  if (!text) return null;

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json") && !looksLikeJson(text)) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch {
    if (!contentType.includes("application/json")) {
      return text;
    }

    throw new ApiError(
      `Backend zwrócił niepoprawną odpowiedź JSON. Status: ${response.status}.`,
      {
        status: response.status,
        payload: text.slice(0, 500),
      },
    );
  }
}

function looksLikeJson(text: string) {
  const trimmed = text.trim();

  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

function getDownloadFileName(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].replace(/^"|"$/g, ""));
    } catch {
      return encodedMatch[1].replace(/^"|"$/g, "");
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

  return plainMatch?.[1]?.trim() || null;
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
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (typeof data !== "object" || data === null) {
    return "Nie udało się wykonać operacji.";
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

  return "Nie udało się wykonać operacji.";
}
