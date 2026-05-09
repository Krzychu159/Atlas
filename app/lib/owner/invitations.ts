import { backendFetch } from "../backend";

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

function toQuery(params?: GetInvitationsParams) {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set("Status", params.status);
  if (params.role) searchParams.set("Role", params.role);
  if (params.locationId) {
    searchParams.set("LocationId", String(params.locationId));
  }
  if (params.search) searchParams.set("Search", params.search);

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

export function getInvitations(params?: GetInvitationsParams) {
  return backendFetch<Invitation[]>(`Invitations${toQuery(params)}`);
}

export function createInvitation(payload: CreateInvitationPayload) {
  return backendFetch<Invitation>("Invitations", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      locationId: 2,
    }),
  });
}

export function resendInvitation(id: number) {
  return backendFetch<Invitation>(`Invitations/${id}/resend`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function cancelInvitation(id: number) {
  return backendFetch<void>(`Invitations/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
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
