"use client";

export default function SessionToggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <span className="relative inline-flex shrink-0 items-center py-2">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} disabled={disabled}
        onChange={event => onChange(event.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className="relative h-7 w-12 rounded-full bg-surface-bright ring-1 ring-white/10 transition-colors peer-checked:bg-primary peer-checked:ring-primary-light/25 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-light peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-container-low peer-disabled:opacity-50 motion-reduce:transition-none">
        <span className={"absolute left-1 top-1 h-5 w-5 rounded-full bg-on-surface-variant shadow-sm transition-transform motion-reduce:transition-none" + (checked ? " translate-x-5" : "")} />
      </span>
    </span>
  );
}
