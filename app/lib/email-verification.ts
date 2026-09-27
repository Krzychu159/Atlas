export async function verifyEmail(token: string) {
  return postEmailVerification("/api/auth/verify-email", { token });
}

export async function resendEmailVerification(email: string) {
  return postEmailVerification("/api/auth/resend-email-verification", {
    email,
  });
}

async function postEmailVerification(
  url: string,
  payload: Record<string, string>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "Nie udało się wykonać operacji.",
    );
  }

  return data;
}
