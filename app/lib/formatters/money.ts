export function formatMoney(amount?: number | null, currency?: string | null) {
  const value = amount ?? 0;
  const normalizedCurrency = currency || "PLN";

  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat("pl-PL", {
      maximumFractionDigits: 2,
    }).format(value)} ${normalizedCurrency}`;
  }
}
