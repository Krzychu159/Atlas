import { backendGet, backendPatch, backendPost, backendPut } from "./backend";

export type MilestoneDefinition = {
  id: number;
  name: string | null;
  requiredMonths: number;
  rewardName: string | null;
  description: string | null;
  isActive: boolean;
};

export type MilestoneDefinitionPayload = {
  name: string;
  requiredMonths: number;
  rewardName: string;
  description: string;
  isActive: boolean;
};

export type ClientMilestone = {
  id?: number;
  milestoneDefinitionId?: number;
  definitionId?: number;
  name?: string | null;
  milestoneName?: string | null;
  requiredMonths: number;
  rewardName?: string | null;
  description?: string | null;
  isActive?: boolean;
  isReached?: boolean;
  isAchieved?: boolean;
  isUnlocked?: boolean;
  rewardClaimed?: boolean;
  isRewardClaimed?: boolean;
  rewardClaimedAt?: string | null;
  rewardClaimNote?: string | null;
  rewardClaimedNote?: string | null;
  note?: string | null;
  completedMonths?: number;
  currentMonths?: number;
  monthsCompleted?: number;
  trainingMonths?: number;
  rewardClaimedByUserId?: number | null;
  rewardClaimedByUserName?: string | null;
  rewardClaimedByTrainerId?: number | null;
  rewardClaimedByTrainerName?: string | null;
};

export type ClientMilestonesResponse = {
  clientId: number;
  clientFullName: string | null;
  trainingStartDate: string | null;
  trainingDays: number;
  trainingMonths: number;
  milestones: ClientMilestone[];
};

export type MilestoneAccess = "owner" | "trainer" | "client";

export function getMilestoneDefinitions(includeInactive = false) {
  return backendGet<MilestoneDefinition[]>("owner/milestones/definitions", {
    includeInactive,
  });
}

export function createMilestoneDefinition(payload: MilestoneDefinitionPayload) {
  return backendPost<MilestoneDefinition>("owner/milestones/definitions", payload);
}

export function updateMilestoneDefinition(
  id: number,
  payload: MilestoneDefinitionPayload,
) {
  return backendPut<MilestoneDefinition>(
    `owner/milestones/definitions/${id}`,
    payload,
  );
}

export function deactivateMilestoneDefinition(id: number) {
  return backendPatch<MilestoneDefinition>(
    `owner/milestones/definitions/${id}/deactivate`,
  );
}

export function restoreMilestoneDefinition(id: number) {
  return backendPatch<MilestoneDefinition>(
    `owner/milestones/definitions/${id}/restore`,
  );
}

export async function getClientMilestones(access: MilestoneAccess, clientId?: number) {
  let response: ClientMilestonesResponse | ClientMilestone[];

  if (access === "client") {
    response = await backendGet<ClientMilestonesResponse | ClientMilestone[]>(
      "client-portal/milestones",
    );
  } else {
    const prefix = access === "owner" ? "owner" : "trainer-portal";
    response = await backendGet<ClientMilestonesResponse | ClientMilestone[]>(
      `${prefix}/clients/${clientId}/milestones`,
    );
  }

  if (Array.isArray(response)) {
    return {
      clientId: clientId ?? 0,
      clientFullName: null,
      trainingStartDate: null,
      trainingDays: 0,
      trainingMonths: getDtoCompletedMonths(response),
      milestones: response,
    } satisfies ClientMilestonesResponse;
  }

  return {
    ...response,
    milestones: Array.isArray(response.milestones) ? response.milestones : [],
  };
}

export function claimClientMilestone(
  access: Exclude<MilestoneAccess, "client">,
  clientId: number,
  milestoneDefinitionId: number,
  note?: string,
) {
  const prefix = access === "owner" ? "owner" : "trainer-portal";
  return backendPatch<ClientMilestone>(
    `${prefix}/clients/${clientId}/milestones/${milestoneDefinitionId}/claim`,
    { note: note?.trim() || null },
  );
}

export function unclaimClientMilestone(
  access: Exclude<MilestoneAccess, "client">,
  clientId: number,
  milestoneDefinitionId: number,
) {
  const prefix = access === "owner" ? "owner" : "trainer-portal";
  return backendPatch<ClientMilestone>(
    `${prefix}/clients/${clientId}/milestones/${milestoneDefinitionId}/unclaim`,
  );
}

export function getMilestoneId(milestone: ClientMilestone) {
  return milestone.milestoneDefinitionId ?? milestone.definitionId ?? milestone.id ?? 0;
}

export function isMilestoneClaimed(milestone: ClientMilestone) {
  return Boolean(
    milestone.rewardClaimed ??
      milestone.isRewardClaimed ??
      milestone.rewardClaimedAt,
  );
}

export function isMilestoneReached(milestone: ClientMilestone, completedMonths: number) {
  return Boolean(
    milestone.isReached ??
      milestone.isAchieved ??
      milestone.isUnlocked ??
      completedMonths >= milestone.requiredMonths,
  );
}

export function getDtoCompletedMonths(milestones: ClientMilestone[]) {
  for (const milestone of milestones) {
    const value =
      milestone.completedMonths ??
      milestone.currentMonths ??
      milestone.monthsCompleted ??
      milestone.trainingMonths;
    if (typeof value === "number") return Math.max(0, value);
  }

  return 0;
}
