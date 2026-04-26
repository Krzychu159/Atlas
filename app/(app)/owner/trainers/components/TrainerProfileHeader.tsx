import Link from "next/link";
import { CornerDownLeft, Mail, Phone, Pencil, ShieldCheck } from "lucide-react";
import type { Trainer } from "@/app/lib/owner/trainers";
import { Button } from "@/app/components/ui/button";

function getInitials(trainer: Trainer) {
  const name = trainer.fullName || `${trainer.firstName} ${trainer.lastName}`;

  return name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TrainerProfileHeader({
  trainer,
}: {
  trainer: Trainer;
}) {
  const fullName =
    trainer.fullName || `${trainer.firstName} ${trainer.lastName}`;

  return (
    <div className="card-shell p-5 md:p-7">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="relative shrink-0">
            <div className="h-32 w-32 md:h-36 md:w-36 rounded-[28px] bg-surface-container-lowest overflow-hidden flex items-center justify-center">
              {trainer.avatarUrl ? (
                <img
                  src={trainer.avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[2rem] font-semibold text-primary-light">
                  {getInitials(trainer)}
                </span>
              )}
            </div>

            <div className="absolute -right-2 bottom-3 h-10 w-10 rounded-full bg-tertiary-light text-on-tertiary flex items-center justify-center shadow-soft">
              <ShieldCheck size={18} />
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-label text-primary-light">Trainer Management</p>

            <h1 className="mt-3 text-[2.4rem] md:text-[3rem] leading-[0.95] font-semibold font-display tracking-tight">
              {fullName}
            </h1>

            <p className="mt-3 text-label text-primary-light">
              {trainer.role || "Trener personalny"}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
                <Mail size={16} className="text-primary-light" />
                {trainer.email || "Brak e-maila"}
              </div>

              <div className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
                <Phone size={16} className="text-primary-light" />
                {trainer.phone || "Brak telefonu"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex md:flex-col gap-3 md:min-w-[190px]">
          <Button className="h-12 md:h-14 flex-1 rounded-[var(--radius-lg)] bg-primary text-on-primary font-semibold flex items-center justify-center gap-2">
            <Pencil size={16} />
            Edytuj
          </Button>

          <Button className="h-12 md:h-14 flex-1 rounded-[var(--radius-lg)] bg-surface-container-low text-on-surface font-semibold flex items-center justify-center gap-2">
            <Link href="/owner/trainers" className="flex items-center gap-2">
              <CornerDownLeft size={16} />
              Wróć
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
