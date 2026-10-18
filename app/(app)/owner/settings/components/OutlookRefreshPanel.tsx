"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { showAppError, showAppInfo, showAppSuccess } from "@/app/components/ui/app-toast";
import { getErrorMessage, isAbortError } from "@/app/lib/backend";
import { userMessage } from "@/app/lib/user-messages";
import { notifySessionCorrected } from "@/app/lib/session-corrections";
import {
  reconcileOutlook,
  type OutlookReconcileResult,
  type OutlookReconcileScope,
} from "@/app/lib/calendar/outlook";
import { OwnerRemoteSelect } from "../../components/OwnerRemoteSelect";

type ScopeKind = OutlookReconcileScope["kind"];

const scopeOptions: { value: ScopeKind; label: string; hint: string }[] = [
  { value: "mine", label: "Mój kalendarz", hint: "Najszybsza opcja. Odświeża tylko Twój kalendarz." },
  { value: "trainer", label: "Wybrany trener", hint: "Odświeża kalendarz jednego trenera." },
  { value: "all", label: "Wszyscy trenerzy", hint: "Odświeża kalendarze całego studia. Trwa najdłużej." },
];

const buttonLabels: Record<ScopeKind, string> = {
  mine: "Odśwież mój kalendarz",
  trainer: "Odśwież kalendarz trenera",
  all: "Odśwież wszystkich trenerów",
};

function plural(count: number, one: string, few: string, many: string) {
  if (count === 1) return one;
  const lastTwo = count % 100;
  const last = count % 10;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
}

function summarize(result: OutlookReconcileResult) {
  const events = result.importedOrUpdatedEvents;
  const sessions = result.crmSessionsSyncedToOutlook;
  return `Zaktualizowano ${events} ${plural(events, "wydarzenie", "wydarzenia", "wydarzeń")}, wysłano ${sessions} ${plural(sessions, "sesję", "sesje", "sesji")} do Outlooka.`;
}

export default function OutlookRefreshPanel({
  canChooseScope,
  connected,
  disabled,
  onRunningChange,
  onCompleted,
}: {
  canChooseScope: boolean;
  connected: boolean;
  disabled: boolean;
  onRunningChange: (running: boolean) => void;
  onCompleted: (result: OutlookReconcileResult) => void;
}) {
  const [scope, setScope] = useState<ScopeKind>("mine");
  const [trainerId, setTrainerId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OutlookReconcileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const activeScope: ScopeKind = canChooseScope ? scope : "mine";
  const selectedTrainerId = Number(trainerId);
  const needsTrainer = activeScope === "trainer" && !(selectedTrainerId > 0);
  const needsConnection = activeScope === "mine" && !connected;
  const label = canChooseScope ? buttonLabels[activeScope] : "Odśwież Outlook";

  function setRunningState(value: boolean) {
    setRunning(value);
    onRunningChange(value);
  }

  async function handleRefresh() {
    if (lock.current || needsTrainer || needsConnection) return;
    lock.current = true;
    const request = new AbortController();
    controller.current = request;
    const target: OutlookReconcileScope = activeScope === "trainer"
      ? { kind: "trainer", trainerId: selectedTrainerId }
      : { kind: activeScope };
    setRunningState(true);
    setError(null);
    setResult(null);
    try {
      const data = await reconcileOutlook(target, request.signal);
      if (request.signal.aborted) return;
      setResult(data);
      onCompleted(data);
      notifySessionCorrected();
      if (data.errors?.length) showAppInfo("Kalendarz został odświeżony, ale części danych nie udało się zsynchronizować.");
      else showAppSuccess(summarize(data), { id: "outlook-reconcile-success" });
    } catch (err) {
      if (isAbortError(err)) return;
      const message = getErrorMessage(err, "Nie udało się odświeżyć kalendarza. Spróbuj ponownie.");
      setError(message);
      showAppError(err, "Nie udało się odświeżyć kalendarza. Spróbuj ponownie.", { id: "outlook-reconcile-error" });
    } finally {
      if (controller.current === request) controller.current = null;
      lock.current = false;
      if (!request.signal.aborted) setRunningState(false);
    }
  }

  const hint = canChooseScope ? scopeOptions.find(option => option.value === activeScope)?.hint : null;

  return (
    <div className="mt-6 rounded-[var(--radius-lg)] bg-surface-container-low p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-on-surface">Odświeżanie kalendarza</p>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Pobiera nowe i zmienione wydarzenia z Outlooka oraz wysyła do niego treningi zapisane w ATLAS.
          </p>

          {canChooseScope ? (
            <fieldset disabled={running || disabled} className="mt-4 min-w-0">
              <legend className="sr-only">Zakres odświeżania</legend>
              <div className="grid grid-cols-3 gap-2">
                {scopeOptions.map(option => {
                  const checked = scope === option.value;
                  return (
                    <label
                      key={option.value}
                      className={[
                        "flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border px-2 py-1.5 text-center text-xs font-semibold leading-tight sm:px-3 sm:text-sm transition focus-within:outline-2 focus-within:outline-primary-light",
                        checked
                          ? "border-primary/60 bg-primary/10 text-on-surface"
                          : "border-transparent bg-surface-container text-on-surface-variant hover:text-on-surface",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="outlook-refresh-scope"
                        value={option.value}
                        checked={checked}
                        onChange={() => { setScope(option.value); setError(null); }}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
              {scope === "trainer" ? (
                <OwnerRemoteSelect
                  kind="trainers"
                  label="Trener"
                  value={trainerId}
                  onChange={value => { setTrainerId(value); setError(null); }}
                  allowAll={false}
                  emptyLabel="Wybierz trenera"
                  className="mt-3 sm:max-w-sm"
                />
              ) : null}
            </fieldset>
          ) : null}

          {hint ? <p className="mt-3 text-xs text-on-surface-muted">{hint}</p> : null}
          {needsConnection && !running ? (
            <p className="mt-2 text-xs text-warning-light">Najpierw połącz konto Microsoft.</p>
          ) : null}
        </div>

        <Button
          icon={running ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          onClick={() => void handleRefresh()}
          disabled={running || disabled || needsTrainer || needsConnection}
          className="w-full shrink-0 md:w-auto"
        >
          {running ? "Synchronizuję…" : label}
        </Button>
      </div>

      <div aria-live="polite">
        {running ? (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm text-on-surface-variant">
            <Loader2 size={16} className="shrink-0 animate-spin text-primary-light" />
            Odświeżanie trwa. Może potrwać kilka minut, wynik pojawi się tutaj.
          </p>
        ) : null}

        {error && !running ? (
          <p role="alert" className="mt-4 text-sm text-error-light">{error}</p>
        ) : null}

        {result && !running ? (
          <div className="mt-4 space-y-3">
            <p className="flex items-start gap-2 text-sm font-semibold text-tertiary-light">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              {summarize(result)}
            </p>

            {result.errors?.length ? (
              <details className="rounded-[var(--radius-md)] bg-warning-container p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-warning-light">
                  <AlertTriangle size={16} className="shrink-0" />
                  Części danych nie udało się zsynchronizować ({result.errors.length})
                </summary>
                <ul className="mt-3 space-y-2 text-sm text-on-surface">
                  {result.errors.map((item, index) => (
                    <li key={index} className="whitespace-pre-wrap break-words">
                      {userMessage(
                        typeof item === "string" ? item : item && typeof item === "object" && "message" in item ? item.message : null,
                        "Nie udało się zsynchronizować części danych. Spróbuj ponownie.",
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            <details className="rounded-[var(--radius-md)] bg-surface-container p-3">
              <summary className="cursor-pointer text-sm font-semibold text-on-surface-variant">Szczegóły odświeżania</summary>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {([
                  ["Sprawdzone połączenia", result.integrationsProcessed],
                  ["Znalezione wydarzenia w Outlooku", result.outlookEventsFound],
                  ["Dodane lub zaktualizowane wydarzenia", result.importedOrUpdatedEvents],
                  ["Wydarzenia usunięte z Outlooka", result.missingOutlookEventsMarkedDeleted],
                  ["Treningi z ATLAS wysłane do Outlooka", result.crmSessionsSyncedToOutlook],
                ] as const).map(([name, value]) => (
                  <div key={name} className="rounded-[var(--radius-md)] bg-surface-container-low px-3 py-2">
                    <dt className="text-xs text-on-surface-variant">{name}</dt>
                    <dd className="mt-1 text-lg font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        ) : null}
      </div>
    </div>
  );
}
