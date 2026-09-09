// Paleta UI aplikacji, nie oficjalne HEX-y Outlooka. Edytuj bg, border i text tutaj.
export type OutlookColor = { bg: string; border: string; text: string };

export const OUTLOOK_COLORS = {
  preset0: { bg: "#fde2e2", border: "#dc2626", text: "#991b1b" },
  preset1: { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
  preset2: { bg: "#ffedd5", border: "#b45309", text: "#78350f" },
  preset3: { bg: "#fef9c3", border: "#eab308", text: "#854d0e" },
  preset4: { bg: "#dcfce7", border: "#22c55e", text: "#166534" },
  preset5: { bg: "#ccfbf1", border: "#14b8a6", text: "#115e59" },
  preset6: { bg: "#ecfccb", border: "#65a30d", text: "#365314" },
  preset7: { bg: "#dbeafe", border: "#2563eb", text: "#1e3a8a" },
  preset8: { bg: "#ede9fe", border: "#7c3aed", text: "#4c1d95" },
  preset9: { bg: "#fce7f3", border: "#db2777", text: "#831843" },
  preset10: { bg: "#f1f5f9", border: "#64748b", text: "#334155" },
  preset11: { bg: "#e4e4e7", border: "#71717a", text: "#3f3f46" },
  preset12: { bg: "#e5e7eb", border: "#6b7280", text: "#374151" },
  preset13: { bg: "#d4d4d8", border: "#52525b", text: "#27272a" },
  preset14: { bg: "#cbd5e1", border: "#334155", text: "#0f172a" },
  preset15: { bg: "#fecaca", border: "#991b1b", text: "#7f1d1d" },
  preset16: { bg: "#fed7aa", border: "#c2410c", text: "#7c2d12" },
  preset17: { bg: "#fde68a", border: "#92400e", text: "#78350f" },
  preset18: { bg: "#fef08a", border: "#a16207", text: "#713f12" },
  preset19: { bg: "#bbf7d0", border: "#15803d", text: "#14532d" },
  preset20: { bg: "#99f6e4", border: "#0f766e", text: "#134e4a" },
  preset21: { bg: "#d9f99d", border: "#4d7c0f", text: "#365314" },
  preset22: { bg: "#bfdbfe", border: "#1d4ed8", text: "#1e3a8a" },
  preset23: { bg: "#ddd6fe", border: "#6d28d9", text: "#4c1d95" },
  preset24: { bg: "#fbcfe8", border: "#be185d", text: "#831843" },
} satisfies Record<string, OutlookColor>;

export function getOutlookColor(key?: string | null): OutlookColor {
  return key && Object.hasOwn(OUTLOOK_COLORS, key)
    ? OUTLOOK_COLORS[key as keyof typeof OUTLOOK_COLORS]
    : OUTLOOK_COLORS.preset7;
}

export type OutlookSessionColors = {
  primaryOutlookCategory?: string | null;
  primaryOutlookCategoryColor?: string | null;
  outlookCategoryColors?: { name: string; color: string | null }[] | null;
};

export function getSessionOutlookColor(session: OutlookSessionColors) {
  return getOutlookColor(
    session.primaryOutlookCategoryColor ??
      session.outlookCategoryColors?.find((category) => category.name === session.primaryOutlookCategory)?.color ??
      "preset7",
  );
}
