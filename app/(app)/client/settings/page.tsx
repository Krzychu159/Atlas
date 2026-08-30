import ProfileSettingsCard from "@/app/components/settings/profile-settings-card";

export default function ClientSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <section>
        <p className="text-label text-primary-light">Ustawienia</p>
        <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
          Profil klienta
        </h1>
        <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
          Zarządzaj imieniem, nazwiskiem, adresem e-mail i avatarem konta.
        </p>
      </section>

      <ProfileSettingsCard fallbackLabel="Klient" />
    </div>
  );
}
