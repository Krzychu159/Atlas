import type { OwnerSession } from "@/app/lib/owner/sessions";

export function getOwnerSessionPackageName(session: OwnerSession) {
  const packageNames = Array.from(
    new Set(
      session.participants
        ?.map((participant) => participant.packageName?.trim())
        .filter((value): value is string => Boolean(value)) || [],
    ),
  );

  if (!packageNames.length) return "Brak pakietu";
  if (packageNames.length === 1) return packageNames[0];

  return `${packageNames[0]} +${packageNames.length - 1}`;
}
