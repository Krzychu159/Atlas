import type { Location } from "@/app/lib/owner/locations";
import type {
  CompanyExpense,
  ExpenseDictionaryItem,
  ExpenseStatistics,
} from "@/app/lib/owner/expenses";

export type DictionaryOption = {
  value: number;
  label: string;
};

export type LegalEntityOption = {
  id: number;
  name: string;
};

export const fallbackCategories: DictionaryOption[] = [
  { value: 0, label: "Inne" },
  { value: 1, label: "Czynsz" },
  { value: 2, label: "Media" },
  { value: 3, label: "Marketing" },
  { value: 4, label: "Sprzęt" },
  { value: 5, label: "Księgowość" },
  { value: 6, label: "Oprogramowanie" },
  { value: 7, label: "Sprzątanie" },
  { value: 8, label: "Naprawy" },
  { value: 9, label: "Materiały" },
  { value: 10, label: "Koszty trenerów" },
  { value: 11, label: "Podatki i opłaty" },
];

export const fallbackPaymentStatuses: DictionaryOption[] = [
  { value: 0, label: "Nieopłacone" },
  { value: 1, label: "Opłacone" },
  { value: 2, label: "Zaległe" },
  { value: 3, label: "Anulowane" },
];

export function normalizeDictionary(
  raw: ExpenseDictionaryItem[] | Record<string, string | number> | null,
  fallback: DictionaryOption[],
) {
  if (Array.isArray(raw)) {
    const normalized = raw
      .map((item) => {
        const value = Number(item.value ?? item.id ?? item.key);
        const backendLabel = item.label || item.displayName || item.name;
        const fallbackLabel = fallback.find(
          (option) => option.value === value,
        )?.label;

        return Number.isFinite(value)
          ? { value, label: fallbackLabel || backendLabel || String(value) }
          : null;
      })
      .filter((item): item is DictionaryOption => item !== null);

    return normalized.length ? normalized : fallback;
  }

  if (raw && typeof raw === "object") {
    const normalized = Object.entries(raw)
      .map(([key, value]) => {
        const numericKey = Number(key);
        const numericValue = Number(value);
        const optionValue = Number.isFinite(numericKey) ? numericKey : numericValue;
        const backendLabel = Number.isFinite(numericKey) ? String(value) : key;
        const fallbackLabel = fallback.find(
          (option) => option.value === optionValue,
        )?.label;

        return Number.isFinite(optionValue)
          ? { value: optionValue, label: fallbackLabel || backendLabel }
          : null;
      })
      .filter((item): item is DictionaryOption => item !== null);

    return normalized.length ? normalized : fallback;
  }

  return fallback;
}

export function getDictionaryLabel(
  value: number,
  options: DictionaryOption[],
) {
  return options.find((option) => option.value === value)?.label || `#${value}`;
}

export function deriveLegalEntities(
  expenses: CompanyExpense[],
  statistics: ExpenseStatistics | null,
  locations: Location[],
) {
  const entities = new Map<number, string>();

  expenses.forEach((expense) => {
    entities.set(
      expense.legalEntityId,
      expense.legalEntityName || `Działalność ${expense.legalEntityId}`,
    );
  });

  statistics?.byLegalEntity?.forEach((item) => {
    const id = Number(item.legalEntityId ?? item.id ?? item.key);
    if (!Number.isFinite(id) || id <= 0) return;
    entities.set(
      id,
      item.legalEntityName || item.name || item.label || `Działalność ${id}`,
    );
  });

  locations.forEach((location) => {
    const id = Number(location.legalEntityId);
    if (!Number.isFinite(id) || id <= 0) return;
    entities.set(
      id,
      location.legalEntityName || `Działalność ${id}`,
    );
  });

  return Array.from(entities, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name, "pl"),
  );
}

export function getExpenseStatusTone(expense: CompanyExpense) {
  if (expense.isOverdue || expense.paymentStatus === 2) return "overdue";
  if (expense.paymentStatus === 1) return "paid";
  if (expense.paymentStatus === 3) return "cancelled";
  return "unpaid";
}

export function toDateValue(value?: string | null) {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";
}

export function formatExpenseDate(value?: string | null) {
  const normalized = toDateValue(value);
  if (!normalized) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${normalized}T00:00:00`));
}

export function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}
