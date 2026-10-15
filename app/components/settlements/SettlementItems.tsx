import { userTrainingType } from "@/app/lib/user-messages";
import {
  formatSettlementDate,
  formatSettlementMoney,
  formatSettlementNumber,
} from "@/app/lib/trainer/settlement-display";

export type SettlementItemView = {
  sessionId: number;
  startAt: string;
  title: string | null;
  sessionType: string | null;
  locationName: string | null;
  isCoveredByContract: boolean;
  contractNumber: string | null;
  hours: number;
  rate: number;
  rateType: string | null;
  amount: number;
  participantsCount: number;
};

function rateUnit(value: string | null | undefined) {
  if (value === "Hourly") return "/h";
  if (value === "PerSession") return "/sesja";
  return "";
}

function rateTypeLabel(value: string | null | undefined) {
  if (value === "Hourly") return "Za godzinę rozliczeniową";
  if (value === "PerSession") return "Za sesję";
  return "Typ stawki niedostępny";
}

function contractLabel(item: SettlementItemView) {
  if (item.isCoveredByContract === true) return item.contractNumber ? `Umowa ${item.contractNumber}` : "Objęta umową";
  if (item.isCoveredByContract === false) return "Poza umową";
  return "Brak informacji o umowie";
}

export default function SettlementItems({
  title,
  items,
  emptyLabel = "Brak sesji w tej kategorii w wybranym miesiącu.",
  muteAmounts = false,
}: {
  title: string;
  items: SettlementItemView[];
  emptyLabel?: string;
  muteAmounts?: boolean;
}) {
  if (!items.length) {
    return <p className="px-4 py-4 text-sm text-on-surface-variant md:px-5">{emptyLabel}</p>;
  }

  const amountClassName = muteAmounts ? "text-on-surface-variant" : "text-tertiary-light";

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-muted">
            <tr>
              {["Data", "Sesja", "Rodzaj / lokalizacja", "Uczestnicy", "Godziny", "Stawka", "Kwota"].map((label, index) => (
                <th key={label} scope="col" className={`px-4 py-2.5 font-semibold ${index >= 3 ? "text-right" : ""}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.sessionId} className="border-t border-white/5 transition hover:bg-surface-container-low/60">
                <td className="whitespace-nowrap px-4 py-2.5 text-on-surface-variant">{formatSettlementDate(item.startAt)}</td>
                <td className="min-w-40 px-4 py-2.5">
                  <p className="font-semibold text-on-surface">{item.title || "Brak nazwy sesji"}</p>
                  <p className="text-[11px] text-on-surface-muted">{contractLabel(item)}</p>
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-on-surface-variant">{userTrainingType(item.sessionType)}</p>
                  <p className="text-[11px] text-on-surface-muted">{item.locationName || "Brak lokalizacji"}</p>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatSettlementNumber(item.participantsCount)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatSettlementNumber(item.hours)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums" title={rateTypeLabel(item.rateType)}>
                  {formatSettlementMoney(item.rate)}<span className="text-on-surface-muted">{rateUnit(item.rateType)}</span>
                </td>
                <td className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums ${amountClassName}`}>{formatSettlementMoney(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-1.5 p-3 lg:hidden">
        {items.map((item) => (
          <li key={item.sessionId} className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-on-surface">{item.title || "Brak nazwy sesji"}</p>
                <p className="text-[11px] text-on-surface-muted">{formatSettlementDate(item.startAt)} · {contractLabel(item)}</p>
              </div>
              <p className={`shrink-0 text-sm font-semibold tabular-nums ${amountClassName}`}>{formatSettlementMoney(item.amount)}</p>
            </div>
            <p className="mt-1 text-xs text-on-surface-variant">
              {userTrainingType(item.sessionType)} · {item.locationName || "Brak lokalizacji"} · {formatSettlementNumber(item.participantsCount)} os. · {formatSettlementNumber(item.hours)} h · {formatSettlementMoney(item.rate)}{rateUnit(item.rateType)}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
