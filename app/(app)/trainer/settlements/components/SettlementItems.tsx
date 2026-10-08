import type { TrainerPortalSettlementItem } from "@/app/lib/trainer/portal";
import { userTrainingType } from "@/app/lib/user-messages";
import {
  formatSettlementDate,
  formatSettlementMoney,
  formatSettlementNumber,
} from "@/app/lib/trainer/settlement-display";

function rateTypeLabel(value: string | null | undefined) {
  if (value === "Hourly") return "Za godzinę rozliczeniową";
  if (value === "PerSession") return "Za sesję";
  return "Typ stawki niedostępny";
}

export default function SettlementItems({ title, description, items }: {
  title: string;
  description: string;
  items: TrainerPortalSettlementItem[];
}) {
  return (
    <section className="card-shell overflow-hidden">
      <div className="p-5 md:p-6">
        <h2 className="text-section-title">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
      </div>
      {items.length ? (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{title}</caption>
              <thead className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-muted">
                <tr>
                  {["Data i godzina", "Sesja / umowa", "Rodzaj", "Lokalizacja", "Uczestnicy", "Godziny rozliczeniowe", "Stawka", "Typ stawki", "Kwota"].map((label) => (
                    <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.sessionId} className="border-t border-secondary/20 odd:bg-surface-container-lowest">
                    <td className="whitespace-nowrap px-4 py-4">{formatSettlementDate(item.startAt)}</td>
                    <td className="min-w-40 px-4 py-4">
                      <p className="font-semibold">{item.title || "Brak nazwy sesji"}</p>
                      <ContractLabel item={item} />
                    </td>
                    <td className="px-4 py-4">{userTrainingType(item.sessionType)}</td>
                    <td className="px-4 py-4">{item.locationName || "Brak danych"}</td>
                    <td className="px-4 py-4 tabular-nums">{formatSettlementNumber(item.participantsCount)}</td>
                    <td className="px-4 py-4 tabular-nums">{formatSettlementNumber(item.hours)}</td>
                    <td className="whitespace-nowrap px-4 py-4 tabular-nums">{formatSettlementMoney(item.rate)}</td>
                    <td className="px-4 py-4">{rateTypeLabel(item.rateType)}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-tertiary-light">{formatSettlementMoney(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 px-5 pb-5 md:px-6 md:pb-6 xl:hidden">
            {items.map((item) => (
              <article key={item.sessionId} className="rounded-[var(--radius-lg)] bg-surface-container-low p-4">
                <p className="text-xs text-primary-light">{formatSettlementDate(item.startAt)}</p>
                <h3 className="mt-2 break-words font-semibold">{item.title || "Brak nazwy sesji"}</h3>
                <ContractLabel item={item} />
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Detail label="Rodzaj" value={userTrainingType(item.sessionType)} />
                  <Detail label="Lokalizacja" value={item.locationName || "Brak danych"} />
                  <Detail label="Uczestnicy" value={formatSettlementNumber(item.participantsCount)} />
                  <Detail label="Godziny rozliczeniowe" value={formatSettlementNumber(item.hours)} />
                  <Detail label="Stawka" value={formatSettlementMoney(item.rate)} />
                  <Detail label="Typ stawki" value={rateTypeLabel(item.rateType)} />
                  <Detail label="Kwota" value={formatSettlementMoney(item.amount)} />
                </dl>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="px-5 pb-6 text-sm text-on-surface-variant md:px-6">Brak sesji w tej kategorii w wybranym miesiącu.</p>
      )}
    </section>
  );
}

function ContractLabel({ item }: { item: TrainerPortalSettlementItem }) {
  const label = item.isCoveredByContract === true
    ? item.contractNumber ? `Umowa ${item.contractNumber}` : "Objęta umową"
    : item.isCoveredByContract === false ? "Poza umową" : "Brak informacji o umowie";
  return <p className="mt-1 text-xs text-on-surface-muted">{label}</p>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-on-surface-muted">{label}</dt><dd className="mt-1 break-words font-semibold tabular-nums">{value}</dd></div>;
}
