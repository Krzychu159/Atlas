import { CalendarSync } from "lucide-react";
import OutlookIntegrationCard from "./OutlookIntegrationCard";
import SettingsSectionHeader from "./SettingsSectionHeader";

// Sekcja: Integracje
export default function OutlookSettingsSection() {
  return (
    <section className="flex flex-col gap-4">
      <SettingsSectionHeader
        icon={<CalendarSync size={18} />}
        title="Integracje"
        description="Połączenia z zewnętrznymi usługami używanymi przez konto."
      />
      <OutlookIntegrationCard />
    </section>
  );
}
