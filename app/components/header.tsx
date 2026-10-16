"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronDown,
  CircleUserRound,
  LoaderCircle,
  LogOut,
  MapPin,
  Search,
  UserRound,
} from "lucide-react";
import NotificationsPanel from "@/app/(app)/owner/components/NotificationsPanel";
import type { AppRole } from "@/app/components/navigation";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { useCurrentUser } from "@/app/components/current-user-provider";
import { useOrganizationTheme } from "@/app/components/organization-theme";
import { BsworkoutLogo } from "@/app/components/bsworkout-logo";
import { getOwnerFilterOptions } from "@/app/lib/owner/filter-options";
import { OwnerLocationIconPicker } from "@/app/components/owner-mobile-location";
import {
  useOwnerLocationFilter,
  useOwnerLocationOptions,
} from "@/app/lib/owner/location-filter";


type HeaderProps = {
  role: AppRole;
  unreadNotificationCount: number;
  onUnreadCountChange: (count: number) => void;
};

type SearchResult = {
  id: number;
  type: "client" | "trainer";
  title: string;
  subtitle: string;
  href: string;
};

type SearchResponse =
  | { key: string; status: "ready"; query: string; results: SearchResult[] }
  | { key: string; status: "error"; query: string };

type SearchState = { status: "idle" } | { status: "loading" } | SearchResponse;

const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 5;
const SEARCH_DEBOUNCE_MS = 250;

function getRoleLabel(role: string) {
  switch (role.toLowerCase()) {
    case "owner":
      return "Owner";
    case "trainer":
      return "Trener";
    case "client":
      return "Klient";
    default:
      return role || "Użytkownik";
  }
}

function OwnerGlobalSearch({ className }: { className: string }) {
  const { selectedLocationId } = useOwnerLocationFilter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryToken, setRetryToken] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const listId = useId();
  const term = query.trim();
  const requestKey = `${selectedLocationId ?? "all"}|${retryToken}|${term}`;
  const state: SearchState = term.length < SEARCH_MIN_LENGTH
    ? { status: "idle" }
    : response?.key === requestKey ? response : { status: "loading" };

  // Server-side search limited to a few people in the selected location; the full lists are never downloaded.
  useEffect(() => {
    if (term.length < SEARCH_MIN_LENGTH) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getOwnerFilterOptions({ search: term, locationId: selectedLocationId, limit: SEARCH_LIMIT }, controller.signal)
        .then((options) => {
          if (controller.signal.aborted) return;
          const results: SearchResult[] = [
            ...options.clients.map((client) => ({
              id: client.id,
              type: "client" as const,
              title: client.name,
              subtitle: "Klient",
              href: `/owner/clients/${client.id}`,
            })),
            ...options.trainers.map((trainer) => ({
              id: trainer.id,
              type: "trainer" as const,
              title: trainer.name,
              subtitle: "Trener",
              href: `/owner/trainers/${trainer.id}`,
            })),
          ];
          setActiveIndex(-1);
          setResponse({ key: requestKey, status: "ready", query: term, results });
        })
        .catch(() => {
          if (!controller.signal.aborted) setResponse({ key: requestKey, status: "error", query: term });
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey, selectedLocationId, term]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const results = state.status === "ready" ? state.results : [];
  const showPanel = open && term.length > 0;

  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (showPanel) {
        event.preventDefault();
        close();
      } else if (query) {
        event.preventDefault();
        setQuery("");
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!results.length) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        if (event.key === "ArrowDown") return current >= results.length - 1 ? 0 : current + 1;
        return current <= 0 ? results.length - 1 : current - 1;
      });
      return;
    }
    if (event.key === "Enter" && showPanel) {
      const index = activeIndex >= 0 ? activeIndex : results.length === 1 ? 0 : -1;
      if (index < 0) return;
      event.preventDefault();
      resultRefs.current[index]?.click();
    }
  }

  return (
    <div
      ref={rootRef}
      className={className}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <Search
        aria-hidden="true"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-muted"
        size={17}
      />
      <input
        type="text"
        role="combobox"
        aria-label="Szukaj klientów i trenerów"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={showPanel && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Szukaj klientów i trenerów..."
        className="h-12 w-full rounded-full bg-surface-container-lowest pl-12 pr-5 text-sm text-on-surface outline-none placeholder:text-on-surface-muted focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_24%,transparent)]"
      />

      {showPanel ? (
        <div className="absolute left-0 top-[calc(100%+0.75rem)] z-40 w-full overflow-hidden rounded-[var(--radius-lg)] bg-surface-container shadow-ambient">
          {term.length < SEARCH_MIN_LENGTH ? (
            <p className="px-4 py-5 text-sm text-on-surface-variant">Wpisz co najmniej {SEARCH_MIN_LENGTH} znaki.</p>
          ) : state.status === "loading" ? (
            <p role="status" className="flex items-center gap-2 px-4 py-5 text-sm text-on-surface-variant">
              <LoaderCircle size={16} className="animate-spin text-primary-light" aria-hidden="true" />
              Szukamy…
            </p>
          ) : state.status === "error" ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <p className="text-sm text-on-surface-variant">Nie udało się wyszukać. Sprawdź połączenie i spróbuj ponownie.</p>
              <button
                type="button"
                onClick={() => setRetryToken((value) => value + 1)}
                className="h-9 rounded-full bg-surface-container-high px-4 text-sm font-semibold text-on-surface transition hover:bg-surface-container-highest focus-visible:outline-2 focus-visible:outline-primary-light"
              >
                Spróbuj ponownie
              </button>
            </div>
          ) : results.length ? (
            <ul id={listId} role="listbox" aria-label="Wyniki wyszukiwania">
              {results.map((result, index) => (
                <li key={`${result.type}-${result.id}`} role="presentation">
                  <Link
                    ref={(element) => { resultRefs.current[index] = element; }}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    href={result.href}
                    prefetch={false}
                    onClick={() => {
                      setQuery("");
                      close();
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex items-center gap-3 px-4 py-3 transition hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none ${index === activeIndex ? "bg-surface-container-high" : ""}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-primary-light">
                      {result.type === "client" ? (
                        <UserRound size={17} aria-hidden="true" />
                      ) : (
                        <Building2 size={17} aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-on-surface">
                        {result.title}
                      </p>
                      <p className="truncate text-xs text-on-surface-muted">
                        {result.subtitle}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : state.status === "ready" ? (
            <p role="status" className="px-4 py-5 text-sm text-on-surface-variant">
              Nie znaleziono klientów ani trenerów pasujących do „{state.query}”.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Header({ role, unreadNotificationCount, onUnreadCountChange }: HeaderProps) {
  const theme = useOrganizationTheme();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsAnchorRef = useRef<HTMLDivElement>(null);
  const closeNotifications = useCallback(() => setIsNotificationsOpen(false), []);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const {
    options: locationOptions,
    selectedLocationValue,
    setSelectedLocationValue,
  } = useOwnerLocationOptions(role === "owner");
  const { user } = useCurrentUser();

  const notificationsHref = `/${role}/notifications`;

  const displayUser = user ?? {
    id: "",
    fullName: "Użytkownik",
    email: "Brak e-maila",
    role,
    avatarUrl: null,
  };

  return (
    <>
      <header className="mx-auto mb-8 mt-4 flex w-full max-w-[1400px] items-center justify-between gap-4">
        {role === "owner" ? (
          <OwnerGlobalSearch className={`relative hidden max-w-[640px] flex-1 md:block ${theme === "bsworkout" ? "min-w-0" : "min-w-[280px]"}`} />
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <div className="flex min-w-0 items-center gap-3">
          {theme === "bsworkout" ? <BsworkoutLogo className="hidden h-7 w-20 shrink-0 lg:flex xl:h-8 xl:w-24" /> : null}
          {role === "owner" ? (
            <CustomSelect
              value={selectedLocationValue}
              options={locationOptions}
              onChange={setSelectedLocationValue}
              icon={<MapPin size={16} />}
              ariaLabel="Lokalizacja"
              className="hidden w-[200px] shrink-0 lg:block xl:w-[240px]"
            />
          ) : null}
          {role === "owner" ? (
            <OwnerLocationIconPicker className="hidden bg-surface-container-lowest md:flex lg:hidden" />
          ) : null}

          {role !== "client" ? (
            <>
              <Link
                href={notificationsHref}
                className="relative text-on-surface-variant hover:text-on-surface md:hidden"
              >
                <Bell width={18} height={18} />
                {unreadNotificationCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-tertiary-light px-1 text-[0.58rem] font-bold text-on-tertiary">
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                ) : null}
              </Link>

              <div ref={notificationsAnchorRef} className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen((open) => !open)}
                  aria-haspopup="dialog"
                  aria-expanded={isNotificationsOpen}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary-light ${isNotificationsOpen ? "bg-surface-container text-on-surface" : "bg-surface-container-lowest"}`}
                  aria-label={
                    unreadNotificationCount > 0
                      ? `Powiadomienia, nieprzeczytane: ${unreadNotificationCount}`
                      : "Powiadomienia"
                  }
                >
                  <Bell width={18} height={18} />
                  {unreadNotificationCount > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-tertiary-light px-1 text-[0.58rem] font-bold text-on-tertiary">
                      {unreadNotificationCount > 99
                        ? "99+"
                        : unreadNotificationCount}
                    </span>
                  ) : null}
                </button>
                <NotificationsPanel
                  open={isNotificationsOpen}
                  onClose={closeNotifications}
                  notificationsHref={notificationsHref}
                  onUnreadCountChange={onUnreadCountChange}
                  role={role}
                  anchorRef={notificationsAnchorRef}
                />
              </div>
            </>
          ) : null}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen((value) => !value)}
              className="flex h-12 items-center gap-3 rounded-full bg-surface-container-lowest py-1.5 pl-2 pr-4 transition hover:bg-surface-container"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-container text-primary-light">
                {displayUser.avatarUrl ? (
                  <img
                    src={displayUser.avatarUrl}
                    alt={displayUser.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <CircleUserRound size={24} />
                )}
              </div>
              <div className="hidden max-w-[150px] text-left lg:block">
                <p className="truncate text-sm font-semibold text-on-surface">
                  {displayUser.fullName}
                </p>
                <p className="truncate text-xs text-on-surface-muted">
                  {getRoleLabel(displayUser.role)}
                </p>
              </div>
              <ChevronDown size={15} className="text-on-surface-muted" />
            </button>

            {isProfileOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[280px] rounded-[var(--radius-lg)] bg-surface-container p-4 shadow-ambient">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-surface-container-lowest text-primary-light">
                    {displayUser.avatarUrl ? (
                      <img
                        src={displayUser.avatarUrl}
                        alt={displayUser.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <CircleUserRound size={28} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {displayUser.fullName}
                    </p>
                    <p className="truncate text-xs text-primary-light">
                      {getRoleLabel(displayUser.role)}
                    </p>
                    <p className="mt-1 truncate text-xs text-on-surface-muted">
                      {displayUser.email}
                    </p>
                  </div>
                </div>

                <Link
                  href="/logout"
                  className="mt-4 flex h-11 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-surface-container-low text-sm font-semibold text-on-surface transition hover:bg-surface-container-high"
                >
                  <LogOut size={16} className="text-primary-light" />
                  Wyloguj się
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>

    </>
  );
}
