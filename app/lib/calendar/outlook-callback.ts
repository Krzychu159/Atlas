import { userMessage } from "@/app/lib/user-messages";

export type OutlookCallbackError = {
  code: string | null;
  message: string;
  microsoftCode: string | null;
};

const codeMessages: Record<string, string> = {
  AdminConsentRequired: "Twoja organizacja wymaga zgody administratora Microsoft na dostęp do kalendarza. Poproś administratora o zgodę albo połącz inne konto.",
  AccountNotSupported: "To konto Microsoft nie obsługuje kalendarza Outlook. Połącz konto, w którym prowadzisz kalendarz.",
  AccessDenied: "Nie udzielono dostępu do kalendarza. Spróbuj ponownie i zaakceptuj uprawnienia Microsoft.",
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Microsoft error codes are short identifiers such as AADSTS65001 or access_denied.
function safeCode(value: unknown) {
  const code = text(value);
  return code && /^[A-Za-z0-9_.-]{1,64}$/.test(code) ? code : null;
}

export function readOutlookCallbackError(payload: unknown): OutlookCallbackError | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  const code = safeCode(raw.code);
  const message = text(raw.message);
  if (!code && !message) return null;
  const fallback = (code && Object.hasOwn(codeMessages, code) ? codeMessages[code] : null) ?? "Nie udało się połączyć konta Microsoft. Spróbuj ponownie z ustawień ATLAS.";
  return { code, message: userMessage(message, fallback), microsoftCode: safeCode(raw.microsoftCode) };
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
}
