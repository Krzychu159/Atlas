"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  getPackage,
  getPackageClients,
  type Package,
  type PackageClient,
} from "@/app/lib/owner/packages";
import PackageDetailsHero from "./components/PackageDetailsHero";
import PackageEditCard from "./components/PackageEditCard";
import PackageClientsList from "./components/PackageClientsList";

const mockPackageClients: PackageClient[] = [
  {
    id: 1,
    fullName: "Jakub Wiśniewski",
    email: "jakub@example.com",
    avatarUrl: null,
    joinedAt: "2024-05-12T10:00:00Z",
    usedSessions: 3,
    sessionsLimit: 8,
    status: "Active",
  },
  {
    id: 2,
    fullName: "Anna Kowalska",
    email: "anna@example.com",
    avatarUrl: null,
    joinedAt: "2024-05-08T10:00:00Z",
    usedSessions: 6,
    sessionsLimit: 8,
    status: "Active",
  },
  {
    id: 3,
    fullName: "Marek Kwiatkowski",
    email: "marek@example.com",
    avatarUrl: null,
    joinedAt: "2024-05-20T10:00:00Z",
    usedSessions: 1,
    sessionsLimit: 8,
    status: "Active",
  },
];

export default function PackageDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const packageId = Number(id);

  const [item, setItem] = useState<Package | null>(null);
  const [clients, setClients] = useState<PackageClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientsSource, setClientsSource] = useState<"api" | "mock">("api");

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError("");

        const packageData = await getPackage(packageId);
        setItem(packageData);

        try {
          const packageClients = await getPackageClients(packageId);
          setClients(packageClients);
          setClientsSource("api");
        } catch {
          setClients(
            mockPackageClients.map((client) => ({
              ...client,
              sessionsLimit: packageData.sessionsLimit,
            })),
          );
          setClientsSource("mock");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Nie udało się pobrać pakietu.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (Number.isFinite(packageId)) {
      loadData();
    }
  }, [packageId]);

  return (
    <div className="max-w-[1000px] mx-auto pb-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/owner/packages"
          className="inline-flex items-center gap-3 text-on-surface hover:text-primary-light"
        >
          <ArrowLeft size={20} className="text-primary-light" />
          <span className="text-lg font-semibold">Package Details</span>
        </Link>

        <button className="h-10 w-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary-light">
          <Pencil size={18} />
        </button>
      </div>

      {isLoading ? (
        <div className="mt-6 card-shell p-6 text-on-surface-variant">
          Ładowanie pakietu...
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 card-shell p-6 text-error-light">{error}</div>
      ) : null}

      {item ? (
        <div className="mt-6 flex flex-col gap-5">
          {clientsSource === "mock" ? (
            <div className="rounded-[var(--radius-lg)] bg-warning-container/30 px-4 py-3 text-sm text-warning-light">
              Lista klientów jest tymczasowo mockowana. Po dodaniu endpointu GET
              /api/Packages/{item.id}/clients podłączy się automatycznie.
            </div>
          ) : null}

          <PackageDetailsHero item={item} clients={clients} />

          <div className="grid grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)] gap-5 items-start">
            <div className="min-w-0">
              <PackageEditCard item={item} onUpdated={setItem} />
            </div>

            <div className="min-w-0">
              <PackageClientsList clients={clients} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
