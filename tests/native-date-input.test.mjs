import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { load, hooks, find } from "./owner-read-harness.mjs";

const dates = load("app/lib/formatters/date-input.ts");
const months = load("app/lib/formatters/month.ts");
const plain = value => JSON.parse(JSON.stringify(value));

test("dates and date-times are shown in Polish regardless of the browser language", () => {
  assert.equal(dates.formatDateValue("2026-10-21"), "21.10.2026");
  assert.equal(dates.formatDateTimeValue("2026-10-21T08:05"), "21.10.2026, 08:05");
  assert.equal(dates.formatDateTimeValue("2026-10-21T08:05:42.120"), "21.10.2026, 08:05");
  assert.equal(dates.formatDateValue("2026-02-30"), "");
  assert.equal(dates.formatDayLabel("2026-10-21"), "środa, 21 października 2026");
  assert.equal(dates.formatCalendarTitle(2026, 10), "Październik 2026");
});

test("typed dates accept common Polish notations and reject impossible days", () => {
  for (const text of ["21.10.2026", "21-10-2026", "21/10/2026", "21 10 2026", "21102026", "21.10.26", "2026-10-21", " 21.10.2026 "]) {
    assert.equal(dates.parseDateText(text), "2026-10-21", text);
  }
  assert.equal(dates.parseDateText("1.2.2026"), "2026-02-01");
  assert.equal(dates.parseDateText("29.02.2028"), "2028-02-29");
  for (const text of ["29.02.2026", "32.01.2026", "10.13.2026", "21.10", "jutro", "21.10.202"]) assert.equal(dates.parseDateText(text), null, text);
  assert.equal(dates.parseDateText(""), "");
});

test("typed times are 24-hour and keep exact minutes", () => {
  assert.deepEqual(["18:00", "18.00", "1800", "800", "8", "08:07", "23:59"].map(dates.parseTimeText), ["18:00", "18:00", "18:00", "08:00", "08:00", "08:07", "23:59"]);
  for (const text of ["24:00", "18:60", "6pm", "18:5"]) assert.equal(dates.parseTimeText(text), null, text);
});

test("typed date-times keep the previous time and exact seconds of an unchanged moment", () => {
  assert.equal(dates.parseDateTimeText("21.10.2026, 18:00"), "2026-10-21T18:00");
  assert.equal(dates.parseDateTimeText("21.10.2026 1800"), "2026-10-21T18:00");
  assert.equal(dates.parseDateTimeText("21 10 2026 18:00"), "2026-10-21T18:00");
  assert.equal(dates.parseDateTimeText("22.10.2026", "2026-10-21T07:30"), "2026-10-22T07:30", "only the day changed");
  assert.equal(dates.parseDateTimeText("21 10 2026", "2026-10-21T07:30"), "2026-10-21T07:30");
  assert.equal(dates.parseDateTimeText("21.10.2026, 09:15", "2026-10-21T09:15:42.120"), "2026-10-21T09:15:42.120");
  assert.equal(dates.parseDateTimeText("21.10.2026, 09:16", "2026-10-21T09:15:42.120"), "2026-10-21T09:16");
  assert.equal(dates.parseDateTimeText("31.02.2026, 10:00"), null);
  assert.equal(dates.parseDateTimeText(""), "");
});

test("bounds compare dates with date-time limits and date-times with date limits", () => {
  assert.equal(dates.isWithinBounds("2026-10-21", "2026-10-21"), true);
  assert.equal(dates.isWithinBounds("2026-10-20", "2026-10-21"), false);
  assert.equal(dates.isWithinBounds("2026-10-21T08:00", "2026-10-21"), true);
  assert.equal(dates.isWithinBounds("2026-10-21T09:15", undefined, "2026-10-21T09:15:00.000"), true);
  assert.equal(dates.isWithinBounds("2026-10-21T09:16", undefined, "2026-10-21T09:15:00.000"), false);
  assert.equal(dates.isWithinBounds("", "2030-01-01"), true, "an empty value is left to required");
});

test("calendar months start on Monday and cover six weeks", () => {
  const days = dates.calendarMonthDays(2026, 10);
  assert.equal(days.length, 42);
  assert.equal(days[0].value, "2026-09-28", "1 October 2026 is a Thursday");
  assert.equal(days.find(day => day.value === "2026-10-01").inMonth, true);
  assert.equal(days.at(-1).value, "2026-11-08");
  assert.equal(dates.shiftDateMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(dates.shiftDateValue("2026-12-31", 1), "2027-01-01");
});

test("month values format in Polish and move across years", () => {
  assert.equal(months.formatMonthValue("2026-10"), "Październik 2026");
  assert.equal(months.formatMonthValue("0001-01"), "Styczeń 1");
  assert.equal(months.formatMonthValue("2026-13"), "Wybierz miesiąc");
  assert.equal(months.shiftMonthValue("2026-12", 1), "2027-01");
  assert.equal(months.shiftMonthValue("2026-01", -1), "2025-12");
  assert.equal(months.isMonthInRange("2026-11", "2000-01", "2026-10"), false);
  assert.deepEqual(plain(months.polishMonthNames.map(item => item.short)), ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"]);
});

test("minutes are offered every 5 and an exact stored minute stays selectable", () => {
  const panel = load("app/components/ui/date-picker-panel.tsx");
  assert.equal(panel.minuteOptions().length, 12);
  assert.deepEqual(plain(panel.minuteOptions(7).slice(0, 4)), [0, 5, 7, 10]);
  assert.equal(panel.defaultPickerTime(new Date(2026, 9, 20, 8, 1)), "08:05");
  assert.equal(panel.defaultPickerTime(new Date(2026, 9, 20, 23, 58)), "23:55");
});

class FakeInputBase { set value(next) { this.written = next; } }
class FakeEvent { constructor(type, options) { this.type = type; this.bubbles = options?.bubbles; } }

function field(props, { native = false } = {}) {
  const h = hooks(), calls = { shown: 0, nativeOpened: 0, events: [] };
  const mod = load("app/components/ui/native-date-input.tsx", {
    react: { ...h.react, useId: () => "picker", useImperativeHandle() {}, forwardRef: render => ({ render }) },
    "./picker-popover": {
      useNativePickerPreference: () => native,
      openNativePicker: () => { calls.nativeOpened++; return true; },
      usePickerPopover: () => ({ open: false, host: null, show: () => { calls.shown++; }, close() {}, rootRef: { current: null } }),
      PickerPanel: () => null,
    },
    "lucide-react": { CalendarDays: () => null },
    "@/app/lib/formatters/date-input": dates,
  }, { HTMLInputElement: FakeInputBase, Event: FakeEvent });
  const render = next => {
    const outer = mod.NativeDateInput.render({ ...props, ...next }, null);
    return outer.type.render(outer.props, null);
  };
  const nativeInput = Object.assign(Object.create(FakeInputBase.prototype), { dispatchEvent: event => calls.events.push(event) });
  const tree = () => { const result = h.render(render); h.commit(); return result; };
  const parts = result => ({
    text: find(result, node => node.type === "input" && node.props.type === "text"),
    native: find(result, node => node.type === "input" && node.props.type !== "text"),
    button: find(result, node => node.type === "button"),
  });
  return { h, tree, parts, calls, nativeInput, render };
}

test("the visible field reads in Polish while the native input keeps the value and onChange", () => {
  const onChange = () => {};
  const { tree, parts } = field({ type: "datetime-local", value: "2026-10-21T18:00", onChange, required: true, name: "startAt" });
  const { text, native, button } = parts(tree());
  assert.equal(text.props.value, "21.10.2026, 18:00");
  assert.equal(text.props.required, true);
  assert.equal(text.props.placeholder, "dd.mm.rrrr, gg:mm");
  assert.equal(native.props.type, "datetime-local");
  assert.equal(native.props.value, "2026-10-21T18:00");
  assert.equal(native.props.onChange, onChange);
  assert.equal(native.props.name, "startAt");
  assert.equal(native.props.tabIndex, -1);
  assert.equal(native.props.required, undefined, "on desktop the visible field validates");
  assert.equal(button.props["aria-label"], "Otwórz kalendarz");
});

test("mouse users open the ATLAS calendar; touch devices open the system picker", () => {
  const desktop = field({ type: "date", value: "2026-10-21", onChange() {} });
  desktop.parts(desktop.tree()).button.props.onClick({ preventDefault() {} });
  assert.deepEqual([desktop.calls.shown, desktop.calls.nativeOpened], [1, 0]);
  const phone = field({ type: "date", value: "2026-10-21", onChange() {}, required: true }, { native: true });
  const { text, native, button } = phone.parts(phone.tree());
  assert.equal(text.props.readOnly, true, "no on-screen keyboard on phones");
  assert.equal(native.props.required, true, "the system picker input validates on touch");
  button.props.onClick({ preventDefault() {} });
  text.props.onClick({ defaultPrevented: false });
  assert.deepEqual([phone.calls.shown, phone.calls.nativeOpened], [0, 2]);
});

test("disabled and read-only fields never open a picker", () => {
  for (const key of ["disabled", "readOnly"]) {
    const { tree, parts, calls } = field({ type: "date", value: "", onChange() {}, [key]: true });
    const { button } = parts(tree());
    assert.equal(button.props.disabled, true);
    button.props.onClick({ preventDefault() {} });
    assert.equal(calls.shown + calls.nativeOpened, 0);
  }
});

test("typing commits on blur through the native input; invalid text is flagged and not committed", () => {
  const { tree, parts, calls, nativeInput } = field({ type: "date", value: "2026-10-21", onChange() {}, min: "2026-10-01" });
  let current = parts(tree());
  current.native.props.ref.current = nativeInput;
  current.text.props.onChange({ target: { value: "22.10.2026" } });
  current = parts(tree());
  assert.equal(current.text.props.value, "22.10.2026");
  current.text.props.onBlur({});
  assert.equal(nativeInput.written, "2026-10-22");
  assert.equal(calls.events.length, 1);
  assert.equal(calls.events[0].type, "input");
  assert.equal(calls.events[0].bubbles, true);

  current = parts(tree());
  current.text.props.onChange({ target: { value: "31.02.2026" } });
  current = parts(tree());
  assert.equal(current.text.props["aria-invalid"], true);
  assert.match(current.text.props.title, /Wpisz datę/);
  current.text.props.onBlur({});
  assert.equal(calls.events.length, 1, "an impossible date is never sent");

  current.text.props.onChange({ target: { value: "01.09.2026" } });
  current = parts(tree());
  assert.match(current.text.props.title, /nie wcześniejszy niż 01\.10\.2026/);
  current.text.props.onBlur({});
  assert.equal(calls.events.length, 1, "a date before min is never sent");
});

test("Enter with an invalid draft does not submit the form; Escape drops the draft without closing a modal", () => {
  const { tree, parts } = field({ type: "date", value: "2026-10-21", onChange() {} });
  let current = parts(tree());
  current.text.props.onChange({ target: { value: "abc" } });
  current = parts(tree());
  let prevented = false;
  current.text.props.onKeyDown({ key: "Enter", defaultPrevented: false, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  let stopped = false;
  current.text.props.onKeyDown({ key: "Escape", defaultPrevented: false, preventDefault() {}, stopPropagation() { stopped = true; } });
  assert.equal(stopped, true);
  assert.equal(parts(tree()).text.props.value, "21.10.2026");
});

test("month inputs keep the native field", () => {
  const mod = load("app/components/ui/native-date-input.tsx", { react: { ...React, forwardRef: render => ({ render }) } });
  const outer = mod.NativeDateInput.render({ type: "month", value: "2026-10" }, null);
  const input = outer.type.render(outer.props, null);
  assert.equal(input.type, "input");
  assert.equal(input.props.type, "month");
});
