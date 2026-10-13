"use client";

import { useId, useState } from "react";
import { dashboardMonth, revenueGeometry, type DashboardRevenue } from "@/app/lib/owner/dashboard-overview";
import { formatMoney } from "@/app/lib/formatters/money";
import styles from "./owner-overview.module.css";

export default function OverviewRevenueChart({ data }: { data: DashboardRevenue }) {
  const gradient = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const geometry = revenueGeometry(data.items);
  const active = selected ?? data.items.length - 1;
  const item = data.items[active];
  if (!item) return <div className={styles.chartEmpty}>Brak przychodów do wyświetlenia w tym okresie.</div>;
  return <div className={styles.chart}>
    <div className={styles.chartReadout} aria-live="polite" aria-atomic="true">
      <span>{dashboardMonth(item.period)}</span>
      <strong>{formatMoney(item.revenue, data.currency)}</strong>
    </div>
    <div className={styles.plotRow}>
      <div className={styles.yAxis} aria-hidden="true">{geometry.ticks.map(tick => <span key={tick} style={{ top: `${geometry.y(tick)}%` }}>{formatMoney(tick, data.currency)}</span>)}</div>
      <div className={styles.plot}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity=".25" /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity=".015" /></linearGradient></defs>
          {geometry.ticks.map(tick => <line key={tick} x1="0" x2="100" y1={geometry.y(tick)} y2={geometry.y(tick)} className={tick === 0 ? styles.zeroLine : styles.gridLine} vectorEffect="non-scaling-stroke" />)}
          <path d={geometry.area} fill={`url(#${gradient})`} />
          <path d={geometry.line} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {geometry.points.map((point, index) => <button key={data.items[index].period} type="button"
          className={`${styles.point} ${index === active ? styles.activePoint : ""} ${index === geometry.points.length - 1 ? styles.lastPoint : ""}`}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
          aria-label={`${dashboardMonth(data.items[index].period)}: ${formatMoney(data.items[index].revenue, data.currency)}${data.items[index].isPartial ? ", miesiąc w toku" : ""}`}
          aria-describedby={selected !== null && index === active ? `${gradient}-tooltip` : undefined}
          onFocus={() => setSelected(index)} onMouseEnter={() => setSelected(index)} onClick={() => setSelected(index)}
          onBlur={() => setSelected(null)} onMouseLeave={() => setSelected(null)}
          onKeyDown={event => {
            const next = event.key === "ArrowRight" ? Math.min(index + 1, data.items.length - 1) : event.key === "ArrowLeft" ? Math.max(index - 1, 0) : event.key === "Home" ? 0 : event.key === "End" ? data.items.length - 1 : null;
            if (next !== null) { event.preventDefault(); (event.currentTarget.parentElement?.querySelectorAll("button")[next] as HTMLButtonElement)?.focus(); }
            if (event.key === "Escape") { setSelected(null); event.currentTarget.blur(); }
          }} />)}
        {selected !== null ? <div role="tooltip" id={`${gradient}-tooltip`} className={styles.tooltip}
          style={{ left: `${Math.min(80, Math.max(20, geometry.points[active].x))}%`, top: `${Math.max(0, geometry.points[active].y - 16)}%` }}>
          {dashboardMonth(item.period)}<strong>{formatMoney(item.revenue, data.currency)}</strong>
        </div> : null}
      </div>
    </div>
    <div className={styles.xAxis} aria-hidden="true">{data.items.map((entry, index) => <span key={entry.period} className={index === active ? styles.selectedMonth : undefined} style={{ left: `${geometry.points[index].x}%` }}>{dashboardMonth(entry.period, true).replace(".", "")}</span>)}</div>
  </div>;
}
