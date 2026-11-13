import { ApiError } from "./backend";
import { userMessage } from "./user-messages";

// Codes returned by the backend when a session cannot be settled (completion error `code`).
export const PACKAGE_SETTLEMENT_CODES = ["NoUsablePackage", "PackageHasNoRemainingSessions"] as const;
const SETTLEMENT_CODES: readonly string[] = [...PACKAGE_SETTLEMENT_CODES, "TrainerSettlementPaid"];

export type SessionSettlementError = {
  message: string;
  code: string | null;
};

function payloadField(error: ApiError, field: "message" | "code") {
  const payload = error.payload;
  if (!payload || typeof payload !== "object" || !(field in payload)) return null;
  const value = (payload as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * The reason a session could not be settled. For known codes the backend sends a ready Polish
 * sentence (client, package, dates, what to do), shown in full. Other 400 errors from a completion
 * attempt are shown only when readable.
 */
export function getSessionSettlementError(error: unknown, completing: boolean): SessionSettlementError | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null;
  const code = payloadField(error, "code");
  const message = payloadField(error, "message");
  if (code && SETTLEMENT_CODES.includes(code) && message) return { message, code };
  if (!completing) return null;
  return { message: userMessage(message ?? error.message, "Sprawdź pakiety uczestników i spróbuj ponownie."), code };
}

export function isPackageSettlementError(error: SessionSettlementError) {
  return (PACKAGE_SETTLEMENT_CODES as readonly (string | null)[]).includes(error.code);
}
