import type { ReactNode } from "react";
import { clientListGridStyle } from "./ClientListRow";

type ClientListProps = {
  amountLabel: string;
  showTrainer?: boolean;
  children: ReactNode;
};

export default function ClientList({ amountLabel, showTrainer = true, children }: ClientListProps) {
  return (
    <div className="bg-surface-container-lowest">
      <div
        className="hidden gap-3 bg-surface-container-low px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted xl:grid"
        style={clientListGridStyle(showTrainer)}
      >
        <span>Klient</span>
        {showTrainer ? <span>Trener</span> : null}
        <span>Pakiet</span>
        <span>{amountLabel}</span>
        <span>Status</span>
        <span className="sr-only">Akcje</span>
      </div>

      <div className="grid gap-2.5 p-3 lg:grid-cols-2 xl:block xl:p-0">{children}</div>
    </div>
  );
}
