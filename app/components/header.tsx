"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronDown,
  CircleUserRound,
  LogOut,
  MapPin,
  Search,
  UserRound,
} from "lucide-react";
import NotificationsPanel from "@/app/(app)/owner/components/NotificationsPanel";
import type { AppRole } from "@/app/components/navigation";
import { getCurrentUser, type CurrentUser } from "@/app/lib/auth/current-user";
import { getClients, type Client } from "@/app/lib/owner/clients";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";

type HeaderProps = {
  role: AppRole;
};

type SearchResult = {
  id: number;
  type: "client" | "trainer";
  title: string;
  subtitle: string;
  href: string;
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function getClientName(client: Client) {
  return (
    client.fullName || `${client.firstName || ""} ${client.lastName || ""}`
  ).trim();
}

function getTrainerName(trainer: Trainer) {
  return (
    trainer.fullName || `${trainer.firstName || ""} ${trainer.lastName || ""}`
  ).trim();
}

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

function getLocationLabel(location: Location) {
  return location.name || location.city || `Lokalizacja ${location.id}`;
}

function getStoredLocation() {
  if (typeof window === "undefined") return "all";

  return window.localStorage.getItem("atlas-owner-location-id") || "all";
}

export function Header({ role }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(getStoredLocation);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [directoriesLoaded, setDirectoriesLoaded] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));

    if (role === "owner") {
      getLocations()
        .then((items) => setLocations(items.filter((item) => item.isActive)))
        .catch(() => setLocations([]));
    }
  }, [role]);

  async function ensureDirectories() {
    if (directoriesLoaded || role !== "owner") return;

    try {
      const [clientsData, trainersData] = await Promise.all([
        getClients(),
        getTrainers(),
      ]);
      setClients(clientsData);
      setTrainers(trainersData);
      setDirectoriesLoaded(true);
    } catch {
      setDirectoriesLoaded(true);
    }
  }

  const searchResults = useMemo<SearchResult[]>(() => {
    const value = normalize(query);

    if (!value || role !== "owner") return [];

    const clientResults = clients
      .filter((client) => {
        const name = normalize(getClientName(client));
        const email = normalize(client.email || "");

        return name.includes(value) || email.includes(value);
      })
      .slice(0, 4)
      .map((client) => ({
        id: client.id,
        type: "client" as const,
        title: getClientName(client),
        subtitle: client.email || "Klient",
        href: `/owner/clients/${client.id}`,
      }));

    const trainerResults = trainers
      .filter((trainer) => {
        const name = normalize(getTrainerName(trainer));
        const email = normalize(trainer.email || "");

        return name.includes(value) || email.includes(value);
      })
      .slice(0, 4)
      .map((trainer) => ({
        id: trainer.id,
        type: "trainer" as const,
        title: getTrainerName(trainer),
        subtitle: trainer.email || "Trener",
        href: `/owner/trainers/${trainer.id}`,
      }));

    return [...clientResults, ...trainerResults].slice(0, 6);
  }, [clients, query, role, trainers]);

  function handleLocationChange(value: string) {
    setSelectedLocation(value);

    if (value === "all") {
      window.localStorage.removeItem("atlas-owner-location-id");
    } else {
      window.localStorage.setItem("atlas-owner-location-id", value);
    }

    window.location.reload();
  }

  const displayUser = user ?? {
    id: "",
    fullName: "Użytkownik",
    email: "Brak e-maila",
    role,
    avatarUrl: null,
  };

  return (
    <>
      <header className="mx-auto mb-10 mt-4 grid max-w-[1000px] grid-cols-[1fr_auto] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative hidden min-w-0 flex-1 md:block">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-muted"
              size={17}
            />
            <input
              type="text"
              value={query}
              onFocus={ensureDirectories}
              onChange={(event) => {
                setQuery(event.target.value);
                ensureDirectories();
              }}
              placeholder="Szukaj klientów i trenerów..."
              className="h-14 w-full rounded-full bg-surface-container-lowest pl-12 pr-5 text-sm text-on-surface outline-none placeholder:text-on-surface-muted"
            />

            {query ? (
              <div className="absolute left-0 top-[calc(100%+0.75rem)] z-40 w-full overflow-hidden rounded-[var(--radius-lg)] bg-surface-container shadow-ambient">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      href={result.href}
                      prefetch={false}
                      onClick={() => setQuery("")}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-container-high"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-surface-container-lowest text-primary-light">
                        {result.type === "client" ? (
                          <UserRound size={17} />
                        ) : (
                          <Building2 size={17} />
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
                  ))
                ) : (
                  <div className="px-4 py-5 text-sm text-on-surface-variant">
                    Brak wyników.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {role === "owner" ? (
            <label className="hidden h-14 items-center gap-2 rounded-full bg-surface-container-lowest px-4 text-sm text-on-surface md:flex">
              <MapPin size={17} className="text-primary-light" />
              <select
                value={selectedLocation}
                onChange={(event) => handleLocationChange(event.target.value)}
                className="max-w-[170px] bg-transparent text-sm font-semibold outline-none"
                aria-label="Wybierz lokalizację"
              >
                <option value="all">Wszystkie lokalizacje</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {getLocationLabel(location)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/owner/notifications"
            className="relative text-on-surface-variant hover:text-on-surface md:hidden"
          >
            <Bell width={18} height={18} />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-tertiary-light" />
          </Link>

          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative hidden h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface md:flex"
            aria-label="Otwórz powiadomienia"
          >
            <Bell width={18} height={18} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-tertiary-light" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen((value) => !value)}
              className="flex h-14 items-center gap-3 rounded-full bg-surface-container-lowest py-2 pl-3 pr-4 transition hover:bg-surface-container"
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface-container text-primary-light">
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

      <NotificationsPanel
        open={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </>
  );
}
