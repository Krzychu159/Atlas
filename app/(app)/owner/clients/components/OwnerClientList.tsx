import type { ReactNode } from "react";
import { ownerClientListGridStyle } from "./OwnerClientListRow";

export default function OwnerClientList({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-container-lowest">
      <div
        className="hidden gap-3 bg-surface-container-low px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted xl:grid"
        style={ownerClientListGridStyle}
      >
        <span>Klient</span>
        <span>Trener</span>
        <span>Pakiet</span>
        <span>Do zapłaty</span>
        <span>Status</span>
        <span className="sr-only">Akcje</span>
      </div>

      <div className="grid gap-2.5 p-3 lg:grid-cols-2 xl:block xl:p-0">{children}</div>
    </div>
  );
}
