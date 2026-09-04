// Sekcja: Nagłówek ustawień
export default function SettingsHeader() {
  return (
    <header>
      <p className="text-label text-primary-light">Ustawienia</p>
      <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
        Ustawienia <span className="text-primary-light">ATLAS</span>
      </h1>
      <p className="mt-3 max-w-[760px] text-sm leading-6 text-on-surface-variant">
        Zarządzaj profilem, danymi firmowymi, wartościami domyślnymi systemu i
        integracjami.
      </p>
    </header>
  );
}
