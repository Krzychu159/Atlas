"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const COARSE_POINTER = "(pointer: coarse)";

function subscribePointer(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(COARSE_POINTER);
  query.addEventListener?.("change", callback);
  return () => query.removeEventListener?.("change", callback);
}

// Touch devices keep the system picker (localized by the phone, comfortable wheels);
// mouse devices get the ATLAS popover, which is always in Polish.
export function prefersNativePicker() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(COARSE_POINTER).matches;
}

export function useNativePickerPreference() {
  return useSyncExternalStore(subscribePointer, prefersNativePicker, () => false);
}

// Opens the native picker of a hidden input. Returns false when the browser cannot do it.
export function openNativePicker(input: HTMLInputElement | null) {
  if (!input || input.disabled || input.readOnly || typeof input.showPicker !== "function") return false;
  try {
    input.showPicker();
    return true;
  } catch {
    return false;
  }
}

// The portal host is resolved when the picker opens: the open modal, or <body>.
export function usePickerPopover<TTrigger extends HTMLElement = HTMLButtonElement>() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<TTrigger>(null);
  const show = useCallback(() => {
    setHost(rootRef.current?.closest<HTMLElement>("[data-atlas-modal]") ?? document.body);
  }, []);
  const close = useCallback((restoreFocus = true) => {
    setHost(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);
  return { open: host !== null, host, show, close, rootRef, triggerRef };
}

const GAP = 8;
const panelStyle = { position: "fixed", top: 0, left: 0, visibility: "hidden" } as const;
const EDGE = 12;

// Floating panel rendered in a portal: inside the open modal (so its focus handling and stacking
// still apply) or in <body>. Fixed positioning keeps it outside clipped, scrollable modal bodies.
export function PickerPanel({ host, anchorRef, id, label, align = "start", onClose, children, className = "" }: {
  host: HTMLElement;
  anchorRef: RefObject<HTMLElement | null>;
  id: string;
  label: string;
  align?: "start" | "end";
  onClose: (restoreFocus?: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const rect = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const below = rect.bottom + GAP + height <= window.innerHeight - EDGE || rect.top - GAP - height < EDGE;
    const preferredLeft = align === "end" ? rect.right - width : rect.left;
    const left = Math.min(Math.max(EDGE, preferredLeft), Math.max(EDGE, window.innerWidth - width - EDGE));
    // When neither side has room, keep the whole panel on screen (it may then cover the field).
    const top = Math.min(below ? rect.bottom + GAP : rect.top - GAP - height, window.innerHeight - height - EDGE);
    // Positioned imperatively: it follows scrolling without re-rendering the picker.
    panel.style.top = `${Math.max(EDGE, top)}px`;
    panel.style.left = `${left}px`;
    panel.style.visibility = "visible";
    panel.dataset.placement = below ? "below" : "above";
  }, [anchorRef, align]);

  useLayoutEffect(() => { place(); }, [place]);

  useEffect(() => {
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [place, onClose, anchorRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Handled here so the surrounding modal neither closes (Escape) nor moves focus (Tab).
    if (event.key !== "Escape" && event.key !== "Tab") return;
    event.preventDefault();
    event.stopPropagation();
    onClose(true);
  }

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={label}
      data-atlas-picker=""
      onKeyDown={handleKeyDown}
      style={panelStyle}
      className={`z-[70] max-w-[calc(100vw-1.5rem)] rounded-[var(--radius-lg)] border border-white/10 bg-surface-container-high p-3 text-on-surface shadow-ambient ${className}`}
    >
      {children}
    </div>,
    host,
  );
}

export const pickerNavButtonClassName =
  "flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-primary-light transition hover:bg-white/5 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-40";

export const pickerFooterButtonClassName =
  "h-8 rounded-[var(--radius-md)] px-2.5 text-xs font-semibold text-primary-light transition hover:bg-white/5 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)]";
