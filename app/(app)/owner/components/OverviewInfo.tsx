"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import styles from "./owner-overview.module.css";

export default function OverviewInfo({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className={styles.info} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" aria-label={label} aria-describedby={id} className={styles.infoButton}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); } }}>
      <Info size={14} aria-hidden="true" />
    </button>
    <span id={id} role="tooltip" hidden={!open} className={styles.infoTooltip}>{children}</span>
  </span>;
}
