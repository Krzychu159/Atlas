// Polish plural forms: 1 trening, 2–4 (except 12–14) treningi, otherwise treningów.
export function polishPlural(count: number, one: string, few: string, many: string) {
  if (count === 1) return one;
  const last = Math.abs(count) % 10;
  const lastTwo = Math.abs(count) % 100;
  return Number.isInteger(count) && last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}

export function countLabel(count: number, one: string, few: string, many: string) {
  return `${count.toLocaleString("pl-PL")} ${polishPlural(count, one, few, many)}`;
}
