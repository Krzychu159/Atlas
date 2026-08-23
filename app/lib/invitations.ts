export type InvitationDetails = {
  email: string | null;
  role: string | null;
  locationId: number;
  locationName: string | null;
  trainerId: number | null;
  trainerName: string | null;
  expiresAt: string;
};

export type AcceptInvitationPayload = {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
};

export async function validateInvitation(
  token: string,
  signal?: AbortSignal,
) {
  return publicInvitationRequest<InvitationDetails>(
    `/api/invitations/validate?token=${encodeURIComponent(token)}`,
    { signal },
  );
}

export async function acceptInvitation(payload: AcceptInvitationPayload) {
  return publicInvitationRequest<unknown>("/api/invitations/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function publicInvitationRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  const text = await response.text();
  const payload = parsePayload(text);

  if (!response.ok) {
    throw new Error(getApiMessage(payload));
  }

  return payload as T;
}

function parsePayload(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getApiMessage(payload: unknown) {
  if (typeof payload === "string" && payload.trim()) return payload;

  if (typeof payload === "object" && payload !== null) {
    if ("message" in payload && payload.message) {
      return String(payload.message);
    }

    if ("detail" in payload && payload.detail) {
      return String(payload.detail);
    }
  }

  return "Nie udało się obsłużyć zaproszenia.";
}
