import { Settings2 } from "lucide-react";
import OutlookIntegrationCard from "@/app/(app)/owner/settings/components/OutlookIntegrationCard";
import ProfileSettingsCard from "@/app/components/settings/profile-settings-card";

export default function TrainerSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <section>
        <p className="text-label text-primary-light">Ustawienia</p>
        <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
          Profil trenera
        </h1>
        <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
          Zarządzaj podstawowymi danymi konta, avatarem i integracją Outlook.
        </p>
      </section>

      <ProfileSettingsCard fallbackLabel="Trener" />

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-primary-light">
            <Settings2 size={18} />
          </div>
          <div>
            <p className="text-section-title">Ustawienia systemowe</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Integracja i synchronizacja danych z Microsoft Outlook.
            </p>
          </div>
        </div>
        <OutlookIntegrationCard />
      </section>
    </div>
  );
}
