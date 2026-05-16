export type ScheduleView = "day" | "week";

export type SessionStatusFilter =
  | "without-cancelled"
  | "all"
  | "Planned"
  | "Active"
  | "Completed"
  | "Cancelled";

export type SessionFormValues = {
  title: string;
  startAt: string;
  endAt: string;
  trainerId: string;
  locationId: string;
  status: string;
  plannedSessionType: string;
  outlookCategories: string;
  participantIds: string[];
  note: string;
};
