export type ScheduleView = "day" | "week";

export type SessionStatusFilter =
  | "without-cancelled"
  | "all"
  | "Planned"
  | "Active"
  | "Completed"
  | "Cancelled";

export type SessionFormValues = {
  correctionReason?: string;
  actualSessionType?: string;
  isPubliclyBookable: boolean;
  publicCapacity: string;
  publicSlug: string;
  participantsEdited: boolean;
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
