"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { CustomSelect } from "@/app/components/ui/custom-select";
import type { ActivityLogResponse } from "@/app/lib/owner/activity-log";

export function ActivityPagination({ data, onPageChange, onPageSizeChange }: {
  data: ActivityLogResponse; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  const { page, pageSize, totalCount, totalPages } = data;
  const pages = [...new Set([1, page - 1, page, page + 1, Math.min(totalPages, 100000)])].filter((n) => n >= 1 && n <= totalPages && n <= 100000);
  return <nav aria-label="Paginacja historii zmian" className="flex flex-col gap-3 bg-surface-container-low px-4 py-4 md:px-5 xl:flex-row xl:items-center xl:justify-between">
    <p className="text-xs text-on-surface-muted">Pokazano <strong className="text-on-surface-variant">{totalCount ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalCount)}</strong> z <strong className="text-on-surface-variant">{totalCount}</strong> wpisów</p>
    <div className="flex flex-wrap items-center gap-3">
      <CustomSelect label="Wpisów na stronie" value={String(pageSize)} options={[25, 50, 100].map((n) => ({ value: String(n), label: String(n) }))} onChange={(next) => onPageSizeChange(Number(next))} className="w-40" />
      <div className="flex items-center gap-1.5">
        <PageButton label="Poprzednia strona" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={16} /></PageButton>
        {pages.map((n, i) => <span key={n} className="contents">{i > 0 && n - pages[i - 1] > 1 ? <span className="text-on-surface-muted">…</span> : null}<PageButton label={`Strona ${n}`} active={page === n} onClick={() => onPageChange(n)}>{n}</PageButton></span>)}
        <PageButton label="Następna strona" disabled={page >= totalPages || page >= 100000} onClick={() => onPageChange(page + 1)}><ChevronRight size={16} /></PageButton>
      </div>
    </div>
  </nav>;
}

function PageButton({ label, disabled, active, onClick, children }: {
  label: string; disabled?: boolean; active?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return <button type="button" aria-label={label} aria-current={active ? "page" : undefined} disabled={disabled} onClick={onClick} className={`flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${active ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>{children}</button>;
}
