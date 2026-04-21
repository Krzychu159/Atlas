import {
  Bell,
  CalendarDays,
  CreditCard,
  Download,
  HelpCircle,
  Wallet,
} from "lucide-react";

const transactions = [
  {
    title: "Abonament Październik",
    invoice: "INV/2024/10/042",
    date: "25.10.2024",
    method: "Karta •••• 8821",
    amount: "249,00 zł",
    status: "Opłacono",
    icon: <CalendarDays size={18} />,
  },
  {
    title: "Zestaw Suplementów Performance",
    invoice: "INV/2024/10/012",
    date: "12.10.2024",
    method: "BLIK",
    amount: "185,00 zł",
    status: "Opłacono",
    icon: <Wallet size={18} />,
  },
  {
    title: "Abonament Wrzesień",
    invoice: "INV/2024/09/118",
    date: "25.09.2024",
    method: "Karta •••• 8821",
    amount: "249,00 zł",
    status: "Opłacono",
    icon: <CalendarDays size={18} />,
  },
];

const mobileTransactions = [
  {
    title: "Pakiet Pro - Paź",
    date: "24 PAŹ 2023",
    amount: "249,00 PLN",
  },
  {
    title: "Pakiet Pro - Wrz",
    date: "24 WRZ 2023",
    amount: "249,00 PLN",
  },
];

export default function PaymentsPage() {
  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[560px]">
              <p className="text-label text-primary-light">
                Finanse i subskrypcje
              </p>
              <h1 className="mt-2 text-[2.25rem] leading-[0.95] font-semibold font-display tracking-tight">
                Twoje <span className="text-primary-light">Płatności</span>
              </h1>
            </div>

            <div className="h-20 w-20 rounded-full overflow-hidden bg-surface-container-low shadow-soft shrink-0">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop"
                alt="Profil użytkownika"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_330px] gap-4 items-stretch">
            <div className="card-shell p-6 min-h-[300px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-[42%] bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.16),transparent_55%)] pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="max-w-[560px]">
                  <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-tight">
                    Pakiet Pro Performance
                  </h2>
                  <p className="mt-3 text-base text-on-surface-variant">
                    Nielimitowany dostęp do strefy Atlas Studio
                  </p>
                </div>

                <span className="px-5 py-2 rounded-full bg-tertiary-container text-tertiary-light text-label">
                  Aktywny
                </span>
              </div>

              <div className="relative z-10 grid grid-cols-[1fr_1fr_200px] gap-6 items-end mt-10">
                <div>
                  <p className="text-label text-on-surface-variant">
                    Wygasa za
                  </p>
                  <p className="mt-3 text-[2rem] leading-none font-semibold">
                    14 Dni
                  </p>
                  <p className="mt-3 text-sm text-on-surface-variant">
                    Termin: 24.11.2024
                  </p>
                </div>

                <div>
                  <p className="text-label text-on-surface-variant">
                    Miesięcznie
                  </p>
                  <p className="mt-3 text-[2rem] leading-none font-semibold">
                    249,00 ZŁ
                  </p>
                  <p className="mt-3 text-sm text-on-surface-variant">
                    Najbliższa opłata: 25.11
                  </p>
                </div>

                <button className="h-[100px] rounded-[24px] bg-primary-gradient text-white shadow-ambient flex items-center justify-center gap-4 text-[1.05rem] font-semibold">
                  <Wallet size={20} />
                  Opłać teraz
                </button>
              </div>
            </div>

            <div className="card-shell p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-primary-light" />
                  <p className="text-section-title">Metoda płatności</p>
                </div>

                <div className="mt-8 bg-surface-container-lowest rounded-[24px] p-6">
                  <p className="text-label text-on-surface-variant">
                    Karta domyślna
                  </p>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="px-3 py-2 rounded-[12px] bg-white/10 text-on-surface-muted font-semibold">
                      VISA
                    </div>

                    <div className="text-right">
                      <p className="text-[1.6rem] leading-none font-semibold">
                        •••• 8821
                      </p>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        Ważna do 09/27
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button className="mt-8 text-left text-primary-light text-section-title hover:text-on-surface transition-colors">
                Zmień metodę →
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-section-title">Historia transakcji</p>

              <div className="flex items-center gap-3">
                <button className="h-12 w-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <Bell size={18} />
                </button>
                <button className="h-12 w-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <Download size={18} />
                </button>
              </div>
            </div>

            <div className="card-shell mt-5 overflow-hidden">
              <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_120px] px-6 py-5 bg-surface-container-low text-label text-on-surface-variant">
                <p>Opis usługi</p>
                <p>Data</p>
                <p>Metoda</p>
                <p>Kwota</p>
                <p>Status</p>
              </div>

              <div>
                {transactions.map((item, index) => (
                  <div
                    key={item.title}
                    className={`grid grid-cols-[2.2fr_1fr_1fr_1fr_120px] px-6 py-8 items-center ${
                      index !== transactions.length - 1
                        ? "border-b border-white/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-12 w-12 rounded-[14px] bg-primary/15 flex items-center justify-center text-primary-light shrink-0">
                        {item.icon}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[1.1rem] font-semibold truncate">
                          {item.title}
                        </p>
                        <p className="text-sm text-on-surface-variant mt-1 truncate">
                          {item.invoice}
                        </p>
                      </div>
                    </div>

                    <p className="text-[1.05rem]">{item.date}</p>
                    <p className="text-[1.05rem] text-on-surface-variant">
                      {item.method}
                    </p>
                    <p className="text-[1.1rem] font-semibold">{item.amount}</p>

                    <div>
                      <span className="px-3 py-2 rounded-full bg-tertiary-container text-tertiary-light text-sm font-semibold">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/8 bg-surface-container-lowest px-8 py-8 flex items-center justify-between gap-8">
            <div className="max-w-[620px]">
              <p className="text-[2rem] leading-none font-semibold">
                Potrzebujesz pomocy z płatnościami?
              </p>
              <p className="mt-5 text-[1.05rem] leading-8 text-on-surface-variant">
                Nasz zespół wsparcia finansowego jest dostępny od poniedziałku
                do piątku w godzinach 08:00 - 18:00. Możesz również sprawdzić
                nasze FAQ.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button className="h-14 px-8 rounded-[var(--radius-full)] border border-white/12 bg-surface text-on-surface font-semibold">
                Centrum pomocy
              </button>
              <button className="h-14 px-8 rounded-[var(--radius-full)] bg-surface-container text-on-surface font-semibold">
                Kontakt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-1 pb-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label text-tertiary-light">
                Finanse & Subskrypcja
              </p>
              <h1 className="mt-2 text-page-title">
                Twoje <span className="text-primary-light">Płatności</span>
              </h1>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <Bell size={20} className="text-on-surface-variant" />
              <div className="h-12 w-12 rounded-full overflow-hidden bg-surface-container-low">
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop"
                  alt="Profil użytkownika"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="card-shell p-5 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 text-on-surface-muted/10 text-[10rem] leading-none font-semibold pointer-events-none">
              82
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label text-on-surface-variant">
                  Aktywny pakiet
                </p>
                <p className="mt-5 text-[2rem] leading-[1.15] font-semibold">
                  Pakiet Pro
                  <br />
                  Performance
                </p>
              </div>

              <span className="px-4 py-2 rounded-full bg-tertiary-container text-tertiary-light text-label">
                Aktywny
              </span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest rounded-[22px] p-5">
                <p className="text-label text-on-surface-variant">Cena</p>
                <p className="mt-4 text-[2.3rem] leading-none font-semibold">
                  249,00
                </p>
                <p className="mt-2 text-[1rem] text-on-surface-variant">PLN</p>
              </div>

              <div className="bg-surface-container-lowest rounded-[22px] p-5">
                <p className="text-label text-on-surface-variant">Wygasa za</p>
                <p className="mt-4 text-[2.3rem] leading-none font-semibold">
                  14
                </p>
                <p className="mt-2 text-[1rem] text-on-surface-variant">dni</p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] bg-primary-gradient p-7 text-white shadow-ambient">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-[18px] bg-white/15 flex items-center justify-center">
                <Wallet size={24} />
              </div>
            </div>

            <p className="mt-8 text-center text-[2rem] leading-none font-semibold">
              Termin płatności
            </p>
            <p className="mt-4 text-center text-[1.15rem] text-white/85">
              Do 24 Listopada 2023
            </p>

            <button className="mt-8 w-full h-16 rounded-[20px] bg-white text-primary font-semibold text-[1.1rem]">
              Opłać teraz
            </button>
          </div>

          <div>
            <div className="flex items-center gap-4">
              <p className="text-section-title">Historia płatności</p>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {mobileTransactions.map((item) => (
                <div
                  key={item.title}
                  className="card-shell p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-[14px] bg-primary/15 flex items-center justify-center text-primary-light shrink-0">
                      <CalendarDays size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[1.2rem] font-semibold truncate">
                        {item.title}
                      </p>
                      <p className="text-sm text-on-surface-variant mt-1">
                        {item.date}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[1.1rem] font-semibold">{item.amount}</p>
                    <button className="mt-2 text-label text-primary-light">
                      FV ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-shell p-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-[18px] overflow-hidden bg-surface-container-low shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop"
                  alt="Opiekun"
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <p className="text-[1.6rem] leading-none font-semibold">
                  Potrzebujesz pomocy?
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Twój opiekun jest dostępny 9:00 - 17:00.
                </p>
              </div>
            </div>

            <button className="mt-5 w-full h-14 rounded-[var(--radius-lg)] bg-surface-container-low text-on-surface font-semibold">
              Skontaktuj się
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
