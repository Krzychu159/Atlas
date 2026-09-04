"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PaymentPaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function PaymentPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: PaymentPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <nav
      aria-label="Paginacja płatności"
      className="flex flex-col gap-3 bg-surface-container-low px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5"
    >
      <p className="text-xs text-on-surface-muted">
        Pokazano <strong className="font-semibold text-on-surface-variant">{firstItem}–{lastItem}</strong> z{" "}
        <strong className="font-semibold text-on-surface-variant">{totalItems}</strong> płatności
      </p>

      <div className="flex items-center gap-1.5">
        <PageButton
          label="Poprzednia strona"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </PageButton>
        {visiblePages.map((pageNumber, index) => {
          const previousPage = visiblePages[index - 1];
          const showEllipsis = previousPage && pageNumber - previousPage > 1;

          return (
            <span key={pageNumber} className="contents">
              {showEllipsis ? (
                <span className="flex h-9 min-w-6 items-center justify-center text-xs text-on-surface-muted">
                  …
                </span>
              ) : null}
              <PageButton
                label={`Strona ${pageNumber}`}
                active={pageNumber === page}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </PageButton>
            </span>
          );
        })}
        <PageButton
          label="Następna strona"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-30",
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const candidates = [1, page - 1, page, page + 1, totalPages];

  return [...new Set(candidates)].filter(
    (candidate) => candidate >= 1 && candidate <= totalPages,
  );
}
