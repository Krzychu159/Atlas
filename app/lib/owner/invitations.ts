import { backendGet, backendPost } from "../backend";

export type InvitationRole = "Client" | "Trainer";

export type Invitation = {
  id: number;
  email: string;
  role: string;
  locationId: number;
  locationName: string;
  token: string;
  inviteLink: string;
  expiresAt: string;
  isAccepted: boolean;
  acceptedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  status: string;
};

export type CreateInvitationPayload = {
  email: string;
  role: InvitationRole;
  locationId: number;
};

export type GetInvitationsParams = {
  status?: string;
  role?: InvitationRole;
  locationId?: number;
  search?: string;
};

export function getInvitations(params?: GetInvitationsParams) {
  return backendGet<Invitation[]>("Invitations", {
    Status: params?.status,
    Role: params?.role,
    LocationId: params?.locationId,
    Search: params?.search,
  });
}

export function createInvitation(payload: CreateInvitationPayload) {
  return backendPost<Invitation>("Invitations", {
    ...payload,
    locationId: 2,
  });
}

export function resendInvitation(id: number) {
  return backendPost<Invitation>(`Invitations/${id}/resend`);
}

export function cancelInvitation(id: number) {
  return backendPost<void>(`Invitations/${id}/cancel`);
}

export function isPendingInvitation(invitation: Invitation) {
  const status = invitation.status?.toLowerCase() || "";

  return (
    !invitation.isAccepted &&
    !invitation.acceptedAt &&
    !invitation.cancelledAt &&
    !status.includes("accepted") &&
    !status.includes("cancel") &&
    !status.includes("anul") &&
    !status.includes("wycof")
  );
}
