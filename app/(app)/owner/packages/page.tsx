"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  createPackage,
  deletePackage,
  getPackages,
  type CreatePackagePayload,
  type Package,
} from "@/app/lib/owner/packages";
import AddPackageModal from "./components/AddPackageModal";
import PackageCard from "./components/PackageCard";
import PackageFilters, {
  type PackageFilter,
} from "./components/PackageFilters";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function matchesFilter(item: Package, filter: PackageFilter) {
  if (filter === "active") return item.isActive;
  if (filter === "archived") return !item.isActive;
  return true;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<PackageFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadPackages() {
    try {
      setError("");
      const data = await getPackages();
      setPackages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania pakietów");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();
  }, []);

  const filteredPackages = useMemo(() => {
    const query = normalize(search);

    return packages.filter((item) => {
      const name = normalize(item.name || "");
      const description = normalize(item.description || "");

      const matchesSearch =
        !query || name.includes(query) || description.includes(query);

      return matchesSearch && matchesFilter(item, activeFilter);
    });
  }, [packages, search, activeFilter]);

  const handleCreatePackage = async (payload: CreatePackagePayload) => {
    try {
      setIsSubmitting(true);
      setError("");
      await createPackage(payload);
      await loadPackages();
      setIsModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się dodać pakietu",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    try {
      setError("");
      await deletePackage(id);
      await loadPackages();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się usunąć pakietu",
      );
    }
  };

  return (
    <>
      <div className="max-w-[1000px] mx-auto">
        <div className="hidden md:block">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[560px]">
                <p className="text-label text-primary-light">
                  Zarządzanie pakietami
                </p>
                <h1 className="mt-2 text-[2.25rem] leading-[0.95] font-semibold font-display tracking-tight">
                  Pakiety <span className="text-primary-light">Treningowe</span>
                </h1>
                <p className="mt-3 text-base text-on-surface-variant">
                  Definiuj i optymalizuj ofertę treningową swojego studia.
                </p>
              </div>

              <Button
                variant="primary"
                icon={<Plus size={16} />}
                className="h-14"
                onClick={() => setIsModalOpen(true)}
              >
                Dodaj Nowy Pakiet
              </Button>
            </div>

            <PackageFilters
              search={search}
              activeFilter={activeFilter}
              onSearchChange={setSearch}
              onFilterChange={setActiveFilter}
            />

            <div className="flex items-center justify-between">
              <p className="text-section-title">Lista Pakietów</p>
              <p className="text-label text-on-surface-variant">
                Wyświetlono {filteredPackages.length} pakietów
              </p>
            </div>

            {error ? (
              <div className="card-shell p-4 text-error-light">{error}</div>
            ) : null}

            {isLoading ? (
              <div className="card-shell p-5 text-on-surface-variant">
                Ładowanie pakietów...
              </div>
            ) : filteredPackages.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {filteredPackages.map((item) => (
                  <PackageCard
                    key={item.id}
                    item={item}
                    onDelete={handleDeletePackage}
                  />
                ))}

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="min-h-[260px] rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:border-primary/40 transition-colors flex flex-col items-center justify-center text-center p-6"
                >
                  <span className="h-16 w-16 rounded-full bg-surface-container flex items-center justify-center">
                    <Plus size={28} />
                  </span>
                  <span className="mt-6 text-base font-semibold">
                    Utwórz nową ofertę
                  </span>
                  <span className="mt-2 text-sm leading-6 max-w-[220px]">
                    Zdefiniuj unikalny pakiet treningowy dla swoich klientów.
                  </span>
                </button>
              </div>
            ) : (
              <div className="card-shell p-8 text-center text-on-surface-variant">
                Brak pakietów dla wybranych kryteriów.
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden px-1 pb-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-page-title">Pakiety</p>
                <p className="mt-3 text-label text-primary-light">
                  Zarządzaj ofertą treningową
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="h-14 w-14 rounded-[var(--radius-lg)] bg-primary text-on-primary flex items-center justify-center shadow-soft"
              >
                <Plus size={24} />
              </button>
            </div>

            <PackageFilters
              search={search}
              activeFilter={activeFilter}
              onSearchChange={setSearch}
              onFilterChange={setActiveFilter}
            />

            <div className="flex items-center justify-between">
              <p className="text-section-title">Lista Pakietów</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-label text-primary-light"
              >
                Dodaj nowy pakiet
              </button>
            </div>

            {error ? (
              <div className="card-shell p-4 text-error-light">{error}</div>
            ) : null}

            <div className="flex flex-col gap-4">
              {isLoading ? (
                <div className="card-shell p-5 text-on-surface-variant">
                  Ładowanie pakietów...
                </div>
              ) : filteredPackages.length > 0 ? (
                filteredPackages.map((item) => (
                  <PackageCard
                    key={item.id}
                    item={item}
                    onDelete={handleDeletePackage}
                  />
                ))
              ) : (
                <div className="card-shell p-8 text-center text-on-surface-variant">
                  Brak pakietów.
                </div>
              )}

              <button
                onClick={() => setIsModalOpen(true)}
                className="min-h-[180px] rounded-[var(--radius-lg)] border border-dashed border-white/10 bg-surface-container-lowest text-on-surface-variant flex flex-col items-center justify-center text-center p-6"
              >
                <span className="h-14 w-14 rounded-full bg-surface-container flex items-center justify-center">
                  <Plus size={24} />
                </span>
                <span className="mt-5 text-base font-semibold">
                  Brakuje pakietu?
                </span>
                <span className="mt-2 text-sm leading-6 max-w-[260px]">
                  Stwórz nową ofertę dopasowaną do potrzeb klientów.
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddPackageModal
        open={isModalOpen}
        isSubmitting={isSubmitting}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePackage}
      />
    </>
  );
}
