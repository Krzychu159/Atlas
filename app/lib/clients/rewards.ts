export const CLIENT_REWARD_MILESTONES = [6, 12, 18, 24] as const;

export type ClientRewardProgress = {
  completedMonths: number;
  progressPercent: number;
  hasTrainingStartDate: boolean;
};

export function getClientRewardProgress(
  trainingStartDate?: string | null,
  now = new Date(),
): ClientRewardProgress {
  const startDate = parseLocalDate(trainingStartDate);

  if (!startDate || now.getTime() <= startDate.getTime()) {
    return {
      completedMonths: 0,
      progressPercent: 0,
      hasTrainingStartDate: Boolean(startDate),
    };
  }

  const rewardEndDate = new Date(startDate);
  rewardEndDate.setMonth(rewardEndDate.getMonth() + 24);

  const elapsed = now.getTime() - startDate.getTime();
  const duration = rewardEndDate.getTime() - startDate.getTime();
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((elapsed / duration) * 100)),
  );

  return {
    completedMonths: getCompletedMonths(startDate, now),
    progressPercent,
    hasTrainingStartDate: true,
  };
}

function getCompletedMonths(startDate: Date, now: Date) {
  let months =
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    now.getMonth() -
    startDate.getMonth();
  const currentMonthAnniversary = new Date(startDate);

  currentMonthAnniversary.setMonth(startDate.getMonth() + months);

  if (currentMonthAnniversary.getTime() > now.getTime()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function parseLocalDate(value?: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}
