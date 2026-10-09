"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { activityErrorMessage, defaultActivityFilters, getActivityLog, getActivityLogMetadata, validateActivityFilters, type ActivityFilters as Filters, type ActivityLogEntry, type ActivityLogMetadata, type ActivityLogResponse } from "@/app/lib/owner/activity-log";
import { showOwnerError } from "../../components/owner-toast";
import { ActivityFilters } from "./ActivityFilters";
import { ActivityList } from "./ActivityList";
import { ActivityDetails } from "./ActivityDetails";
import { ActivityPagination } from "./ActivityPagination";

export function ActivityLogPageClient() {
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
  }, [filters, page, pageSize, revision, validation]);

  function changeFilters(next: Filters) {
    setFilters({ ...next }); setPage(1); setData(null); setError(null); setLoading(true);
  }
  function refresh() { setLoading(true); setData(null); setError(null); setRevision((current) => current + 1); }
  const message = validation ?? error;

  return <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-label text-primary-light">Panel właściciela</p><h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">Historia zmian</h1><p className="mt-3 text-sm leading-6 text-on-surface-variant">Sprawdź, kto i jakie zmiany wprowadził w studiu.</p></div>
      <Button variant="secondary" icon={<RefreshCw size={16} className={loading && !validation ? "animate-spin" : ""} />} onClick={refresh} disabled={Boolean(validation) || loading}>Odśwież</Button>
    </div>
    <ActivityFilters value={filters} metadata={metadata} advancedOpen={advancedOpen} onAdvancedOpenChange={setAdvancedOpen} onChange={changeFilters} onClear={() => changeFilters(defaultActivityFilters)} />
    {metadataError ? <div role="alert" className="card-shell flex flex-col gap-3 p-4 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between"><p>Nie udało się pobrać dostępnych rodzajów danych, operacji i źródeł. {metadataError}</p><Button variant="secondary" size="sm" onClick={() => setMetadataRevision((current) => current + 1)}>Ponów pobieranie filtrów</Button></div> : null}
    <section className="overflow-hidden rounded-[var(--radius-xl)] bg-surface-container-low shadow-soft" aria-busy={loading && !validation}>
      <div className="flex flex-col gap-2 px-4 py-5 md:flex-row md:items-end md:justify-between md:px-5"><h2 className="text-section-title">Zmiany w studiu</h2>{data && !loading && !message ? <p className="text-xs text-on-surface-muted">Znaleziono: {data.totalCount} wpisów</p> : null}</div>
      {message ? <div role="alert" className="flex min-h-56 flex-col items-center justify-center gap-4 bg-surface-container-lowest px-5 text-center text-sm text-on-surface-variant"><p>{message}</p>{!validation ? <Button variant="secondary" onClick={refresh}>Spróbuj ponownie</Button> : null}</div>
        : loading ? <div role="status" className="flex min-h-56 items-center justify-center gap-2 bg-surface-container-lowest text-sm text-on-surface-muted"><LoaderCircle size={18} className="animate-spin" />Ładowanie historii zmian...</div>
        : data ? <><ActivityList items={data.items ?? []} onSelect={setSelected} /><ActivityPagination data={data} onPageChange={(next) => { if (next === page) return; setPage(next); setData(null); setLoading(true); }} onPageSizeChange={(next) => { if (next === pageSize) return; setPageSize(next); setPage(1); setData(null); setLoading(true); }} /></> : null}
    </section>
    {selected ? <ActivityDetails entry={selected} onClose={closeDetails} onRelated={(changeSetId) => { changeFilters({ ...defaultActivityFilters, changeSetId }); setAdvancedOpen(true); setSelected(null); }} /> : null}
  </div>;
}
