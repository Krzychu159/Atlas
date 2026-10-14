"use client";

import { createContext, useContext, type ComponentPropsWithoutRef } from "react";
import type { OrganizationTheme } from "@/app/lib/organization-theme";

const OrganizationThemeContext = createContext<OrganizationTheme>("atlas");

export function OrganizationThemeScope({ theme, children, ...props }: ComponentPropsWithoutRef<"div"> & { theme: OrganizationTheme }) {
  return (
    <OrganizationThemeContext.Provider value={theme}>
      <div {...props} data-atlas-theme={theme}>{children}</div>
    </OrganizationThemeContext.Provider>
  );
}

export function useOrganizationTheme() {
  return useContext(OrganizationThemeContext);
}

// React context crosses a portal; CSS inheritance does not.
export function OrganizationPortalScope({ children, ...props }: ComponentPropsWithoutRef<"div">) {
  const theme = useOrganizationTheme();
  return <div {...props} data-atlas-theme={theme}>{children}</div>;
}
