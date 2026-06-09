"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Mail, X } from "lucide-react";
import {
  cancelInvitation,
  createInvitation,
  getInvitations,
  resendInvitation,
  isPendingInvitation,
  type Invitation,
} from "@/app/lib/owner/invitations";
import InvitationsList from "../../components/InvitationsList";
import { showOwnerError, showOwnerSuccess } from "../../components/owner-toast";

type AddTrainerModalProps = {
  open: boolean;
  onClose: () => void;
};

const initialForm = {
  email: "",
};

export default function AddTrainerModal({
  open,
  onClose,
}: AddTrainerModalProps) {
  const [form, setForm] = useState(initialForm);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  async function loadInvitations() {
    try {
      setIsLoadingInvitations(true);

      const data = await getInvitations({
        role: "Trainer",
      });

      setInvitations(data.filter(isPendingInvitation));
    } catch (err) {
      showOwnerError(err, "Nie udało się pobrać zaproszeń.", {
        id: "owner-trainer-invitations-load-error",
      });
    } finally {
      setIsLoadingInvitations(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    loadInvitations();

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    try {
      setIsSubmitting(true);

      await createInvitation({
        email: form.email,
        role: "Trainer",
        locationId: 0,
      });

      setForm(initialForm);
      await loadInvitations();
      showOwnerSuccess("Zaproszenie dla trenera zostało wysłane.", {
        id: "owner-trainer-invitation-create-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się wysłać zaproszenia.", {
        id: "owner-trainer-invitation-create-error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(id: number) {
    try {
      await cancelInvitation(id);

      setInvitations((current) =>
        current.filter((invitation) => invitation.id !== id),
      );
      showOwnerSuccess("Zaproszenie zostało wycofane.", {
        id: "owner-trainer-invitation-cancel-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się wycofać zaproszenia.", {
        id: "owner-trainer-invitation-cancel-error",
      });
    }
  }

  async function handleResend(id: number) {
    try {
      await resendInvitation(id);
      await loadInvitations();
      showOwnerSuccess("Zaproszenie zostało ponowione.", {
        id: "owner-trainer-invitation-resend-success",
      });
    } catch (err) {
      showOwnerError(err, "Nie udało się ponowić zaproszenia.", {
        id: "owner-trainer-invitation-resend-error",
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <button
        aria-label="Zamknij"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-[5px]"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[34px] bg-surface-container-high shadow-ambient md:max-w-[560px] md:rounded-[28px]">
        <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface"
          >
            <X size={20} />
          </button>

          <div className="pr-12">
            <p className="text-label text-primary-light">Zaproszenie</p>
            <h2 className="mt-2 text-[2rem] leading-none font-semibold tracking-tight">
              Dodaj trenera
            </h2>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">
              Wpisz adres e-mail trenera. Wyślemy zaproszenie do utworzenia
              konta i panelu trenera.
            </p>
          </div>

          <div className="mt-8">
            <label className="text-label text-on-surface-variant">
              Adres e-mail
            </label>

            <div className="mt-3 flex h-14 items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4">
              <Mail size={18} className="shrink-0 text-on-surface-muted" />
              <input
                value={form.email}
                onChange={(event) => setForm({ email: event.target.value })}
                placeholder="trainer@atlas-crm.com"
                type="email"
                className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
              />
            </div>
          </div>

          <InvitationsList
            invitations={invitations}
            isLoading={isLoadingInvitations}
            onCancel={handleCancel}
            onResend={handleResend}
          />
        </div>

        <div className="border-t border-white/5 bg-surface-container-high p-4 md:px-8">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.email}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-primary-gradient text-base font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
          >
            {isSubmitting ? "Wysyłanie..." : "Dodaj trenera"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
