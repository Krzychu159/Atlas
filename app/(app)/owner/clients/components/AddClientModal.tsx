"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Mail, X } from "lucide-react";
import { toast } from "sonner";
import {
  cancelInvitation,
  createInvitation,
  getInvitations,
  resendInvitation,
  isPendingInvitation,
  type Invitation,
} from "@/app/lib/owner/invitations";
import InvitationsList from "../../components/InvitationsList";

type AddClientModalProps = {
  open: boolean;
  onClose: () => void;
};

const initialForm = {
  email: "",
};

export default function AddClientModal({ open, onClose }: AddClientModalProps) {
  const [form, setForm] = useState(initialForm);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  async function loadInvitations() {
    try {
      setIsLoadingInvitations(true);

      const data = await getInvitations({
        role: "Client",
      });

      setInvitations(data.filter(isPendingInvitation));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Nie udało się pobrać zaproszeń.",
      );
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
        role: "Client",
        locationId: 0,
      });

      setForm(initialForm);
      await loadInvitations();
      toast.success("Zaproszenie dla klienta zostało wysłane.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się wysłać zaproszenia.",
      );
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
      toast.success("Zaproszenie zostało wycofane.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się wycofać zaproszenia.",
      );
    }
  }

  async function handleResend(id: number) {
    try {
      await resendInvitation(id);
      await loadInvitations();
      toast.success("Zaproszenie zostało ponowione.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Nie udało się ponowić zaproszenia.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <button
        aria-label="Zamknij"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-[5px]"
      />

      <div className="relative z-10 w-full md:max-w-[560px] rounded-t-[34px] md:rounded-[28px] bg-surface-container-high p-6 md:p-8 shadow-ambient max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface"
        >
          <X size={20} />
        </button>

        <div className="pr-12">
          <p className="text-label text-primary-light">Zaproszenie</p>
          <h2 className="mt-2 text-[2rem] leading-none font-semibold tracking-tight">
            Dodaj Klienta
          </h2>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            Wpisz adres e-mail klienta. Wyślemy zaproszenie do utworzenia konta
            i panelu klienta.
          </p>
        </div>

        <div className="mt-8">
          <label className="text-label text-on-surface-variant">
            Adres e-mail
          </label>

          <div className="mt-3 h-14 rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 flex items-center gap-3">
            <Mail size={18} className="text-on-surface-muted shrink-0" />
            <input
              value={form.email}
              onChange={(event) => setForm({ email: event.target.value })}
              placeholder="client@atlas-crm.com"
              type="email"
              className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-muted"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !form.email}
          className="mt-6 h-16 w-full rounded-[var(--radius-lg)] bg-primary-gradient text-white text-base font-semibold tracking-[0.08em] uppercase disabled:opacity-60 flex items-center justify-center gap-3"
        >
          {isSubmitting ? "Wysyłanie..." : "Dodaj klienta"}
          <ArrowRight size={18} />
        </button>

        <InvitationsList
          invitations={invitations}
          isLoading={isLoadingInvitations}
          onCancel={handleCancel}
          onResend={handleResend}
        />
      </div>
    </div>
  );
}
