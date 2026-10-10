import { backendGet, backendPatch, invalidateBackendGets } from "../backend";

import { normalizeUser, type CurrentUser } from "./user";
export type { CurrentUser } from "./user";

export const CURRENT_USER_CHANGED_EVENT = "atlas:current-user-changed";

export type UpdateCurrentUserProfilePayload = {
  firstName: string;
  lastName: string;
  email: string;
};

export async function getCurrentUser(signal?: AbortSignal) {
  return normalizeUser(await backendGet<unknown>("Auth/me", undefined, signal));
}

export async function updateCurrentUserProfile(
  payload: UpdateCurrentUserProfilePayload,
) {
  const updated = await backendPatch<unknown>("Auth/me", payload);
  invalidateBackendGets(["Auth/me"]);
  let user: CurrentUser;
  try { user = normalizeUser(updated); }
  catch { user = await getCurrentUser(); }
  notifyCurrentUserChanged(user);
  return user;
}

export function notifyCurrentUserChanged(user?: CurrentUser) {
  if (typeof window !== "undefined") {
    if (!user) invalidateBackendGets(["Auth/me"]);
    window.dispatchEvent(new CustomEvent(CURRENT_USER_CHANGED_EVENT, { detail: user }));
  }
}
