import type { OwnerSession } from "@/app/lib/owner/sessions";

export type CalendarSession = { canEdit?: boolean } & Partial<OwnerSession> & Pick<OwnerSession, "id" | "title" | "note" | "startAt" | "endAt" | "status">;

export type ScheduleView = "day" | "week";

export type SessionStatusFilter =
  | "without-cancelled"
  | "all"
  | "Planned"
  | "Active"
  | "Completed"
  | "Cancelled";

export type SessionFormValues = {
  newParticipantCountsAgainstPackage?: boolean;
  newParticipantSessionsCharged?: string;
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
