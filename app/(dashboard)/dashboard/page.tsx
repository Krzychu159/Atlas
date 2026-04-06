import { Button } from "@/app/components/ui/button";
import { Download, CalendarDays } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-[1440px] mx-auto ">
      <div className="flex flex-col md:flex-row md:justify-between">
        <div>
          <p className="text-label text-primary-light">Performance Hub</p>
          <p className="text-3xl font-semibold">Dashboard Overview</p>
        </div>
        <div className="flex gap-5 mt-4 md:mt-0">
          <Button variant="secondary" icon={<CalendarDays size={16} />}>
            Last 30 Days
          </Button>

          <Button variant="primary" icon={<Download size={16} />}>
            Export Reports
          </Button>
        </div>
      </div>
      <div></div>
    </div>
  );
}
