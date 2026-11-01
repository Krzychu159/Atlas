import { ApiError, backendGet, backendPost, getErrorMessage } from "../backend";
import { isPendingInvitation, type Invitation } from "../owner/invitations";

export type TrainerClientInvitationPayload = {
  clientId: number;
  email: string;
  role: "Client";
  locationId: number;
};

export type InvitableClient = {
  id: number;
  email?: string | null;
  locationId: number;
  portalAccessStatus?: string | null;
};

export const INVITATION_EMAIL_INVALID = "Podaj poprawny adres e-mail.";
export const INVITATION_NOT_DELIVERED = "Nie udało się dostarczyć wiadomości z zaproszeniem. Sprawdź adres e-mail i ponów wysyłkę.";
const INVITATION_FALLBACK = "Nie udało się wysłać zaproszenia. Spróbuj ponownie.";

export function getTrainerInvitations(params: { Role: "Client" }, signal?: AbortSignal) {
  return backendGet<Invitation[]>("trainer-portal/invitations", params, signal);
}

export function createTrainerClientInvitation(payload: TrainerClientInvitationPayload) {
  return backendPost<Invitation>("trainer-portal/invitations", payload);
}

export function resendTrainerInvitation(id: number) {
  return backendPost<Invitation>(`trainer-portal/invitations/${id}/resend`);
}

export function cancelTrainerInvitation(id: number) {
  return backendPost<void>(`trainer-portal/invitations/${id}/cancel`);
}

export function canInviteClient(status: string | null | undefined) {
  return status === "NoAccount" || status === "Invited";
}

export function pendingClientInvitations(invitations: Invitation[], client: Pick<InvitableClient, "id" | "email">) {
  const email = (client.email || "").trim().toLowerCase();
  return invitations.filter((invitation) => isPendingInvitation(invitation) && (
    invitation.clientId === client.id
    || (!invitation.clientId && Boolean(email) && (invitation.email || "").trim().toLowerCase() === email)
  ));
}

/** Maps a failed invitation action to Polish messages; backend text only selects the message and is never shown. */
export function trainerInvitationError(error: unknown, fallback = INVITATION_FALLBACK): { message: string; emailError: string | null } {
  const failure = (message: string, emailError: string | null = null) => ({ message, emailError });
  if (!(error instanceof ApiError)) return failure(getErrorMessage(error, fallback));
  const taken = "Ta osoba ma już konto albo oczekujące zaproszenie. Odśwież stronę i sprawdź jej dostęp.";
  if (error.status === 401) return failure("Sesja wygasła. Zaloguj się ponownie.");
  if (error.status === 403) return failure("Nie masz uprawnień do wysyłania zaproszeń dla tego klienta.");
  if (error.status === 404) return failure("Nie znaleziono tego zaproszenia. Odśwież stronę i spróbuj ponownie.");
  if (error.status === 409) return failure(taken);
  if (error.status !== 400 && error.status !== 422) return failure(fallback);

  const text = error.message || "";
  if (/already|exists|pending|istnieje|oczekuj/i.test(text)) return failure(taken);
  if (/e-?mail/i.test(text)) return failure(INVITATION_EMAIL_INVALID, INVITATION_EMAIL_INVALID);
  if (/location|lokalizacj/i.test(text)) return failure("Zaproszenia możesz wysyłać tylko klientom z lokalizacji, w której pracujesz.");
  if (/client|klient|trainer|trener/i.test(text)) return failure("Zaproszenia możesz wysyłać tylko swoim klientom.");
  return failure(fallback);
}
