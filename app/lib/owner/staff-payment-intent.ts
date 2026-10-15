import { ApiError, backendGet } from "../backend";
import { createClientPayment, type ClientPayment, type CreateClientPaymentPayload } from "./billing";

export type StaffPaymentOperation = { key: string; operation: "CreateStaffPayment"; state: "Completed"; result: Pick<ClientPayment, "id" | "status" | "amount">; updatedAt: string };
export async function getStaffPaymentOperation(key: string): Promise<StaffPaymentOperation | null> {
  try { return await backendGet<StaffPaymentOperation>(`owner/operations/${encodeURIComponent(key)}`); }
  catch (error) {
    if (error instanceof ApiError && error.status === 404 && typeof error.payload === "object" && error.payload !== null && "state" in error.payload && error.payload.state === "NotFound") return null;
    throw error;
  }
}
type Outcome = { recovered: false; payment: ClientPayment } | { recovered: true; payment: StaffPaymentOperation["result"] };

// One mounted form intent. No automatic retry of writes and no financial data in storage.
export function createStaffPaymentIntent(dependencies: {
  post?: typeof createClientPayment; lookup?: typeof getStaffPaymentOperation; uuid?: () => string;
} = {}) {
  const post = dependencies.post ?? createClientPayment, lookup = dependencies.lookup ?? getStaffPaymentOperation;
  const uuid = dependencies.uuid ?? (() => crypto.randomUUID());
  let attempt: { key: string; fingerprint: string; payload: CreateClientPaymentPayload; uncertain: boolean; conflict: boolean; outcome?: Outcome } | null = null;
  let busy = false;
  const check = async (): Promise<Outcome | null> => {
    const operation = await lookup(attempt!.key);
    if (!operation) return null;
    if (operation.key !== attempt!.key || operation.operation !== "CreateStaffPayment" || operation.state !== "Completed" || !Number.isSafeInteger(operation.result?.id) || !Number.isFinite(operation.result?.amount)) throw new Error("Nie udało się potwierdzić wyniku wpłaty. Sprawdź historię płatności.");
    const outcome: Outcome = { recovered: true, payment: operation.result };
    attempt!.outcome = outcome; attempt!.uncertain = false;
    return outcome;
  };
  return {
    get unresolved() { return attempt?.uncertain ?? false; },
    async execute(payload: CreateClientPaymentPayload): Promise<Outcome> {
      if (busy) throw new Error("Trwa zapisywanie wpłaty. Poczekaj na wynik.");
      // Canonical field order also prevents object key order from creating a new intent.
      const canonical = { clientId: payload.clientId ?? null, clientPackageId: payload.clientPackageId ?? null, amount: payload.amount, method: payload.method, paymentDate: payload.paymentDate ?? null, note: payload.note ?? null };
      const fingerprint = JSON.stringify(canonical);
      if (attempt?.conflict) throw new Error("Dane tej próby wpłaty są sprzeczne z zapisanymi. Sprawdź historię płatności przed dalszym działaniem.");
      if (attempt && attempt.fingerprint !== fingerprint && attempt.uncertain) throw new Error("Wynik poprzedniej wpłaty wymaga sprawdzenia. Zachowaj jej dane i ponów sprawdzenie, zanim dodasz inną wpłatę.");
      if (!attempt || attempt.fingerprint !== fingerprint) attempt = { key: uuid(), fingerprint, payload: canonical, uncertain: false, conflict: false };
      if (attempt.outcome) return attempt.outcome;
      busy = true;
      try {
        if (attempt.uncertain) {
          const outcome = await check();
          if (outcome) return outcome;
        }
        try {
          const payment = await post(attempt.payload, attempt.key);
          attempt.outcome = { recovered: false, payment }; attempt.uncertain = false;
          return attempt.outcome;
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            attempt.conflict = true;
            throw new Error("Wpłata nie została ponowiona: wystąpił konflikt danych. Sprawdź historię płatności.");
          }
          if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) throw error;
          attempt.uncertain = true;
          try { const outcome = await check(); if (outcome) return outcome; }
          catch { throw new Error("Nie możemy teraz sprawdzić wyniku wpłaty. Dane zostały zachowane. Spróbuj sprawdzić ponownie."); }
          throw new Error("Nie potwierdziliśmy jeszcze zapisu wpłaty. Dane zostały zachowane. Ponów sprawdzenie i zapis tej samej wpłaty.");
        }
      } finally { busy = false; }
    },
  };
}
