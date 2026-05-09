"use client";

import { Mail, RotateCcw, X } from "lucide-react";
import type { Invitation } from "@/app/lib/owner/invitations";

function getStatusLabel(invitation: Invitation) {
  const status = invitation.status?.toLowerCase() || "";

  if (invitation.cancelledAt || status.includes("cancel")) return "Wycofane";
  if (invitation.isAccepted || invitation.acceptedAt) return "Zaakceptowane";

  return "Oczekujące";
}

export default function InvitationsList({
  invitations,
  isLoading,
  onCancel,
  onResend,
}: {
  invitations: Invitation[];
  isLoading: boolean;
  onCancel: (id: number) => Promise<void>;
  onResend?: (id: number) => Promise<void>;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-4">
        <p className="text-label text-on-surface-variant shrink-0">
          Wysłane zaproszenia
        </p>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {isLoading ? (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-4 text-sm text-on-surface-variant">
            Ładowanie zaproszeń...
          </div>
        ) : null}

        {!isLoading && invitations.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-4 text-sm text-on-surface-variant">
            Brak oczekujących zaproszeń.
          </div>
        ) : null}

        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Mail size={17} className="text-on-surface-muted shrink-0" />

              <div className="min-w-0">
                <p className="text-sm md:text-base font-semibold truncate">
                  {invitation.email}
                </p>
                <p className="mt-1 text-label text-tertiary-light">
                  {getStatusLabel(invitation)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onResend ? (
                <button
                  onClick={() => onResend(invitation.id)}
                  className="hidden sm:flex h-9 px-3 rounded-full bg-surface-container-high text-primary-light text-[11px] font-semibold uppercase tracking-[0.05em] items-center gap-2"
                >
                  <RotateCcw size={13} />
                  Ponów
                </button>
              ) : null}

              <button
                onClick={() => onCancel(invitation.id)}
                className="h-9 px-3 rounded-full bg-error-container/40 text-error-light text-[11px] font-semibold uppercase tracking-[0.05em] flex items-center gap-2"
              >
                Wycofaj
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
