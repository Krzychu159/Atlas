import { backendGet, backendPost, isNotFoundError } from "@/app/lib/backend";
import { userMessage } from "@/app/lib/user-messages";

export type OutlookStatus = {
  isConnected: boolean;
  provider: string | null;
  email: string | null;
  connectedAt: string | null;
};

export type OutlookConnectUrl = {
  url: string | null;
};

export function getOutlookStatus(signal?: AbortSignal) {
  return backendGet<OutlookStatus>("outlook/status", undefined, signal);
}

export function getOutlookConnectUrl() {
  return backendGet<OutlookConnectUrl>("outlook/connect-url");
}

export function disconnectOutlook() {
  return backendPost<unknown>("outlook/disconnect");
}

export function syncOutlookClients() {
  return backendPost<unknown>("outlook/contacts/sync-clients");
}

export type OutlookSeriesAttention = string | {
  recurringGroupId: string;
  outlookSeriesSynced?: boolean;
  outlookSyncWarning?: string | null;
};

export type OutlookReconcileResult = {
  integrationsProcessed: number;
  outlookEventsFound: number;
  importedOrUpdatedEvents: number;
  missingOutlookEventsMarkedDeleted: number;
  crmSessionsSyncedToOutlook: number;
  errors?: unknown[] | null;
  seriesRequiringAttention?: OutlookSeriesAttention[] | null;
  outlookSeriesSynced?: boolean;
  outlookSyncWarning?: string | null;
};

export type OutlookReconcileScope =
  | { kind: "mine" }
  | { kind: "trainer"; trainerId: number }
  | { kind: "all" };

export type OutlookReconcileJobState = "Queued" | "Running" | "Completed" | "Failed";

export type OutlookReconcileJob = {
  jobId: string;
  state: OutlookReconcileJobState | string;
  message?: string | null;
  result?: OutlookReconcileResult | null;
};

const RECONCILE_POLL_MS = 4000;
const RECONCILE_MAX_WAIT_MS = 15 * 60_000;

function reconcileScopeBody(scope: OutlookReconcileScope) {
  if (scope.kind === "mine") return { onlyMine: true };
  if (scope.kind === "trainer") return { trainerId: scope.trainerId };
  return {};
}

function isReconcileJob(value: unknown): value is OutlookReconcileJob {
  return Boolean(value) && typeof value === "object" && typeof (value as OutlookReconcileJob).jobId === "string" && typeof (value as OutlookReconcileJob).state === "string";
}

function isReconcileResult(value: unknown): value is OutlookReconcileResult {
  return Boolean(value) && typeof value === "object" && typeof (value as OutlookReconcileResult).importedOrUpdatedEvents === "number";
}

function waitFor(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Anulowano odświeżanie.", "AbortError")); return; }
    const timer = window.setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
    const abort = () => { window.clearTimeout(timer); reject(new DOMException("Anulowano odświeżanie.", "AbortError")); };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function getOutlookReconcileJob(jobId: string, signal?: AbortSignal) {
  return backendGet<OutlookReconcileJob>(`outlook/reconcile/${encodeURIComponent(jobId)}`, undefined, signal);
}

// The backend answers 200 with the result when it finishes within ~15 s, otherwise 202 with a job to poll.
// A repeated start returns the same running job, so a second click never starts another sync.
export async function reconcileOutlook(scope: OutlookReconcileScope, signal?: AbortSignal): Promise<OutlookReconcileResult> {
  const started = await backendPost<OutlookReconcileResult | OutlookReconcileJob>("outlook/reconcile", {
    pastDays: 30,
    futureDays: 180,
    ...reconcileScopeBody(scope),
  });
  if (isReconcileResult(started)) return started;
  if (!isReconcileJob(started)) throw new Error("Nie udało się odczytać wyniku odświeżania. Spróbuj ponownie.");

  const deadline = Date.now() + RECONCILE_MAX_WAIT_MS;
  let job: OutlookReconcileJob = started;
  while (job.state !== "Completed") {
    if (job.state === "Failed") throw new Error(userMessage(job.message, "Nie udało się odświeżyć kalendarza. Spróbuj ponownie."));
    if (Date.now() > deadline) throw new Error("Odświeżanie trwa dłużej niż zwykle. Sprawdź grafik za kilka minut albo kliknij ponownie.");
    await waitFor(RECONCILE_POLL_MS, signal);
    try {
      job = await getOutlookReconcileJob(started.jobId, signal);
    } catch (error) {
      if (isNotFoundError(error)) throw new Error("Nie udało się sprawdzić postępu odświeżania. Kliknij ponownie, aby je wznowić.");
      throw error;
    }
    if (!isReconcileJob(job)) throw new Error("Nie udało się odczytać postępu odświeżania. Kliknij ponownie.");
  }
  if (!isReconcileResult(job.result)) throw new Error("Odświeżanie zakończyło się, ale nie udało się odczytać podsumowania.");
  return job.result;
}
