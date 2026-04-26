import Link from "next/link";
import { LayoutDashboard, LifeBuoy } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center px-6">
      <div className="relative w-full max-w-[820px] text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,82,255,0.12),transparent_55%)]" />

        <p className="text-[10rem] md:text-[14rem] leading-none font-semibold text-on-surface/10 tracking-tight">
          404
        </p>

        <h1 className="-mt-10 text-[2.5rem] md:text-[4rem] leading-none font-semibold font-display tracking-tight">
          Strona nie znaleziona
        </h1>

        <p className="mt-6 mx-auto max-w-[560px] text-base md:text-lg leading-8 text-on-surface-variant">
          Wygląda na to, że strona, której szukasz, nie istnieje lub została
          przeniesiona.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/owner"
            className="h-14 px-8 rounded-[var(--radius-lg)] bg-primary text-on-primary font-semibold shadow-soft flex items-center justify-center gap-3"
          >
            <LayoutDashboard size={18} />
            Powrót do Dashboardu
          </Link>

          <Link
            href="/support"
            className="h-14 px-8 rounded-[var(--radius-lg)] bg-surface-container text-on-surface font-semibold flex items-center justify-center gap-3"
          >
            <LifeBuoy size={18} />
            Kontakt z supportem
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left max-w-[620px] mx-auto">
          <div>
            <p className="text-label text-on-surface-muted">Status</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              CODE_LOST_IN_SPACE
            </p>
          </div>

          <div>
            <p className="text-label text-on-surface-muted">Location</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              /internal/err_404
            </p>
          </div>

          <div>
            <p className="text-label text-on-surface-muted">Time</p>
            <p className="mt-2 text-sm text-on-surface-variant">GMT</p>
          </div>
        </div>
      </div>
    </div>
  );
}
