"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Dumbbell,
  FileText,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { Button, ButtonLink } from "@/app/components/ui/button";
import { showAppError, showAppInfo } from "@/app/components/ui/app-toast";
import { isNotFoundLikeError } from "@/app/lib/backend";
import { formatDateTime, formatSessionTime } from "@/app/lib/formatters/date";
import { formatMoney } from "@/app/lib/formatters/money";
import {
  getClientPortalBilling,
  getClientPortalDashboard,
  getClientPortalMe,
  getClientPortalSubscription,
  getClientPortalTrainingPlan,
  type ClientBillingSummary,
  type ClientPortalMe,
  type ClientSubscription,
  type ClientTrainingPlan,
  type ClientPortalDashboard,
  type ClientPortalSession,
} from "@/app/lib/client/portal";

export default function ClientDashboardPage() {
  const [dashboard, setDashboard] = useState<ClientPortalDashboard | null>(null);
  const [profile, setProfile] = useState<ClientPortalMe | null>(null);
  const [billing, setBilling] = useState<ClientBillingSummary | null>(null);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(
    null,
  );
  const [trainingPlan, setTrainingPlan] = useState<ClientTrainingPlan | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      const [
        dashboardData,
        profileData,
        billingData,
        subscriptionData,
        trainingPlanData,
      ] =
        await Promise.allSettled([
          getClientPortalDashboard(),
          getClientPortalMe(),
          getClientPortalBilling(),
          getClientPortalSubscription(),
          getClientPortalTrainingPlan(),
        ]);

      if (dashboardData.status === "fulfilled") setDashboard(dashboardData.value);
      if (profileData.status === "fulfilled") setProfile(profileData.value);
      if (billingData.status === "fulfilled") setBilling(billingData.value);
      if (subscriptionData.status === "fulfilled") {
        setSubscription(subscriptionData.value);
      }
      if (trainingPlanData.status === "fulfilled") {
        setTrainingPlan(trainingPlanData.value);
      }

      const firstError = [
        dashboardData,
        profileData,
        billingData,
        subscriptionData,
        trainingPlanData,
      ].find(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected" &&
          !isNotFoundLikeError(result.reason),
      );

      if (firstError && dashboardData.status !== "fulfilled" && profileData.status !== "fulfilled") {
        throw firstError.reason;
      }
    } catch (err) {
      showAppError(err, "Nie udało się pobrać panelu klienta.", {
        id: "client-dashboard-load-error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const me = dashboard?.me ?? profile;
  const trainer = dashboard?.trainer;
  const packageData = dashboard?.package;
  const payment = dashboard?.payment;
  const currentCycle = subscription?.currentCycle;
  const nextSession = dashboard?.nextSession;
  const upcomingSessions = useMemo(
    () => [...(dashboard?.upcomingSessions || [])].sort(sortSessions).slice(0, 3),
    [dashboard],
  );
  const recentSessions = useMemo(
    () => [...(dashboard?.recentSessions || [])].sort(sortSessionsDesc).slice(0, 3),
    [dashboard],
  );
  const firstName =
    dashboard?.greetingName ||
    me?.firstName ||
    getFirstName(me?.fullName) ||
    "Kliencie";
  const usedSessions =
    currentCycle?.usedSessions ?? packageData?.usedSessionsCount ?? 0;
  const totalSessions =
    currentCycle?.totalSessions ?? packageData?.sessionsLimit ?? 0;
  const remainingSessions =
    currentCycle?.remainingSessions ?? packageData?.remainingSessionsCount ?? 0;
  const progress = totalSessions
    ? Math.min(100, Math.round((usedSessions / totalSessions) * 100))
    : packageData?.progressPercent ?? 0;
  const amountDue =
    billing?.activePackageAmountDue ?? currentCycle?.amountDue ?? payment?.amountDue ?? 0;
  const currency =
    billing?.packages?.find((item) => item.clientPackageId === billing.activeClientPackageId)
      ?.currency ||
    currentCycle?.currency ||
    payment?.currency ||
    "PLN";

  function openTrainingPlan() {
    const url =
      trainingPlan?.googleDriveFolderUrl || trainingPlan?.url || undefined;

    if (!url) {
      showAppInfo("Plan treningowy nie ma jeszcze podpiętego linku.", {
        id: "client-training-plan-empty",
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-10">
      <MobileDashboard
        firstName={firstName}
        greetingMessage={dashboard?.greetingMessage}
        nextSession={nextSession}
        trainerName={
          nextSession?.trainerFullName ||
          trainer?.fullName ||
          me?.trainerFullName ||
          "Nie przypisano"
        }
        packageName={currentCycle?.packageName || packageData?.name || "Brak pakietu"}
        amountDue={amountDue}
        currency={currency}
        usedSessions={usedSessions}
        totalSessions={totalSessions}
        remainingSessions={remainingSessions}
        progress={progress}
        upcomingSessions={upcomingSessions}
        isLoading={isLoading}
        onOpenTrainingPlan={openTrainingPlan}
      />

      <div className="hidden flex-col gap-5 md:flex">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label text-primary-light">Panel klienta</p>
          <h1 className="mt-2 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight">
            Cześć, {firstName}
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-6 text-on-surface-variant">
            {dashboard?.greetingMessage ||
              "Tu widzisz najbliższy trening, aktualny pakiet i płatności."}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink
            href="/client/schedule"
            icon={<CalendarDays size={16} />}
            variant="secondary"
          >
            Otwórz plan
          </ButtonLink>
          <Button
            type="button"
            onClick={openTrainingPlan}
            icon={<FileText size={16} />}
          >
            Pliki
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="card-shell relative min-h-[300px] overflow-hidden p-5 md:p-6">
          <div className="absolute right-8 top-8 hidden text-on-surface-muted/20 md:block">
            <Dumbbell size={104} strokeWidth={1.35} />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div>
              <span className="inline-flex rounded-full bg-surface-container-lowest px-4 py-2 text-label text-primary-light">
                Najbliższy trening
              </span>

              {isLoading ? (
                <SkeletonBlock className="mt-10 h-24 max-w-[520px]" />
              ) : nextSession ? (
                <div className="mt-10 max-w-[640px]">
                  <h2 className="font-display text-[2.2rem] font-semibold leading-[1.05] tracking-tight">
                    {nextSession.title || "Trening"}
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-on-surface-variant">
                    <SessionMeta icon={<CalendarDays size={15} />}>
                      {formatSessionDate(nextSession.startAt)}
                    </SessionMeta>
                    <SessionMeta icon={<Clock3 size={15} />}>
                      {formatTimeRange(nextSession)}
                    </SessionMeta>
                    <SessionMeta icon={<MapPin size={15} />}>
                      {nextSession.locationName || "Brak lokalizacji"}
                    </SessionMeta>
                  </div>
                </div>
              ) : (
                <div className="mt-10 max-w-[540px]">
                  <h2 className="font-display text-[2rem] font-semibold leading-[1.1] tracking-tight">
                    Brak zaplanowanej najbliższej sesji
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                    Gdy trener przypisze trening, pojawi się tutaj termin i
                    szczegóły spotkania.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <InfoPill
                  label="Trener"
                  value={
                    nextSession?.trainerFullName ||
                    trainer?.fullName ||
                    me?.trainerFullName ||
                    "Nie przypisano"
                  }
                />
                <InfoPill
                  label="Status"
                  value={getSessionStatusLabel(nextSession?.status)}
                />
              </div>
              <ButtonLink href="/client/schedule" icon={<ArrowRight size={16} />}>
                Plan tygodnia
              </ButtonLink>
            </div>
          </div>
        </div>

        <div className="card-shell p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label text-on-surface-muted">Twój trener</p>
              <h2 className="mt-4 font-display text-[1.75rem] font-semibold leading-none">
                {trainer?.fullName || me?.trainerFullName || "Brak trenera"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                {trainer?.specialization || trainer?.bio || "Kontakt do trenera pojawi się po przypisaniu opiekuna."}
              </p>
            </div>
            <Avatar
              src={trainer?.avatarUrl}
              label={trainer?.fullName || me?.trainerFullName || "T"}
              size="lg"
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ContactTile
              icon={<Phone size={16} />}
              label="Telefon"
              value={trainer?.phone || "Brak numeru"}
            />
            <ContactTile
              icon={<UserRound size={16} />}
              label="E-mail"
              value={trainer?.email || "Brak e-maila"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          icon={<Dumbbell size={20} />}
          label="Aktualny pakiet"
          value={currentCycle?.packageName || packageData?.name || "Brak pakietu"}
          note={
            totalSessions
              ? `${usedSessions}/${totalSessions} wykorzystanych`
              : "Brak aktywnego cyklu"
          }
        />
        <MetricCard
          icon={<CreditCard size={20} />}
          label="Do zapłaty"
          value={formatMoney(amountDue, currency)}
          note={payment?.paymentDueDate ? `Termin: ${formatDateTime(payment.paymentDueDate)}` : "Saldo z aktywnego pakietu"}
          accent={amountDue > 0 ? "warning" : "success"}
        />
        <MetricCard
          icon={<CheckCircle2 size={20} />}
          label="Pozostałe treningi"
          value={String(remainingSessions)}
          note={
            subscription?.autoRenewEnabled
              ? "Auto-przedłużanie aktywne"
              : "Auto-przedłużanie wyłączone"
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card-shell p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label text-on-surface-muted">Wykorzystanie cyklu</p>
              <h2 className="mt-3 font-display text-[1.85rem] font-semibold leading-tight">
                {usedSessions} z {totalSessions || 0} treningów
              </h2>
            </div>
            <span className="rounded-full bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary-light">
              {progress}%
            </span>
          </div>

          <div className="mt-7 h-3 overflow-hidden rounded-full bg-surface-container-lowest">
            <div
              className="h-full rounded-full bg-primary-gradient transition-all"
              style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <SmallStat label="Użyte" value={usedSessions} />
            <SmallStat label="Pozostało" value={remainingSessions} />
            <SmallStat label="Łącznie" value={totalSessions || 0} />
          </div>
        </div>

        <div className="card-shell p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-label text-on-surface-muted">Nadchodzące sesje</p>
              <h2 className="mt-3 font-display text-[1.85rem] font-semibold leading-none">
                Najbliższe terminy
              </h2>
            </div>
            <ButtonLink href="/client/schedule" variant="ghost" size="sm">
              Zobacz plan
            </ButtonLink>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {upcomingSessions.length ? (
              upcomingSessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))
            ) : (
              <EmptyState text="Nie masz zaplanowanych sesji w najbliższym czasie." />
            )}
          </div>
        </div>
      </section>

      <section className="card-shell p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-label text-on-surface-muted">Ostatnia aktywność</p>
            <h2 className="mt-3 font-display text-[1.85rem] font-semibold leading-none">
              Zrealizowane treningi
            </h2>
          </div>
          <ButtonLink href="/client/payments" variant="secondary" size="sm">
            Płatności
          </ButtonLink>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {recentSessions.length ? (
            recentSessions.map((session) => (
              <RecentSessionCard key={session.id} session={session} />
            ))
          ) : (
            <div className="md:col-span-3">
              <EmptyState text="Historia treningów pojawi się po pierwszych zrealizowanych sesjach." />
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

function MobileDashboard({
  firstName,
  greetingMessage,
  nextSession,
  trainerName,
  packageName,
  amountDue,
  currency,
  usedSessions,
  totalSessions,
  remainingSessions,
  progress,
  upcomingSessions,
  isLoading,
  onOpenTrainingPlan,
}: {
  firstName: string;
  greetingMessage?: string | null;
  nextSession?: ClientPortalSession | null;
  trainerName: string;
  packageName: string;
  amountDue: number;
  currency: string;
  usedSessions: number;
  totalSessions: number;
  remainingSessions: number;
  progress: number;
  upcomingSessions: ClientPortalSession[];
  isLoading: boolean;
  onOpenTrainingPlan: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 md:hidden">
      <section>
        <p className="text-label text-primary-light">Panel klienta</p>
        <h1 className="mt-2 font-display text-[2.15rem] font-semibold leading-[0.95] tracking-tight">
          Cześć, {firstName}
        </h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          {greetingMessage || "Najważniejsze informacje o treningach i płatnościach."}
        </p>
      </section>

      <section className="card-shell overflow-hidden p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label text-primary-light">Najbliższy trening</p>
            {isLoading ? (
              <SkeletonBlock className="mt-5 h-20 w-full" />
            ) : nextSession ? (
              <>
                <h2 className="mt-5 font-display text-[1.85rem] font-semibold leading-[1.05]">
                  {nextSession.title || "Trening"}
                </h2>
                <div className="mt-4 flex flex-col gap-2 text-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={15} className="text-primary-light" />
                    {formatSessionDate(nextSession.startAt)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 size={15} className="text-primary-light" />
                    {formatTimeRange(nextSession)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={15} className="text-primary-light" />
                    {nextSession.locationName || "Brak lokalizacji"}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm leading-6 text-on-surface-variant">
                Nie masz teraz zaplanowanego najbliższego treningu.
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
            <Dumbbell size={22} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MobileInfoTile label="Trener" value={trainerName} />
          <MobileInfoTile
            label="Status"
            value={getSessionStatusLabel(nextSession?.status)}
          />
        </div>

        <ButtonLink
          href="/client/schedule"
          icon={<ArrowRight size={16} />}
          className="mt-5 w-full"
        >
          Otwórz plan
        </ButtonLink>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MobileMetric
          label="Do zapłaty"
          value={formatMoney(amountDue, currency)}
          tone={amountDue > 0 ? "warning" : "success"}
        />
        <MobileMetric
          label="Pozostało"
          value={`${remainingSessions}`}
          note="treningów"
        />
      </section>

      <section className="card-shell p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-label text-on-surface-muted">Pakiet</p>
            <h2 className="mt-2 truncate text-[1.45rem] font-semibold">
              {packageName}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {usedSessions}/{totalSessions || 0} wykorzystanych treningów
            </p>
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary-light">
            {progress}%
          </span>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-container-lowest">
          <div
            className="h-full rounded-full bg-primary-gradient"
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      </section>

      <section className="card-shell p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-section-title text-[1.35rem]">Kolejne sesje</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<FileText size={15} />}
            onClick={onOpenTrainingPlan}
          >
            Pliki
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {upcomingSessions.length ? (
            upcomingSessions.slice(0, 2).map((session) => (
              <SessionRow key={session.id} session={session} />
            ))
          ) : (
            <EmptyState text="Brak zaplanowanych sesji." />
          )}
        </div>
      </section>
    </div>
  );
}

function MobileInfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-lowest p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function MobileMetric({
  label,
  value,
  note,
  tone = "primary",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-tertiary-light"
      : tone === "warning"
        ? "text-warning-light"
        : "text-primary-light";

  return (
    <div className="card-shell min-h-[126px] p-4">
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className={`mt-5 text-[1.65rem] font-semibold leading-none ${toneClass}`}>
        {value}
      </p>
      {note ? (
        <p className="mt-2 text-sm text-on-surface-variant">{note}</p>
      ) : null}
    </div>
  );
}

function SessionMeta({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-3 py-2">
      <span className="text-primary-light">{icon}</span>
      {children}
    </span>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  accent?: "primary" | "success" | "warning";
}) {
  const accentClass =
    accent === "success"
      ? "text-tertiary-light bg-tertiary-container/45"
      : accent === "warning"
        ? "text-warning-light bg-warning-container/55"
        : "text-primary-light bg-primary/15";

  return (
    <div className="card-shell p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] ${accentClass}`}>
        {icon}
      </div>
      <p className="mt-5 text-label text-on-surface-muted">{label}</p>
      <p className="mt-3 line-clamp-2 text-[1.55rem] font-semibold leading-tight">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{note}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <p className="text-label text-on-surface-muted">{label}</p>
      <p className="mt-2 text-[1.6rem] font-semibold leading-none">{value}</p>
    </div>
  );
}

function ContactTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="flex items-center gap-2 text-primary-light">
        {icon}
        <p className="text-label">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function SessionRow({ session }: { session: ClientPortalSession }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">
          {session.title || "Trening"}
        </p>
        <p className="mt-1 text-sm text-on-surface-variant">
          {formatSessionDate(session.startAt)} · {formatTimeRange(session)}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-primary-light">
        {getSessionStatusLabel(session.status)}
      </span>
    </div>
  );
}

function RecentSessionCard({ session }: { session: ClientPortalSession }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4">
      <p className="text-sm font-semibold text-primary-light">
        {formatSessionDate(session.startAt)}
      </p>
      <p className="mt-3 truncate text-base font-semibold">
        {session.title || "Trening"}
      </p>
      <p className="mt-2 text-sm text-on-surface-variant">
        {session.trainerFullName || "Trener"} · {getSessionStatusLabel(session.status)}
      </p>
    </div>
  );
}

function Avatar({
  src,
  label,
  size = "md",
}: {
  src?: string | null;
  label: string;
  size?: "md" | "lg";
}) {
  const className = size === "lg" ? "h-20 w-20" : "h-12 w-12";

  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-surface-container-lowest text-lg font-semibold text-primary-light`}
      style={src ? { backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      aria-label={label}
    >
      {src ? null : getInitials(label)}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
      {text}
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-lg)] bg-surface-container-lowest ${className}`}
    />
  );
}

function sortSessions(first: ClientPortalSession, second: ClientPortalSession) {
  return getTime(first.startAt) - getTime(second.startAt);
}

function sortSessionsDesc(
  first: ClientPortalSession,
  second: ClientPortalSession,
) {
  return getTime(second.startAt) - getTime(first.startAt);
}

function getTime(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getFirstName(value?: string | null) {
  return value?.trim().split(" ").filter(Boolean)[0] || "";
}

function getInitials(value: string) {
  const parts = value.trim().split(" ").filter(Boolean);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase() || "K";
}

function formatSessionDate(value?: string | null) {
  if (!value) return "Brak daty";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatTimeRange(session: ClientPortalSession) {
  return `${formatSessionTime(session.startAt)} - ${formatSessionTime(
    session.endAt,
  )}`;
}

function getSessionStatusLabel(status?: string | null) {
  const normalized = status?.toLowerCase() || "";

  if (normalized.includes("completed") || normalized.includes("done")) {
    return "Zrealizowany";
  }
  if (normalized.includes("cancel")) return "Anulowany";
  if (normalized.includes("confirm")) return "Potwierdzony";
  if (normalized.includes("planned")) return "Zaplanowany";

  return status || "Zaplanowany";
}
