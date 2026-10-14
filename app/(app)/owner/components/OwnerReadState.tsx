import type { ReactNode } from "react";
import { Button } from "@/app/components/ui/button";

export function OwnerReadState({ loading, error, retry, label, children }: {
  loading: boolean; error?: string; retry: () => void; label: string; children?: ReactNode;
}) {
  return <>
    {error ? <div role="alert" className="card-shell flex min-w-0 flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 break-words text-sm text-on-surface-variant">{error}</p>
      <Button variant="secondary" disabled={loading} onClick={retry}>Spróbuj ponownie</Button>
    </div> : null}
    {loading && !children ? <div role="status" className="card-shell p-5 text-sm text-on-surface-variant">{label}</div> : children}
  </>;
}
