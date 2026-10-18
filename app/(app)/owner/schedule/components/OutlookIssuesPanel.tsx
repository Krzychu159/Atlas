"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarPlus, EyeOff, PencilLine, RefreshCw, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { showAppSuccess } from "@/app/components/ui/app-toast";
import { getErrorMessage } from "@/app/lib/backend";
import {
  convertImportedEventToSession,
  getOutlookIssues,
  ignoreOutlookIssue,
  outlookIssueAction,
  outlookIssueCopy,
  type OutlookIssue,
} from "@/app/lib/calendar/outlook-issues";
import { notifySessionCorrected, useSessionCorrectionRevision } from "@/app/lib/session-corrections";
import { useOwnerRead } from "../../components/use-owner-read";

type PendingAction = { kind: "convert" | "ignore"; issue: OutlookIssue };

function issueKey(issue: OutlookIssue, index: number) {
  return `${issue.type}:${issue.externalCalendarEventId ?? "x"}:${issue.sessionId ?? "x"}:${index}`;
}

function formatIssueDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" }) : null;
}

// Outlook only reports changes here; entries, packages and balances change through CRM actions.
export default function OutlookIssuesPanel({ onOpenSession, embedded = false, className = "" }: {
  onOpenSession?: (sessionId: number) => void;
  embedded?: boolean;
  className?: string;
}) {
  const revision = useSessionCorrectionRevision();
  const issues = useOwnerRead("outlook-issues", getOutlookIssues, "Nie udało się pobrać zmian z kalendarza do sprawdzenia.", revision);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [ignoreNote, setIgnoreNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const lock = useRef(false);
  const items = issues.data ?? [];

  function closeDialog() {
    if (busy) return;
    setPending(null);
    setActionError(null);
    setIgnoreNote("");
  }

  async function confirmAction() {
    if (!pending?.issue.externalCalendarEventId || lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError(null);
    try {
      if (pending.kind === "convert") {
        await convertImportedEventToSession(pending.issue.externalCalendarEventId);
        showAppSuccess("Wydarzenie jest teraz sesją w grafiku, a wejścia zostały rozliczone.");
      } else {
        await ignoreOutlookIssue(pending.issue.externalCalendarEventId, ignoreNote.trim() || null);
        showAppSuccess("Zgłoszenie zostało pominięte.");
      }
      setPending(null);
      setIgnoreNote("");
      notifySessionCorrected();
    } catch (error) {
      setActionError(getErrorMessage(error, pending.kind === "convert" ? "Nie udało się zamienić wydarzenia na sesję. Spróbuj ponownie." : "Nie udało się pominąć zgłoszenia. Spróbuj ponownie."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!issues.loading && !issues.error && items.length === 0) return null;

  return (
    <section aria-label="Problemy z kalendarzem" aria-busy={issues.loading} className={[embedded ? "" : "card-shell p-4 md:p-5", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-warning-container text-warning-light"><AlertTriangle size={18} /></span>
          <div className="min-w-0">
            <h2 className="font-semibold text-on-surface">Problemy z kalendarzem{items.length ? ` (${items.length})` : ""}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Zmiany z Outlooka, które wymagają Twojej decyzji. Wejścia i salda klientów zmieniają się dopiero po Twojej akcji w ATLAS.</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" icon={<RefreshCw size={14} className={issues.loading ? "animate-spin" : ""} />} disabled={issues.loading} onClick={() => void issues.reload().catch(() => undefined)}>Odśwież</Button>
      </div>

      {issues.error ? (
        <div role="alert" className="mt-4 flex flex-col gap-3 text-sm text-error-light sm:flex-row sm:items-center sm:justify-between">
          {issues.error}
          <Button type="button" variant="secondary" size="sm" onClick={issues.retry}>Spróbuj ponownie</Button>
        </div>
      ) : issues.loading && !items.length ? <p role="status" className="mt-4 text-sm text-on-surface-variant">Sprawdzanie kalendarza…</p> : (
        <ul className="mt-4 space-y-2">
          {items.map((issue, index) => {
            const copy = outlookIssueCopy(issue.type);
            const action = outlookIssueAction(issue);
            const date = formatIssueDate(issue.startAt);
            const details = [issue.title, date, issue.trainerFullName].filter(Boolean).join(" · ");
            return (
              <li key={issueKey(issue, index)} className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface">{copy.title}</p>
                  {details ? <p className="mt-0.5 truncate text-xs text-on-surface-muted">{details}</p> : null}
                  <p className="mt-1 text-sm text-on-surface-variant">{copy.description}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {action === "correct-session" || action === "open-session" ? (
                    onOpenSession ? (
                      <Button type="button" size="sm" icon={action === "correct-session" ? <PencilLine size={14} /> : <SquareArrowOutUpRight size={14} />} onClick={() => onOpenSession(issue.sessionId!)}>
                        {action === "correct-session" ? "Otwórz korektę sesji" : "Otwórz sesję"}
                      </Button>
                    ) : (
                      <Link href={`/owner/schedule?sessionId=${issue.sessionId}`} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-lg)] bg-primary px-4 text-xs font-semibold text-on-primary transition hover:bg-primary-container focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]">
                        {action === "correct-session" ? <PencilLine size={14} /> : <SquareArrowOutUpRight size={14} />}
                        {action === "correct-session" ? "Otwórz korektę sesji" : "Otwórz sesję"}
                      </Link>
                    )
                  ) : null}
                  {action === "convert" ? (
                    <Button type="button" size="sm" icon={<CalendarPlus size={14} />} onClick={() => { setActionError(null); setPending({ kind: "convert", issue }); }}>Zamień na sesję</Button>
                  ) : null}
                  {issue.externalCalendarEventId ? (
                    <Button type="button" variant="secondary" size="sm" icon={<EyeOff size={14} />} onClick={() => { setActionError(null); setPending({ kind: "ignore", issue }); }}>Ignoruj</Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pending?.kind === "convert" ? (
        <ConfirmDialog
          title="Zamienić wydarzenie na sesję?"
          description="Wydarzenie trafi do grafiku jako sesja, a uczestnikom zostaną rozliczone wejścia z pakietów. Później zmienisz to tylko przez korektę sesji."
          confirmLabel="Zamień i rozlicz wejścia"
          busyLabel="Zamienianie…"
          icon={<CalendarPlus size={20} />}
          busy={busy}
          error={actionError}
          onConfirm={() => void confirmAction()}
          onClose={closeDialog}
        >
          {pending.issue.title || pending.issue.startAt ? <p className="text-sm text-on-surface">{[pending.issue.title, formatIssueDate(pending.issue.startAt)].filter(Boolean).join(" · ")}</p> : null}
        </ConfirmDialog>
      ) : null}

      {pending?.kind === "ignore" ? (
        <ConfirmDialog
          title="Pominąć to zgłoszenie?"
          description="Zgłoszenie zniknie z listy. Sesje, wejścia i salda klientów pozostaną bez zmian."
          confirmLabel="Ignoruj"
          busyLabel="Zapisywanie…"
          icon={<EyeOff size={20} />}
          busy={busy}
          error={actionError}
          onConfirm={() => void confirmAction()}
          onClose={closeDialog}
        >
          <label className="block text-sm text-on-surface-variant">
            Notatka (opcjonalnie)
            <textarea value={ignoreNote} maxLength={500} rows={2} disabled={busy} onChange={event => setIgnoreNote(event.target.value)}
              placeholder="Np. wydarzenie prywatne, nie dotyczy treningu"
              className="mt-2 w-full resize-none rounded-[var(--radius-lg)] bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
