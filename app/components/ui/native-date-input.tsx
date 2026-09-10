"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";

export const NativeDateInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function NativeDateInput({ className, onClick, disabled, readOnly, ...props }, forwardedRef) {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => inputRef.current!);
    useEffect(() => {
      const input = inputRef.current;
      if (input && typeof input.showPicker !== "function") input.dataset.nativePickerFallback = "";
    }, []);
    function openPicker() {
      const input = inputRef.current;
      if (!input || input.disabled || input.readOnly) return;
      input.focus();
      try {
        if (typeof input.showPicker === "function") input.showPicker();
        else input.click();
      } catch {
        // Keep native keyboard editing and focus when the browser denies a picker.
      }
    }
    return <span className="atlas-date-control relative block min-w-0 w-full">
      <input {...props} ref={inputRef} disabled={disabled} readOnly={readOnly}
        className={["atlas-date-input", className].filter(Boolean).join(" ")}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && typeof event.currentTarget.showPicker === "function") openPicker();
        }} />
      <button type="button" aria-label="Otwórz kalendarz" disabled={disabled || readOnly}
        onClick={(event) => { event.preventDefault(); openPicker(); }}
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-primary-light hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-primary-light disabled:cursor-not-allowed disabled:opacity-50">
        <CalendarDays size={18} aria-hidden="true" />
      </button>
    </span>;
  },
);
