"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function CopyOrganizationId({ organizationId }: { organizationId: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(organizationId); setMessage("Identyfikator skopiowany."); }
    catch { setMessage("Nie udało się skopiować. Zaznacz identyfikator i skopiuj go ręcznie."); }
  }
  return <div className="mt-2"><Button type="button" size="icon" variant="secondary" aria-label="Skopiuj identyfikator organizacji" title="Skopiuj identyfikator" onClick={() => void copy()}><Copy size={16} aria-hidden="true" /></Button><p role="status" className="mt-1 text-xs leading-5 text-on-surface-variant">{message}</p></div>;
}
