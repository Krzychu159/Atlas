import type { TrainerSessionDetails } from "@/app/lib/trainer/portal";
import type { OwnerSession, OwnerSessionParticipant } from "@/app/lib/owner/sessions";

export type SessionEditorSession = OwnerSession | TrainerSessionDetails;
export type CalendarSession = { canEdit?: boolean; locationId?: number | null; participants?: (Pick<OwnerSessionParticipant, "clientId" | "clientFullName" | "attendanceStatus"> & { packageName?: string | null })[] | null } & Partial<Omit<OwnerSession, "locationId" | "participants">> & Pick<OwnerSession, "id" | "title" | "note" | "startAt" | "endAt" | "status">;

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
  eventRules: string;
  registrationClosesBeforeMinutes: string;
  cancellationClosesBeforeMinutes: string;
};
