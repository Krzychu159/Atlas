"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getLocations, type Location } from "./locations";

export const OWNER_LOCATION_ALL = "all";
export const OWNER_LOCATION_STORAGE_KEY = "atlas-owner-location-id";
export const OWNER_LOCATION_CHANGED_EVENT = "atlas-owner-location-changed";

export type OwnerLocationFilterValue = typeof OWNER_LOCATION_ALL | string;

export type OwnerLocationScopedEntity = {
  locationId?: number | null;
  locationIds?: number[] | null;
};

export function normalizeOwnerLocationFilterValue(
  value?: string | null,
): OwnerLocationFilterValue {
  if (value === OWNER_LOCATION_ALL) return OWNER_LOCATION_ALL;

  const numericValue = Number(value);

  if (Number.isInteger(numericValue) && numericValue > 0) {
    return String(numericValue);
  }

  return OWNER_LOCATION_ALL;
}

export function parseOwnerLocationId(value?: string | null) {
  const normalized = normalizeOwnerLocationFilterValue(value);

  if (normalized === OWNER_LOCATION_ALL) return null;

  return Number(normalized);
}

export function matchesOwnerLocationId(
  entity: OwnerLocationScopedEntity,
  selectedLocationId: number | null,
) {
  if (!selectedLocationId) return true;

  if (Array.isArray(entity.locationIds)) {
    return entity.locationIds.includes(selectedLocationId);
  }

  return entity.locationId === selectedLocationId;
}

function readStoredLocationValue() {
  if (typeof window === "undefined") return OWNER_LOCATION_ALL;

  try {
    return normalizeOwnerLocationFilterValue(
      window.localStorage.getItem(OWNER_LOCATION_STORAGE_KEY),
    );
  } catch {
    return OWNER_LOCATION_ALL;
  }
}

export function useOwnerLocationFilter() {
  const [selectedLocationValue, setSelectedLocationValueState] =
    useState<OwnerLocationFilterValue>(() => readStoredLocationValue());

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== OWNER_LOCATION_STORAGE_KEY) return;

      setSelectedLocationValueState(
        normalizeOwnerLocationFilterValue(event.newValue),
      );
    }

    function handleLocationChange(event: Event) {
      const customEvent = event as CustomEvent<{
        value?: string | null;
      }>;

      setSelectedLocationValueState(
        normalizeOwnerLocationFilterValue(customEvent.detail?.value),
      );
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(OWNER_LOCATION_CHANGED_EVENT, handleLocationChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        OWNER_LOCATION_CHANGED_EVENT,
        handleLocationChange,
      );
    };
  }, []);

  const selectedLocationId = useMemo(
    () => parseOwnerLocationId(selectedLocationValue),
    [selectedLocationValue],
  );

  const setSelectedLocationValue = useCallback(
    (value: OwnerLocationFilterValue) => {
      const normalized = normalizeOwnerLocationFilterValue(value);

      setSelectedLocationValueState(normalized);

      if (typeof window === "undefined") return;

      try {
        window.localStorage.setItem(OWNER_LOCATION_STORAGE_KEY, normalized);
      } catch { /* Keep the filter usable when browser storage is unavailable. */ }
      window.dispatchEvent(
        new CustomEvent(OWNER_LOCATION_CHANGED_EVENT, {
          detail: { value: normalized },
        }),
      );
    },
    [],
  );

  return {
    selectedLocationValue,
    selectedLocationId,
    setSelectedLocationValue,
  };
}

export type OwnerLocationOption = { value: OwnerLocationFilterValue; label: string };
export type OwnerLocationOptionsStatus = "loading" | "ready" | "error";

let activeLocationsRequest: Promise<Location[]> | null = null;
const subscribeNothing = () => () => {};

// The desktop topbar and the mobile switcher share one request per page load.
function loadActiveLocations() {
  activeLocationsRequest ??= getLocations()
    .then((locations) => locations.filter((location) => location.isActive))
    .catch((error: unknown) => {
      activeLocationsRequest = null;
      throw error;
    });
  return activeLocationsRequest;
}

export function ownerLocationLabel(location: Pick<Location, "id" | "name" | "city">) {
  return location.name || location.city || `Lokalizacja ${location.id}`;
}

/**
 * Options for the global location switcher. A stale selection is reset only after the list loaded
 * successfully — a failed load keeps the current scope instead of widening it to all locations.
 */
export function useOwnerLocationOptions(enabled: boolean) {
  const { selectedLocationValue, setSelectedLocationValue } = useOwnerLocationFilter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [status, setStatus] = useState<OwnerLocationOptionsStatus>("loading");
  // The stored selection is unknown on the server, so the first render shows the server value to keep hydration stable.
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const displayedValue = hydrated ? selectedLocationValue : OWNER_LOCATION_ALL;

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    function load(attempt: number) {
      loadActiveLocations()
        .then((data) => {
          if (!active) return;
          setLocations(data);
          setStatus("ready");
        })
        .catch((error: unknown) => {
          if (!active) return;
          // A request interrupted by a session refresh is retried instead of being shown as a failure.
          if (error instanceof DOMException && error.name === "AbortError" && attempt < 2) load(attempt + 1);
          else setStatus("error");
        });
    }
    load(0);

    return () => {
      active = false;
    };
  }, [enabled]);

  const options = useMemo<OwnerLocationOption[]>(() => {
    const items: OwnerLocationOption[] = [
      { value: OWNER_LOCATION_ALL, label: "Wszystkie lokalizacje" },
      ...locations.map((location) => ({ value: String(location.id), label: ownerLocationLabel(location) })),
    ];
    if (status !== "ready" && displayedValue !== OWNER_LOCATION_ALL) {
      items.push({
        value: displayedValue,
        label: status === "error" ? "Wybrana lokalizacja" : "Wczytywanie lokalizacji…",
      });
    }
    return items;
  }, [displayedValue, locations, status]);

  useEffect(() => {
    if (!enabled || status !== "ready" || selectedLocationValue === OWNER_LOCATION_ALL) return;
    if (!locations.some((location) => String(location.id) === selectedLocationValue)) {
      setSelectedLocationValue(OWNER_LOCATION_ALL);
    }
  }, [enabled, locations, selectedLocationValue, setSelectedLocationValue, status]);

  return { options, status, selectedLocationValue: displayedValue, setSelectedLocationValue };
}
