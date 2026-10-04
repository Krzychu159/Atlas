import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidAppRole } from "@/app/lib/server/session";

export default async function OwnerTrainersLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;

  if (role !== "owner") {
    redirect(isValidAppRole(role) ? `/${role}` : "/login");
  }

  return children;
}
