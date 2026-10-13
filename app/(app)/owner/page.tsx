import { currentDashboardPeriod } from "@/app/lib/owner/dashboard-overview";
import OwnerOverview from "./components/OwnerOverview";

export default function DashboardPage() {
  return <OwnerOverview currentPeriod={currentDashboardPeriod()} />;
}
