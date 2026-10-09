import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ActivityLogPageClient } from "./components/ActivityLogPageClient";

export default async function ActivityLogPage() {
  const role = (await cookies()).get("role")?.value;
  if (role !== "owner") redirect(role === "trainer" ? "/trainer" : role === "client" ? "/client" : "/login");
  return <ActivityLogPageClient />;
}
