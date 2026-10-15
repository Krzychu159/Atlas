import type { PaymentsQuery } from "./billing";
import type { PaymentFiltersValue } from "@/app/(app)/owner/payments/components/PaymentFilters";

export function paymentListQuery(filters: PaymentFiltersValue, page: number, pageSize: number, locationId: number | null): PaymentsQuery {
  const sorts: Record<string, PaymentsQuery["sort"]> = { newest: "paymentDateDesc", oldest: "paymentDate", amountDesc: "amountDesc", amountAsc: "amount" };
  const sort = sorts[filters.sortBy];
  if (!sort) throw new Error("To sortowanie nie jest jeszcze dostępne. Wybierz sortowanie po dacie lub kwocie.");
  const search = filters.client.trim();
  if (search.length > 100) throw new Error("Wpisz maksymalnie 100 znaków wyszukiwania.");
  const amount = (value: string) => {
    if (!value.trim()) return undefined;
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Podaj poprawny zakres kwot.");
    return parsed;
  };
  const amountMin = amount(filters.amountMin), amountMax = amount(filters.amountMax);
  if (amountMin !== undefined && amountMax !== undefined && amountMin > amountMax) throw new Error("Kwota od nie może być większa niż kwota do.");
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) throw new Error("Data od nie może być późniejsza niż data do.");
  return { page, pageSize, locationId, locationMatch: "effective", sort,
    ...(/^\d+$/.test(search) && Number(search) > 0 ? { clientId: Number(search) } : { search: search || undefined }),
    status: filters.status === "all" ? undefined : Number(filters.status) as PaymentsQuery["status"],
    source: filters.source === "all" ? undefined : Number(filters.source) as PaymentsQuery["source"],
    hasOverpayment: filters.overpayment === "all" ? undefined : filters.overpayment === "yes",
    from: filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).toISOString() : undefined,
    to: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).toISOString() : undefined, amountMin, amountMax };
}
