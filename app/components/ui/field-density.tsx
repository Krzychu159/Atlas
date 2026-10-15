"use client";

import { createContext, useContext, type ReactNode } from "react";

// "compact" is used inside modals: labels always sit above controls and controls are shorter on desktop.
export type FieldDensity = "default" | "compact";

const FieldDensityContext = createContext<FieldDensity>("default");

export function FieldDensityProvider({ value, children }: { value: FieldDensity; children: ReactNode }) {
  return <FieldDensityContext.Provider value={value}>{children}</FieldDensityContext.Provider>;
}

export function useFieldDensity() {
  return useContext(FieldDensityContext);
}

export const compactFieldLabelClassName = "text-[11px] font-semibold uppercase tracking-wider text-on-surface-muted";
export const compactControlHeightClassName = "h-11 md:h-10";
