"use client";

import Image from "next/image";
import { useState } from "react";
import logo from "@/public/branding/logo_bsw.png";

export function BsworkoutLogo({ className }: { className: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {failed ? (
        <span className="text-xs font-semibold text-on-surface">BSworkout</span>
      ) : (
        <Image src={logo} alt="BSworkout" fill sizes="208px" className="object-contain" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

export function BsworkoutOrganizationPanel() {
  return (
    <div data-bsworkout-organization-panel className="rounded-xl border border-white/5 bg-surface-container px-4 py-3 shadow-soft text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-on-surface-muted">Twoje studio</p>
      <BsworkoutLogo className="mx-auto mt-2 h-8 w-28 max-w-full" />
    </div>
  );
}
