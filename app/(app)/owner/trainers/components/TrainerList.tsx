import type { Trainer } from "@/app/lib/owner/trainers";
import TrainerListRow, { trainerListGridStyle } from "./TrainerListRow";

export default function TrainerList({ trainers }: { trainers: Trainer[] }) {
  return (
    <div className="bg-surface-container-lowest">
      <div
        className="hidden gap-3 bg-surface-container-low px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted lg:grid"
        style={trainerListGridStyle}
      >
        <span>Trener</span>
        <span>Specjalizacja</span>
        <span>Sesje</span>
        <span>Doświadczenie</span>
        <span>Status</span>
        <span className="text-right">Akcje</span>
      </div>

      <div className="flex flex-col gap-3 p-3 lg:block lg:p-0">
        {trainers.map((trainer) => (
          <TrainerListRow key={trainer.id} trainer={trainer} />
        ))}
      </div>
    </div>
  );
}
