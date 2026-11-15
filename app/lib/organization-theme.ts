import type { Metadata } from "next";
import type { CurrentUser } from "./auth/user";

export type OrganizationTheme = "atlas" | "bsworkout";

export function getOrganizationIcons(theme: OrganizationTheme): NonNullable<Metadata["icons"]> {
  return {
    icon: [
      { url: `/branding/${theme}-icon.svg`, type: "image/svg+xml" },
      { url: `/branding/${theme}-icon-32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: { url: `/branding/${theme}-apple-icon.png`, sizes: "180x180" },
  };
}

const BS_WORKOUT_ORGANIZATION_ID = "b5100000-0000-4000-8000-000000000002";

// Call with the server-verified profile, never with URL or browser storage data.
export function getOrganizationTheme(user: CurrentUser): OrganizationTheme {
  return user.role !== "super-admin" && !user.roles.includes("super-admin") &&
    user.organizationId === BS_WORKOUT_ORGANIZATION_ID ? "bsworkout" : "atlas";
}
