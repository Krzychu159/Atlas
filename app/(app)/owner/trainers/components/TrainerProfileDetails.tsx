import type { Trainer } from "@/app/lib/owner/trainers";

export default function TrainerProfileDetails({
  trainer,
}: {
  trainer: Trainer;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-4">
      <div className="card-shell p-6">
        <p className="text-section-title">Opis trenera</p>

        <p className="mt-4 text-base leading-8 text-on-surface-variant">
          {trainer.bio || "Ten trener nie ma jeszcze uzupełnionego opisu."}
        </p>
      </div>

      <div className="card-shell p-6">
        <p className="text-section-title">Informacje systemowe</p>

        <div className="mt-5 flex flex-col gap-4">
          <InfoRow label="Status" value={trainer.status || "Brak"} />
          <InfoRow label="Rola" value={trainer.role || "Trener"} />
          <InfoRow
            label="Lokalizacje"
            value={
              trainer.locationNames?.length
                ? trainer.locationNames.join(", ")
                : "Brak przypisania"
            }
          />
          <InfoRow
            label="Utworzono"
            value={
              trainer.createdAt
                ? new Date(trainer.createdAt).toLocaleDateString("pl-PL")
                : "Brak danych"
            }
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container-low rounded-[var(--radius-lg)] px-4 py-3">
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}
