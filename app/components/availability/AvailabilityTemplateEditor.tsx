"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Repeat } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { showAppInfo, showAppSuccess } from "@/app/components/ui/app-toast";
import { getErrorMessage } from "@/app/lib/backend";
import {
  saveAvailabilityTemplate,
  type AvailabilityTemplate,
  type AvailabilityTemplates,
} from "@/app/lib/availability";
import { addDaysIso, formatIsoDate, formatRanges, mondayOf, sortRanges, studioToday, weekdayName } from "@/app/lib/availability-time";
import { isDraftComplete, type DayDraft } from "@/app/lib/availability-days";
import { AvailabilityDayRow, CopyToNextDaysButton, TEMPLATE_DAY_MODES } from "./AvailabilityDayRow";

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

type Form = { validFrom: string; validUntil: string; days: Record<number, DayDraft> };

function lastSunday(lastPlannableDate: string) {
  const sunday = addDaysIso(mondayOf(lastPlannableDate), 6);
  return sunday > lastPlannableDate ? addDaysIso(sunday, -7) : sunday;
}

function clampUntil(value: string, validFrom: string, max: string) {
  const min = addDaysIso(validFrom, 6);
  return value < min ? min : value > max ? max : value;
}

function templateDays(template: AvailabilityTemplate | null): Record<number, DayDraft> {
  return Object.fromEntries(WEEK_DAYS.map((dayOfWeek) => {
    const ranges = template?.days.find((day) => day.dayOfWeek === dayOfWeek)?.ranges ?? [];
    return [dayOfWeek, ranges.length ? { mode: "Custom", ranges: sortRanges(ranges) } : { mode: "Off", ranges: [] }];
  }));
}

function formFor(data: AvailabilityTemplates, template: AvailabilityTemplate | null): Form {
  const max = lastSunday(data.lastPlannableDate);
  const validFrom = template && template.validFrom > data.firstOpenWeek ? template.validFrom : data.firstOpenWeek;
  const fallbackUntil = addDaysIso(validFrom, Math.max(1, data.defaultTemplateWeeks) * 7 - 1);
  return { validFrom, validUntil: clampUntil(template?.validUntil ?? fallbackUntil, validFrom, max), days: templateDays(template) };
}

/** The template in force in the first week that can still change, otherwise the next one. */
function initialTemplate(data: AvailabilityTemplates) {
  const upcoming = data.templates
    .filter((template) => template.validUntil >= data.firstOpenWeek)
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  return upcoming.find((template) => template.validFrom <= data.firstOpenWeek) ?? upcoming[0] ?? null;
}

function dateLabel(iso: string, currentYear: string) {
  return formatIsoDate(iso, !iso.startsWith(currentYear));
}

export function AvailabilityTemplateEditor({
  data,
  trainerId,
  isSelf = true,
  onSaved,
}: {
  data: AvailabilityTemplates;
  trainerId?: number;
  /** false when the owner sets another trainer's regular schedule. */
  isSelf?: boolean;
  onSaved: (data: AvailabilityTemplates) => void;
}) {
  const copy = isSelf
    ? { heading: "Twoje stałe godziny", none: "Nie masz jeszcze stałego grafiku.", outlook: "w Twoim kalendarzu Outlook", ended: "nie masz stałego grafiku", endInfo: "nie będziesz mieć stałych godzin — każdy tydzień uzupełnisz wtedy sam" }
    : { heading: "Stałe godziny trenera", none: "Trener nie ma jeszcze stałego grafiku.", outlook: "w kalendarzu Outlook trenera", ended: "trener nie ma stałego grafiku", endInfo: "trener nie będzie mieć stałych godzin — każdy tydzień trzeba będzie uzupełnić osobno" };
  const [form, setForm] = useState<Form>(() => formFor(data, initialTemplate(data)));
  const [dialog, setDialog] = useState<"save" | "end" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = studioToday();
  const year = today.slice(0, 4);
  const maxUntil = lastSunday(data.lastPlannableDate);

  const fromOptions = useMemo(() => {
    const options = [];
    for (let monday = data.firstOpenWeek; monday <= maxUntil; monday = addDaysIso(monday, 7)) {
      options.push({ value: monday, label: `od pon. ${dateLabel(monday, year)}` });
    }
    return options;
  }, [data.firstOpenWeek, maxUntil, year]);

  const untilOptions = useMemo(() => {
    const options = [];
    for (let sunday = addDaysIso(form.validFrom, 6); sunday <= maxUntil; sunday = addDaysIso(sunday, 7)) {
      const weeks = Math.round((Date.parse(sunday) - Date.parse(form.validFrom)) / (7 * 864e5) + 1 / 7);
      options.push({ value: sunday, label: `do ndz. ${dateLabel(sunday, year)} · ${weeks} tyg.` });
    }
    return options;
  }, [form.validFrom, maxUntil, year]);

  const periods = data.templates
    .filter((template) => template.validUntil >= mondayOf(today))
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const incomplete = WEEK_DAYS.some((day) => !isDraftComplete(form.days[day]));
  const hasHours = WEEK_DAYS.some((day) => form.days[day].mode === "Custom");

  function setDay(dayOfWeek: number, draft: DayDraft) {
    setError(null);
    setForm((current) => ({ ...current, days: { ...current.days, [dayOfWeek]: draft } }));
  }

  async function save(end: boolean) {
    setSaving(true);
    setError(null);
    try {
      const next = await saveAvailabilityTemplate({
        trainerId,
        validFrom: form.validFrom,
        validUntil: end ? undefined : form.validUntil,
        days: end ? [] : WEEK_DAYS.map((dayOfWeek) => ({
          dayOfWeek,
          ranges: form.days[dayOfWeek].mode === "Custom" ? sortRanges(form.days[dayOfWeek].ranges) : [],
        })),
      });
      setDialog(null);
      if (end) {
        showAppInfo(`Od ${dateLabel(form.validFrom, year)} ${copy.ended}`);
        setForm(formFor(next, null));
      } else {
        showAppSuccess(`Stały grafik obowiązuje od ${dateLabel(form.validFrom, year)}`);
      }
      onSaved(next);
    } catch (err) {
      setError(getErrorMessage(err, "Nie udało się zapisać stałego grafiku. Sprawdź godziny i spróbuj ponownie."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <section className="space-y-4">
        <div className="card-shell flex flex-col gap-4 p-4 md:p-5">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/10 text-primary-light"><Repeat size={20} aria-hidden="true" /></span>
            <div>
              <h2 className="text-base font-semibold text-on-surface">{copy.heading}</h2>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                Powtarzają się co tydzień. Każdy tydzień i tak możesz dopasować przed potwierdzeniem.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <CustomSelect
              ariaLabel="Obowiązuje od"
              value={form.validFrom}
              options={fromOptions}
              icon={<CalendarRange size={16} />}
              onChange={(validFrom) => setForm((current) => ({
                ...current,
                validFrom,
                validUntil: clampUntil(current.validUntil, validFrom, maxUntil),
              }))}
            />
            <CustomSelect
              ariaLabel="Obowiązuje do"
              value={form.validUntil}
              options={untilOptions}
              icon={<CalendarRange size={16} />}
              onChange={(validUntil) => setForm((current) => ({ ...current, validUntil }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          {WEEK_DAYS.map((dayOfWeek) => {
            const draft = form.days[dayOfWeek];
            return (
              <AvailabilityDayRow
                key={dayOfWeek}
                weekday={weekdayName(dayOfWeek)}
                draft={draft}
                modes={TEMPLATE_DAY_MODES}
                onChange={(next) => setDay(dayOfWeek, next)}
                action={dayOfWeek < 7 && isDraftComplete(draft) ? (
                  <CopyToNextDaysButton weekday={weekdayName(dayOfWeek)} onCopy={() => setForm((current) => ({
                    ...current,
                    days: { ...current.days, ...Object.fromEntries(WEEK_DAYS.filter((day) => day > dayOfWeek).map((day) => [day, draft])) },
                  }))} />
                ) : null}
              />
            );
          })}
        </div>

        {error ? <p role="alert" className="text-sm text-error-light">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {periods.length ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setError(null); setDialog("end"); }}>
              Zakończ stały grafik od {dateLabel(form.validFrom, year)}
            </Button>
          ) : <span />}
          <Button
            type="button"
            onClick={() => {
              if (incomplete) return setError("Popraw godziny w zaznaczonych dniach albo ustaw je jako „Brak dyspozycji”.");
              if (!hasHours) return setError("Dodaj godziny przynajmniej w jednym dniu.");
              setError(null);
              setDialog("save");
            }}
          >
            Zapisz stały grafik
          </Button>
        </div>
      </section>

      <aside className="card-shell p-4 md:p-5">
        <h2 className="text-section-title">Okresy</h2>
        {periods.length ? (
          <ul className="mt-3 space-y-2">
            {periods.map((template) => {
              const current = template.validFrom <= today && template.validUntil >= today;
              const editable = template.validUntil >= data.firstOpenWeek;
              return (
                <li key={template.id} className="rounded-[var(--radius-lg)] bg-surface-container-low p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-on-surface">
                      {dateLabel(template.validFrom, year)} – {dateLabel(template.validUntil, year)}
                    </p>
                    {current ? <span className="shrink-0 rounded-full bg-tertiary-container/60 px-2 py-0.5 text-[11px] font-semibold text-tertiary-light">Teraz</span> : null}
                  </div>
                  <ul className="mt-2 space-y-0.5 text-xs leading-5 text-on-surface-variant">
                    {WEEK_DAYS.map((dayOfWeek) => {
                      const ranges = template.days.find((day) => day.dayOfWeek === dayOfWeek)?.ranges ?? [];
                      return (
                        <li key={dayOfWeek} className="flex justify-between gap-2">
                          <span>{weekdayName(dayOfWeek, true)}</span>
                          <span className={`text-right tabular-nums ${ranges.length ? "" : "text-on-surface-muted"}`}>{ranges.length ? formatRanges(ranges) : "brak dyspozycji"}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {editable ? (
                    <button type="button" onClick={() => { setError(null); setForm(formFor(data, template)); }} className="mt-2 text-xs font-semibold text-primary-light hover:underline">
                      Edytuj ten okres
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            {copy.none} Ustaw godziny obok i zapisz — od wybranego tygodnia będą podstawą każdego tygodnia.
          </p>
        )}
        <p className="mt-4 text-xs leading-5 text-on-surface-muted">
          Dyspozycja pojawia się też {copy.outlook} jako szare wydarzenia „Dyspozycja”.
        </p>
      </aside>

      {dialog === "save" ? (
        <ConfirmDialog
          title="Zapisać stały grafik?"
          description={`Obowiązuje od ${dateLabel(form.validFrom, year)} do ${dateLabel(form.validUntil, year)} i zastąpi dotychczasowe godziny w tym okresie. Tygodnie już potwierdzone zostają bez zmian.`}
          confirmLabel="Zapisz"
          busyLabel="Zapisuję…"
          icon={<Repeat size={20} />}
          busy={saving}
          error={error}
          onConfirm={() => void save(false)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "end" ? (
        <ConfirmDialog
          title="Zakończyć stały grafik?"
          description={`Od ${dateLabel(form.validFrom, year)} ${copy.endInfo}. Tygodnie już potwierdzone zostają bez zmian.`}
          confirmLabel="Zakończ grafik"
          busyLabel="Zapisuję…"
          tone="danger"
          busy={saving}
          error={error}
          onConfirm={() => void save(true)}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
