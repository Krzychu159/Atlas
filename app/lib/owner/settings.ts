import { backendGet, backendPut } from "../backend";

export type OwnerSettings = {
  defaultPackageValidityDays: number;
  defaultSessionDurationMinutes: number;
  defaultPaymentDueDays: number;
};

export type UpdateOwnerSettingsPayload = Partial<OwnerSettings>;

export function getOwnerSettings() {
  return backendGet<OwnerSettings>("owner/settings");
}

export function updateOwnerSettings(payload: UpdateOwnerSettingsPayload) {
  return backendPut<OwnerSettings>("owner/settings", payload);
}
