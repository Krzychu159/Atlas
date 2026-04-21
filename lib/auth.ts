import { cookies } from "next/headers";

export async function getSession() {
  const cookieStore = await cookies();

  return {
    token: cookieStore.get("auth_token")?.value ?? null,
    refreshToken: cookieStore.get("refresh_token")?.value ?? null,
    role: cookieStore.get("user_role")?.value ?? null,
    email: cookieStore.get("user_email")?.value ?? null,
    userId: cookieStore.get("user_id")?.value ?? null,
  };
}
