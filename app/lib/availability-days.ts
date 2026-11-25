import type { AvailabilityDayMode, AvailabilityRange, AvailabilityWeekDay } from "./availability";
import { rangesAreValid, sameRanges, sortRanges } from "./availability-time";

/** What a day is set to in a form: "jak zwykle", own hours or "brak dyspozycji". */
export type DayDraft = { mode: AvailabilityDayMode; ranges: AvailabilityRange[] };

/** A day can be saved once its own hours are complete; "Inne godziny" needs at least one valid range. */
export function isDraftComplete(draft: DayDraft) {
  return draft.mode !== "Custom" || (draft.ranges.length > 0 && rangesAreValid(draft.ranges));
}

/** The body sent for a day: hours only matter for "Inne godziny". */
export function toDayPayload(draft: DayDraft) {
  return { mode: draft.mode, ranges: draft.mode === "Custom" ? sortRanges(draft.ranges) : [] };
}

export function sameDraft(a: DayDraft, b: DayDraft) {
  return a.mode === b.mode && (a.mode !== "Custom" || sameRanges(a.ranges, b.ranges));
}

/**
 * The draft a day starts from. A locked week keeps its own copy of the hours, so a locked day reads
 * as "jak zwykle" only while that copy still matches the regular schedule.
 */
export function dayDraft(day: AvailabilityWeekDay): DayDraft {
  if (day.mode !== "Locked") return { mode: day.mode, ranges: day.mode === "Custom" ? day.ranges : [] };
  if (sameRanges(day.ranges, day.templateRanges)) return { mode: "Template", ranges: [] };
  return day.ranges.length ? { mode: "Custom", ranges: day.ranges } : { mode: "Off", ranges: [] };
}

/** The hours a day ends up with ("jak zwykle" takes the regular schedule). */
export function draftRanges(draft: DayDraft, templateRanges: AvailabilityRange[]) {
  return draft.mode === "Template" ? templateRanges : draft.mode === "Off" ? [] : draft.ranges;
}
