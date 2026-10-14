import type { CurrentUser } from "./auth/user";

export type OrganizationTheme = "atlas" | "bsworkout";

const BS_WORKOUT_ORGANIZATION_ID = "b5100000-0000-4000-8000-000000000002";

// Call with the server-verified profile, never with URL or browser storage data.
export function getOrganizationTheme(user: CurrentUser): OrganizationTheme {
  return user.role !== "super-admin" && !user.roles.includes("super-admin") &&
    user.organizationId === BS_WORKOUT_ORGANIZATION_ID ? "bsworkout" : "atlas";
}
