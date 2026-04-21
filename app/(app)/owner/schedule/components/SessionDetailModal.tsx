"use client";

import { useEffect } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import type { SessionEvent } from "@/app/components/TrainingCalendar";

type SessionDetailsModalProps = {
  session: SessionEvent | null;
  open: boolean;
  onClose: () => void;
};

export default function SessionDetailsModal({
  session,
  open,
  onClose,
}: SessionDetailsModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <button
        aria-label="Zamknij modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-[880px] card-shell p-5 md:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-section-title">Szczegóły Sesji</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Podgląd zaznaczonego treningu
            </p>
          </div>

          <button
            onClick={onClose}
            className="h-11 w-11 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-5">
          <div>
            <div className="relative h-[230px] md:h-[280px] rounded-[var(--radius-lg)] overflow-hidden bg-surface-container-low">
              <img
                src={session.image}
                alt={session.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.38))]" />
              <div className="absolute left-4 bottom-4">
                <span className="px-3 py-1 rounded-full bg-tertiary-light text-on-tertiary text-[11px] font-semibold">
                  Dostępne miejsca
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[1.9rem] md:text-[2.2rem] leading-[1] font-semibold tracking-tight">
                {session.title}
              </p>
              <p className="mt-3 text-sm md:text-base leading-7 text-on-surface-variant">
                {session.description}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
                <p className="text-label text-on-surface-muted">Godzina</p>
                <p className="mt-3 text-[1.05rem] font-semibold">
                  {new Date(session.start).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(session.end).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
                <p className="text-label text-on-surface-muted">Zapisani</p>
                <p className="mt-3 text-[1.05rem] font-semibold text-tertiary-light">
                  {session.zapisani}
                </p>
              </div>

              <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
                <p className="text-label text-on-surface-muted">Sala</p>
                <p className="mt-3 text-[1.05rem] font-semibold">
                  {session.sala}
                </p>
              </div>

              <div className="bg-surface-container-low rounded-[var(--radius-lg)] p-4">
                <p className="text-label text-on-surface-muted">Poziom</p>
                <p className="mt-3 text-[1.05rem] font-semibold">
                  {session.poziom}
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-section-title">Lista Uczestników</p>
              <button className="text-label text-primary-light">
                Zarządzaj
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {session.uczestnicy.map((osoba) => (
                <div
                  key={osoba.name}
                  className="bg-surface-container-low rounded-[var(--radius-lg)] px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-surface-container-high flex items-center justify-center text-sm font-semibold text-primary-light shrink-0">
                      {osoba.initials}
                    </div>

                    <p className="text-sm md:text-base font-medium truncate">
                      {osoba.name}
                    </p>
                  </div>

                  {osoba.confirmed ? (
                    <CheckCircle2
                      size={18}
                      className="text-tertiary-light shrink-0"
                    />
                  ) : (
                    <Circle
                      size={18}
                      className="text-on-surface-muted shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="h-14 rounded-[var(--radius-lg)] bg-surface-container-low text-on-surface font-semibold">
                Edytuj
              </button>
              <button className="h-14 rounded-[var(--radius-lg)] bg-primary text-on-primary font-semibold shadow-soft">
                Potwierdź Listę
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
