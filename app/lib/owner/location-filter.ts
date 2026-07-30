"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

  return normalizeOwnerLocationFilterValue(
    window.localStorage.getItem(OWNER_LOCATION_STORAGE_KEY),
  );
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

      window.localStorage.setItem(OWNER_LOCATION_STORAGE_KEY, normalized);
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
