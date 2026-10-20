"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { CalendarDays } from "lucide-react";
import {
  formatDateTimeValue,
  formatDateValue,
  isWithinBounds,
  parseDateText,
  parseDateTimeText,
  splitDateTimeValue,
} from "@/app/lib/formatters/date-input";
import { DatePickerPanel } from "./date-picker-panel";
import { openNativePicker, PickerPanel, useNativePickerPreference, usePickerPopover } from "./picker-popover";

type DateFieldProps = InputHTMLAttributes<HTMLInputElement>;

// Writes through the native value setter so React fires the regular onChange of the hidden input.
function emitNativeValue(input: HTMLInputElement | null, value: string) {
  if (!input) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function boundsMessage(withTime: boolean, min?: string, max?: string) {
  const show = (bound: string) => withTime && bound.length > 10 ? formatDateTimeValue(bound.slice(0, 16)) : formatDateValue(bound.slice(0, 10));
  if (min && max) return `Wybierz termin od ${show(min)} do ${show(max)}.`;
  if (min) return `Wybierz termin nie wcześniejszy niż ${show(min)}.`;
  return max ? `Wybierz termin nie późniejszy niż ${show(max)}.` : "";
}

/**
 * Date and date-time field that always reads in Polish ("21.10.2026, 18:00"), whatever the browser
 * language. The real <input type="date|datetime-local"> stays mounted (hidden) and keeps the value
 * format and onChange events, so callers do not change. Mouse users type or use the ATLAS calendar;
 * touch devices open the system picker of the native input. type="month" keeps the native field.
 */
export const NativeDateInput = forwardRef<HTMLInputElement, DateFieldProps>(function NativeDateInput(props, forwardedRef) {
  if (props.type !== "date" && props.type !== "datetime-local") return <NativeMonthInput {...props} ref={forwardedRef} />;
  return <DateTextField {...props} ref={forwardedRef} />;
});

const NativeMonthInput = forwardRef<HTMLInputElement, DateFieldProps>(function NativeMonthInput({ className, ...props }, ref) {
  return <input {...props} ref={ref} className={["atlas-date-input", className].filter(Boolean).join(" ")} />;
});

const DateTextField = forwardRef<HTMLInputElement, DateFieldProps>(function DateTextField({
  type, value, onChange, onInput, name, form, step, min, max, required, disabled, readOnly,
  className, onKeyDown, onBlur, onClick, placeholder, ...rest
}, forwardedRef) {
  const withTime = type === "datetime-local";
  const current = typeof value === "string" ? value : value == null ? "" : String(value);
  const formatted = withTime ? formatDateTimeValue(current) : formatDateValue(current);
  const [draft, setDraft] = useState<{ base: string; text: string } | null>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const native = useNativePickerPreference();
  const { open, host, show, close, rootRef } = usePickerPopover();
  const panelId = useId();
  const locked = Boolean(disabled || readOnly);
  // A draft typed for an older value is dropped when the value changes from outside.
  const text = draft && draft.base === current ? draft.text : formatted || current;
  const parsedDraft = draft && draft.base === current ? (withTime ? parseDateTimeText(draft.text, current) : parseDateText(draft.text)) : undefined;
  const outOfBounds = (candidate: string) => Boolean(candidate) && !isWithinBounds(candidate, min === undefined ? undefined : String(min), max === undefined ? undefined : String(max));
  const validationMessage = parsedDraft === null
    ? withTime ? "Wpisz datę i godzinę, np. 21.10.2026, 18:00." : "Wpisz datę, np. 21.10.2026."
    : outOfBounds(parsedDraft ?? current) ? boundsMessage(withTime, min === undefined ? undefined : String(min), max === undefined ? undefined : String(max)) : "";

  useImperativeHandle(forwardedRef, () => textRef.current!);
  useEffect(() => { textRef.current?.setCustomValidity(validationMessage); }, [validationMessage]);

  function commit(nextText: string) {
    const parsed = withTime ? parseDateTimeText(nextText, current) : parseDateText(nextText);
    if (parsed === null || outOfBounds(parsed)) return false;
    setDraft(null);
    if (parsed !== current) emitNativeValue(nativeRef.current, parsed);
    return true;
  }

  function pick(date: string, time: string | null) {
    const next = withTime ? (time ? `${date}T${time}` : "") : date;
    const previous = splitDateTimeValue(current);
    // Re-selecting the same moment keeps exact seconds of the stored value.
    const unchanged = withTime && previous && `${previous.date}T${previous.time}` === next;
    setDraft(null);
    if (!unchanged && next !== current && !outOfBounds(next)) emitNativeValue(nativeRef.current, next);
    if (!withTime) { close(false); textRef.current?.focus(); }
  }

  function togglePicker() {
    if (locked) return;
    if (open) { close(); return; }
    if (native && openNativePicker(nativeRef.current)) return;
    show();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Enter" && draft && !commit(draft.text)) event.preventDefault();
    else if (event.key === "Escape" && (open || draft)) {
      // Closes the calendar or drops the draft without closing the surrounding modal.
      event.preventDefault();
      event.stopPropagation();
      if (open) close(false);
      else setDraft(null);
    } else if (event.key === "ArrowDown" && event.altKey) { event.preventDefault(); togglePicker(); }
  }

  const time = splitDateTimeValue(current);
  const pickerDate = withTime ? time?.date ?? "" : formatDateValue(current) ? current : "";

  return (
    <span ref={rootRef} className="atlas-date-control relative block w-full min-w-0">
      <input
        {...rest}
        ref={textRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={text}
        required={required}
        disabled={disabled}
        readOnly={readOnly || native}
        placeholder={placeholder ?? (withTime ? "dd.mm.rrrr, gg:mm" : "dd.mm.rrrr")}
        aria-invalid={rest["aria-invalid"] || (validationMessage ? true : undefined)}
        title={validationMessage || rest.title}
        onChange={(event) => setDraft({ base: current, text: event.target.value })}
        onBlur={(event) => { if (draft && draft.base === current) commit(draft.text); onBlur?.(event); }}
        onClick={(event) => { onClick?.(event); if (!event.defaultPrevented && native) togglePicker(); }}
        onKeyDown={handleKeyDown}
        className={["atlas-date-input", className].filter(Boolean).join(" ")}
      />
      <input
        ref={nativeRef}
        type={type}
        tabIndex={-1}
        aria-hidden="true"
        value={current}
        onChange={onChange}
        onInput={onInput}
        name={name}
        form={form}
        step={step}
        disabled={disabled}
        // Touch fields are read-only text (never validated), so the system picker input validates instead.
        required={native ? required : undefined}
        min={native ? min : undefined}
        max={native ? max : undefined}
        className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
      />
      <button type="button" aria-label="Otwórz kalendarz" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}
        disabled={locked}
        onClick={(event) => { event.preventDefault(); togglePicker(); }}
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-primary-light hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-primary-light disabled:cursor-not-allowed disabled:opacity-50">
        <CalendarDays size={18} aria-hidden="true" />
      </button>
      {host ? (
        <PickerPanel host={host} anchorRef={rootRef} id={panelId} label={withTime ? "Wybierz datę i godzinę" : "Wybierz datę"} onClose={(restore) => { close(false); if (restore) textRef.current?.focus(); }}>
          <DatePickerPanel
            date={pickerDate}
            time={time?.time ?? null}
            withTime={withTime}
            min={min === undefined ? undefined : String(min)}
            max={max === undefined ? undefined : String(max)}
            clearable={!required}
            onPick={pick}
            onClear={() => { setDraft(null); if (current) emitNativeValue(nativeRef.current, ""); close(false); textRef.current?.focus(); }}
            onDone={() => { close(false); textRef.current?.focus(); }}
          />
        </PickerPanel>
      ) : null}
    </span>
  );
});
