"use client";

import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import { FieldDensityProvider } from "./field-density";

const DIALOG_SELECTOR = "[role=\"dialog\"], [role=\"alertdialog\"]";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled):not([type=\"hidden\"])",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "summary",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

const modalStack: HTMLElement[] = [];
let scrollLockCount = 0;
let overflowBeforeLock = "";

/** Locks page scrolling. Locks are counted, so closing an inner window keeps the outer one locked. */
export function lockBodyScroll() {
  if (scrollLockCount === 0) {
    overflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) document.body.style.overflow = overflowBeforeLock;
  };
}

function isVisible(element: HTMLElement) {
  return element.getClientRects().length > 0;
}

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => isVisible(element) && !element.closest("[inert]"),
  );
}

function getPanel(overlay: HTMLElement) {
  return Array.from(overlay.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute("data-modal-backdrop"),
  );
}

function getDialog(overlay: HTMLElement) {
  return overlay.querySelector<HTMLElement>(DIALOG_SELECTOR) ?? getPanel(overlay) ?? null;
}

const ModalCloseContext = createContext<{ closeDisabled: boolean }>({ closeDisabled: false });

type ModalOverlayProps = {
  children: React.ReactNode;
  /** Omit it (or pass `closeDisabled`) while saving: Escape, the backdrop and the X button then do nothing. */
  onClose?: () => void;
  closeDisabled?: boolean;
  /** Set to false for windows that already move and trap focus themselves. */
  manageFocus?: boolean;
  className?: string;
};

export function ModalOverlay({
  children,
  onClose,
  closeDisabled,
  manageFocus = true,
  className,
}: ModalOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const locked = Boolean(closeDisabled) || !onClose;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScroll = lockBodyScroll();
    modalStack.push(overlay);

    const panel = getPanel(overlay);
    if (panel && !overlay.querySelector(DIALOG_SELECTOR)) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
    }
    const dialog = overlay.querySelector<HTMLElement>(DIALOG_SELECTOR);
    if (dialog && !dialog.hasAttribute("aria-label") && !dialog.hasAttribute("aria-labelledby")) {
      const title = dialog.querySelector<HTMLElement>("[data-modal-title]");
      if (title?.id) dialog.setAttribute("aria-labelledby", title.id);
    }

    if (manageFocus && dialog) {
      if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
      dialog.classList.add("outline-none");
      // Focusing the window itself (not its first field) announces its name and avoids popping the phone keyboard.
      if (!dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
    }

    return () => {
      const index = modalStack.lastIndexOf(overlay);
      if (index >= 0) modalStack.splice(index, 1);
      releaseScroll();
      if (manageFocus && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [manageFocus]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const overlay = overlayRef.current;
    if (!overlay || event.defaultPrevented || modalStack[modalStack.length - 1] !== overlay) return;

    if (event.key === "Escape") {
      if (!manageFocus) return;
      event.preventDefault();
      if (!locked) onCloseRef.current?.();
      return;
    }

    if (event.key !== "Tab" || !manageFocus) return;
    const dialog = getDialog(overlay);
    if (!dialog) return;

    const elements = focusableElements(dialog);
    const active = document.activeElement;
    if (!elements.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    if (!dialog.contains(active) || active === dialog) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={overlayRef}
      data-atlas-modal=""
      onKeyDown={handleKeyDown}
      className={[
        "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overflow-x-hidden overscroll-contain bg-black/70 p-3 md:p-4 [&>*]:my-auto",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-modal-backdrop=""
        onClick={locked ? undefined : onClose}
        className="absolute inset-0 cursor-default"
      />
      <ModalCloseContext.Provider value={{ closeDisabled: locked }}>
        <FieldDensityProvider value="compact">{children}</FieldDensityProvider>
      </ModalCloseContext.Provider>
    </div>
  );
}

type ModalHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconTone?: "primary" | "danger";
  onClose: () => void;
  className?: string;
};

export function ModalHeader({
  eyebrow,
  title,
  description,
  icon,
  iconTone = "primary",
  onClose,
  className,
}: ModalHeaderProps) {
  const titleId = useId();

  return (
    <div
      className={["flex items-start justify-between gap-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">
        {icon ? (
          <div
            className={[
              "mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] md:mb-4 md:h-11 md:w-11",
              iconTone === "danger"
                ? "bg-error-container text-on-error-container"
                : "bg-primary/15 text-primary-light",
            ].join(" ")}
          >
            {icon}
          </div>
        ) : null}
        {eyebrow ? (
          <p className="text-label text-primary-light">{eyebrow}</p>
        ) : null}
        <h2 id={titleId} data-modal-title="" className="mt-1 break-words text-lg font-semibold text-on-surface md:text-xl">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-[560px] text-sm leading-5 text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      <ModalCloseButton onClose={onClose} />
    </div>
  );
}

export function ModalCloseButton({ onClose, disabled }: { onClose: () => void; disabled?: boolean }) {
  const { closeDisabled } = useContext(ModalCloseContext);

  return (
    <button
      type="button"
      onClick={onClose}
      disabled={disabled ?? closeDisabled}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-muted transition hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Zamknij"
    >
      <X size={18} />
    </button>
  );
}

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "sticky bottom-0 flex flex-col-reverse gap-2 border-t border-white/5 bg-surface-container px-4 py-3 sm:flex-row sm:justify-end md:px-6 md:py-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
