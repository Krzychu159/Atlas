"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mail, Send } from "lucide-react";
import InvitationsList from "@/app/(app)/owner/components/InvitationsList";
import { showAppSuccess } from "@/app/components/ui/app-toast";
import { Button } from "@/app/components/ui/button";
import { TextField } from "@/app/components/ui/input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import { isValidTrainerClientEmail } from "@/app/lib/trainer/client-create";
import {
  cancelTrainerInvitation,
  createTrainerClientInvitation,
  getTrainerInvitations,
  INVITATION_EMAIL_INVALID,
  INVITATION_NOT_DELIVERED,
  pendingClientInvitations,
  resendTrainerInvitation,
  trainerInvitationError,
  type InvitableClient,
} from "@/app/lib/trainer/invitations";
import type { Invitation } from "@/app/lib/owner/invitations";

type TrainerInviteClientModalProps = {
  client: InvitableClient;
  onClose: () => void;
  /** Called instead of onClose once the client's access changed, so the caller can refresh. */
  onChanged: () => void;
};

export default function TrainerInviteClientModal({ client, onClose, onChanged }: TrainerInviteClientModalProps) {
  const [email, setEmail] = useState(client.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isInvited, setIsInvited] = useState(client.portalAccessStatus === "Invited");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(isInvited);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const busy = useRef(false);
  const changed = useRef(false);
  const { id: clientId, email: clientEmail } = client;

  useEffect(() => {
    if (!isInvited) return;
    const controller = new AbortController();
    getTrainerInvitations({ Role: "Client" }, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      setInvitations(pendingClientInvitations(data || [], { id: clientId, email: clientEmail }));
      setLoadFailed(false);
      setIsLoadingInvitations(false);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setLoadFailed(true);
      setIsLoadingInvitations(false);
    });
    return () => controller.abort();
  }, [clientId, clientEmail, isInvited, loadAttempt]);

  function reloadInvitations() {
    setIsLoadingInvitations(true);
    setLoadAttempt((value) => value + 1);
  }

  function close() {
    if (changed.current) onChanged();
    else onClose();
  }

  async function runExclusive(action: () => Promise<void>, fallback?: string) {
    if (busy.current) return;
    busy.current = true;
    setIsBusy(true);
    setFormError(null);
    try {
      await action();
    } catch (error) {
      const failure = trainerInvitationError(error, fallback);
      setEmailError(failure.emailError);
      setFormError(failure.message);
    } finally {
      busy.current = false;
      setIsBusy(false);
    }
  }

  function handleSend(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!isValidTrainerClientEmail(address)) {
      setEmailError(INVITATION_EMAIL_INVALID);
      return Promise.resolve();
    }
    setEmailError(null);
    return runExclusive(async () => {
      const invitation = await createTrainerClientInvitation({ clientId: client.id, email: address, role: "Client", locationId: client.locationId });
      changed.current = true;
      if (invitation?.lastSendError) {
        setFormError(INVITATION_NOT_DELIVERED);
        setIsLoadingInvitations(true);
        setIsInvited(true);
        return;
      }
      showAppSuccess("Zaproszenie do panelu zostało wysłane.", { id: "trainer-client-invitation-success" });
      onChanged();
    });
  }

  function handleResend(id: number) {
    return runExclusive(async () => {
      const invitation = await resendTrainerInvitation(id);
      changed.current = true;
      reloadInvitations();
      if (invitation?.lastSendError) {
        setFormError(INVITATION_NOT_DELIVERED);
        return;
      }
      showAppSuccess("Zaproszenie zostało ponowione.", { id: "trainer-client-invitation-resend-success" });
    }, "Nie udało się ponowić zaproszenia. Spróbuj ponownie.");
  }

  function handleCancel(id: number) {
    return runExclusive(async () => {
      await cancelTrainerInvitation(id);
      showAppSuccess("Zaproszenie zostało wycofane.", { id: "trainer-client-invitation-cancel-success" });
      onChanged();
    }, "Nie udało się wycofać zaproszenia. Spróbuj ponownie.");
  }

  return (
    <ModalOverlay onClose={isBusy ? undefined : close} className="items-end md:items-center">
      <form noValidate onSubmit={handleSend} className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[34px] bg-surface-container-high shadow-ambient md:max-w-[480px] md:rounded-[var(--radius-xl)]">
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <ModalHeader
            eyebrow="Dostęp do panelu"
            title={isInvited ? "Zaproszenie do panelu" : "Zaproś klienta"}
            description={isInvited
              ? "Ponów wysyłkę lub wycofaj oczekujące zaproszenie."
              : "Klient dostanie e-mail z linkiem do założenia konta w panelu klienta."}
            onClose={close}
          />
          {isInvited ? (
            <>
              {loadFailed ? (
                <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 text-sm text-error-light">
                  Nie udało się pobrać zaproszenia.
                  <Button type="button" variant="secondary" size="sm" onClick={reloadInvitations}>Spróbuj ponownie</Button>
                </div>
              ) : (
                <InvitationsList invitations={invitations} isLoading={isLoadingInvitations} onCancel={handleCancel} onResend={handleResend} stackOnMobile />
              )}
              {!isLoadingInvitations && !loadFailed && invitations.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  Zaproszenie mogło wysłać studio. Jeśli klient go nie ma, poproś właściciela studia o ponowienie.
                </p>
              ) : null}
            </>
          ) : (
            <TextField label="E-mail" type="email" value={email} onChange={(value) => { setEmail(value); setEmailError(null); setFormError(null); }} icon={<Mail size={17} />} error={emailError} className="mt-6" autoComplete="off" required />
          )}
        </div>

        {formError ? <p role="alert" className="border-t border-white/5 px-6 py-3 text-sm text-error-light">{formError}</p> : null}

        <ModalFooter className="bg-surface-container-high">
          <Button type="button" variant="secondary" onClick={close} disabled={isBusy}>{isInvited ? "Zamknij" : "Anuluj"}</Button>
          {!isInvited ? (
            <Button type="submit" disabled={isBusy} icon={<Send size={16} />}>
              {isBusy ? "Wysyłanie..." : "Wyślij zaproszenie"}
            </Button>
          ) : null}
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}
