// Kolory kategorii z ciemnego motywu Outlooka. Klucze (preset0–preset24) to kody Microsoft
// zapisywane w backendzie — nie zmieniaj ich. Kolejność = kolejność w wyborze koloru w Outlooku.
export type OutlookColor = { name: string; bg: string; border: string; text: string };

const color = (name: string, hex: string): OutlookColor => ({ name, bg: hex, border: hex, text: "#ffffff" });

export const OUTLOOK_COLORS = {
  preset15: color("Ciemnoczerwony", "#420610"),
  preset0: color("Czerwony", "#6E0811"),
  preset1: color("Pomarańczowy", "#7A2101"),
  preset16: color("Ciemnopomarańczowy", "#5E2405"),
  preset2: color("Brązowy", "#4D2A00"),
  preset3: color("Żółty", "#463100"),
  preset18: color("Ciemnożółty", "#3A2F00"),
  preset17: color("Ciemnobrązowy", "#2B1710"),
  preset6: color("Oliwkowy", "#22330B"),
  preset21: color("Ciemnooliwkowy", "#162702"),
  preset4: color("Zielony", "#063004"),
  preset19: color("Ciemnozielony", "#032003"),
  preset5: color("Morski", "#00373A"),
  preset20: color("Ciemnomorski", "#003939"),
  preset10: color("Stalowy", "#00333F"),
  preset7: color("Niebieski", "#004659"),
  preset22: color("Granatowy", "#002039"),
  preset8: color("Fioletowy", "#3F3682"),
  preset23: color("Ciemnofioletowy", "#240F3C"),
  preset9: color("Żurawinowy", "#80215D"),
  preset24: color("Ciemnożurawinowy", "#43002B"),
  preset12: color("Szary", "#444241"),
  preset13: color("Ciemnoszary", "#343231"),
  preset11: color("Ciemnostalowy", "#282D2E"),
  preset14: color("Czarny", "#000000"),
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
