import type { SessionStatusFilter } from "./types";
import { userTrainingType } from "@/app/lib/user-messages";

export const sessionBillingTypeOptions = ["OneToOne", "TwoToOne", "ThreeToOne", "FourToOne", "Group"].map(value => ({ value, label: userTrainingType(value) }));

export const statusOptions = [
  { value: "", label: "Domyślnie" },
  { value: "Planned", label: "Zaplanowana" },
  { value: "Active", label: "Aktywna" },
  { value: "Completed", label: "Zrealizowana" },
  { value: "Cancelled", label: "Anulowana" },
];

export const scheduleStatusFilterOptions: {
  value: SessionStatusFilter;
  label: string;
}[] = [
  { value: "without-cancelled", label: "Bez anulowanych" },
  { value: "all", label: "Wszystkie statusy" },
  { value: "Planned", label: "Tylko zaplanowane" },
  { value: "Active", label: "Tylko aktywne" },
  { value: "Completed", label: "Tylko zrealizowane" },
  { value: "Cancelled", label: "Tylko anulowane" },
];

export const sessionTypeOptions = [
  { value: "", label: "Domyślnie" },
  ...sessionBillingTypeOptions,
  { value: "Consultation", label: "Konsultacja" },
];
