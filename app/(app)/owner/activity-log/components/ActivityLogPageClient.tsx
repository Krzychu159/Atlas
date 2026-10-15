"use client";

import { useCallback, useEffect, useState } from "react";
import { usePaymentDateCorrectionRevision } from "@/app/lib/session-corrections";
import { CircleAlert, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ListSection } from "@/app/components/ui/list/ListSection";
import { ListState } from "@/app/components/ui/list/ListState";
import { activityErrorMessage, defaultActivityFilters, getActivityLog, getActivityLogMetadata, validateActivityFilters, type ActivityFilters as Filters, type ActivityLogEntry, type ActivityLogMetadata, type ActivityLogResponse } from "@/app/lib/owner/activity-log";
import { showOwnerError } from "../../components/owner-toast";
import { ActivityFilters } from "./ActivityFilters";
import { ActivityList } from "./ActivityList";
import { ActivityDetails } from "./ActivityDetails";
import { ActivityPagination } from "./ActivityPagination";

export function ActivityLogPageClient() {
  const paymentDateRevision = usePaymentDateCorrectionRevision();
  const [filters, setFilters] = useState<Filters>(defaultActivityFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [revision, setRevision] = useState(0);
  const [metadataRevision, setMetadataRevision] = useState(0);
  const [metadata, setMetadata] = useState<ActivityLogMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [data, setData] = useState<ActivityLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ActivityLogEntry | null>(null);
  const validation = validateActivityFilters(filters);
  const closeDetails = useCallback(() => setSelected(null), []);

  useEffect(() => {
    const controller = new AbortController();
    getActivityLogMetadata(controller.signal).then((result) => {
      if (!controller.signal.aborted) { setMetadata(result); setMetadataError(null); }
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      const message = activityErrorMessage(err);
      setMetadataError(message);
      showOwnerError(new Error(message), message, { id: "activity-metadata-error" });
    });
    return () => controller.abort();
  }, [metadataRevision]);

  useEffect(() => {
    if (validation) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getActivityLog(filters, page, pageSize, controller.signal);
        if (controller.signal.aborted) return;
        if (result.totalPages > 0 && page > result.totalPages) {
          setPage(Math.min(result.totalPages, 100000));
          return;
        }
        setData(result);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = activityErrorMessage(err);
        setData(null);
        setError(message);
        showOwnerError(new Error(message), message, { id: "activity-load-error" });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filters, page, pageSize, revision, validation, paymentDateRevision]);

  function changeFilters(next: Filters) {
    setFilters({ ...next }); setPage(1); setData(null); setError(null); setLoading(true);
  }
  function refresh() { setLoading(true); setData(null); setError(null); setRevision((current) => current + 1); }
  const message = validation ?? error;

  return <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-label text-primary-light">Panel właściciela</p><h1 className="mt-2 font-display text-[1.75rem] md:text-[2.25rem] font-semibold leading-[0.95] tracking-tight">Historia zmian</h1><p className="mt-3 text-sm leading-6 text-on-surface-variant">Sprawdź, kto i jakie zmiany wprowadził w studiu.</p></div>
      <Button variant="secondary" icon={<RefreshCw size={16} className={loading && !validation ? "animate-spin" : ""} />} onClick={refresh} disabled={Boolean(validation) || loading}>Odśwież</Button>
    </div>
    <ActivityFilters value={filters} metadata={metadata} onChange={changeFilters} onClear={() => changeFilters(defaultActivityFilters)} />
    {metadataError ? <div role="alert" className="card-shell flex flex-col gap-3 p-4 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between"><p>Nie udało się pobrać dostępnych rodzajów danych, operacji i źródeł. {metadataError}</p><Button variant="secondary" size="sm" onClick={() => setMetadataRevision((current) => current + 1)}>Ponów pobieranie filtrów</Button></div> : null}
    <ListSection title="Zmiany w studiu" meta={data && !loading && !message ? pluralizeEntries(data.totalCount) : null} busy={loading && !validation}>
      {validation ? <ListState variant="error" icon={<SlidersHorizontal size={28} />} title="Popraw filtry" message={validation} />
        : error ? <ListState variant="error" icon={<CircleAlert size={28} />} title="Nie udało się wczytać historii zmian" message={error} action={<Button variant="secondary" size="sm" onClick={refresh}>Spróbuj ponownie</Button>} />
        : loading ? <ListState variant="loading" label="Ładowanie historii zmian..." />
        : data ? <><ActivityList items={data.items ?? []} onSelect={setSelected} /><ActivityPagination data={data} onPageChange={(next) => { if (next === page) return; setPage(next); setData(null); setLoading(true); }} onPageSizeChange={(next) => { if (next === pageSize) return; setPageSize(next); setPage(1); setData(null); setLoading(true); }} /></> : null}
    </ListSection>
    {selected ? <ActivityDetails entry={selected} onClose={closeDetails} onRelated={(changeSetId) => { changeFilters({ ...defaultActivityFilters, changeSetId }); setSelected(null); }} /> : null}
  </div>;
}

function pluralizeEntries(count: number) {
  if (count === 1) return "1 wpis";
  const last = count % 10;
  const lastTwo = count % 100;
  return `${count} ${last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "wpisy" : "wpisów"}`;
}
