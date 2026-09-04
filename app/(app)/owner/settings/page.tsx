import SettingsHeader from "./components/SettingsHeader";
import SettingsTabs from "./components/SettingsTabs";

export default function OwnerSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10">
      <SettingsHeader />
      <SettingsTabs />
    </div>
  );
}
