import { User, Settings2, Pencil, ChevronDown, Bolt, Lock } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="flex flex-col gap-6">
          <div className="max-w-[560px]">
            <p className="text-label text-primary-light">
              Zarządzaj ustawieniami systemu
            </p>
            <h1 className="mt-2 text-[2.25rem] leading-[0.95] mb-3 font-semibold font-display tracking-tight">
              Ustawienia <span className="text-primary-light">ATLAS</span>
            </h1>
          </div>

          <div className="card-shell p-6 md:p-8">
            <div className="grid grid-cols-[180px_1fr] gap-8 items-start">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-36 w-36 rounded-[24px] overflow-hidden bg-surface-container-low shadow-soft">
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop"
                      alt="Zdjęcie profilowe"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <button className="absolute -right-2 bottom-0 h-11 w-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-soft">
                    <Pencil size={16} />
                  </button>
                </div>

                <button className="mt-4 text-label text-on-surface-variant hover:text-on-surface transition-colors">
                  Zmień zdjęcie
                </button>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary-light">
                    <User size={18} />
                  </div>
                  <p className="text-section-title">Ustawienia Profilu</p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-label text-on-surface-variant">
                      Imię
                    </label>
                    <input
                      defaultValue="Marek"
                      className="w-full h-14 rounded-[var(--radius-lg)] bg-surface-container-low px-4 outline-none text-base"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-label text-on-surface-variant">
                      Nazwisko
                    </label>
                    <input
                      defaultValue="Kowalski"
                      className="w-full h-14 rounded-[var(--radius-lg)] bg-surface-container-low px-4 outline-none text-base"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block mb-2 text-label text-on-surface-variant">
                      Pseudonim
                    </label>
                    <input
                      defaultValue="marek_coach"
                      className="w-full h-14 rounded-[var(--radius-lg)] bg-surface-container-low px-4 outline-none text-base"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-shell p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary-light">
                <Settings2 size={18} />
              </div>
              <p className="text-section-title">Ustawienia Systemowe</p>
            </div>

            <div className="mt-6 grid grid-cols-[1fr_360px] gap-6 items-start">
              <div>
                <label className="block mb-2 text-label text-on-surface-variant">
                  Język systemu
                </label>

                <div className="relative">
                  <select className="w-full h-14 rounded-[var(--radius-lg)] bg-surface-container-low px-4 pr-12 outline-none text-base appearance-none">
                    <option>Polski (PL)</option>
                    <option>English (EN)</option>
                  </select>

                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <ChevronDown size={18} />
                  </div>
                </div>

                <p className="mt-3 text-sm italic text-on-surface-muted">
                  Wybierz główny język interfejsu aplikacji.
                </p>
              </div>

              <div className="bg-surface-container-low rounded-[var(--radius-xl)] p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-tertiary-container flex items-center justify-center text-tertiary-light shrink-0">
                    <Bolt size={20} />
                  </div>

                  <div>
                    <p className="text-lg font-semibold">Status Subskrypcji</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      Twój plan Atlas Performance jest aktywny do 12.12.2036
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-8 pt-1">
            <button className="text-base text-on-surface-variant hover:text-on-surface transition-colors">
              Anuluj
            </button>

            <button className="h-14 px-8 rounded-[var(--radius-lg)] bg-primary text-on-primary font-semibold shadow-ambient flex items-center gap-3">
              <Lock size={16} />
              Zapisz zmiany
            </button>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-1 pb-6">
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-label text-primary-light">
              Zarządzaj ustawieniami systemu
            </p>
            <h1 className="mt-2 text-page-title">
              Ustawienia <span className="text-primary-light">ATLAS</span>
            </h1>
          </div>

          <div className="card-shell p-5">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="h-28 w-28 rounded-[22px] overflow-hidden bg-surface-container-low shadow-soft">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop"
                    alt="Zdjęcie profilowe"
                    className="h-full w-full object-cover"
                  />
                </div>

                <button className="absolute -right-2 bottom-0 h-10 w-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-soft">
                  <Pencil size={15} />
                </button>
              </div>

              <button className="mt-4 text-label text-on-surface-variant">
                Zmień zdjęcie
              </button>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary-light">
                  <User size={18} />
                </div>
                <p className="text-section-title">Profil</p>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="block mb-2 text-label text-on-surface-variant">
                    Imię
                  </label>
                  <input
                    defaultValue="Marek"
                    className="w-full h-14 rounded-[var(--radius-lg)] bg-surface-container-low px-4 outline-none text-base"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-label text-on-surface-variant">
                    Nazwisko
                  </label>
                  <input
                    defaultValue="Kowalski"
                    className="w-full h-14 rounded-[var(--radius-lg)] bg-surface-container-low px-4 outline-none text-base"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-label text-on-surface-variant">
                    Pseudonim
                  </label>
                  <input
                    defaultValue="marek_coach"
                    className="w-full h-14 rounded-[var(--radius-lg)] bg-surface-container-low px-4 outline-none text-base"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card-shell p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary-light">
                <Settings2 size={18} />
              </div>
              <p className="text-section-title">System</p>
            </div>

            <div className="mt-5">
              <label className="block mb-2 text-label text-on-surface-variant">
                Język systemu
              </label>

              <div className="relative">
                <select className="w-full h-14 rounded-[var(--radius-lg)] bg-surface-container-low px-4 pr-12 outline-none text-base appearance-none">
                  <option>Polski (PL)</option>
                  <option>English (EN)</option>
                  <option>Deutsch (DE)</option>
                </select>

                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <ChevronDown size={18} />
                </div>
              </div>

              <p className="mt-3 text-sm italic text-on-surface-muted">
                Wybierz główny język interfejsu aplikacji.
              </p>
            </div>

            <div className="mt-5 bg-surface-container-low rounded-[var(--radius-xl)] p-5">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-full bg-tertiary-container flex items-center justify-center text-tertiary-light shrink-0">
                  <Bolt size={18} />
                </div>

                <div>
                  <p className="text-base font-semibold">Status Subskrypcji</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Twój plan Atlas Performance jest aktywny do 12.12.2024.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button className="h-13 rounded-[var(--radius-lg)] bg-surface-container-low text-on-surface font-medium py-3.5">
              Anuluj
            </button>

            <button className="h-14 rounded-[var(--radius-lg)] bg-primary text-on-primary font-semibold shadow-ambient flex items-center justify-center gap-3">
              <Lock size={16} />
              Zapisz zmiany
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
