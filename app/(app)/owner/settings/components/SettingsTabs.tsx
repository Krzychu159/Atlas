"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Building2,
  Gift,
  Plug,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import ProfileSettingsCard from "@/app/components/settings/profile-settings-card";
import CompanySettingsSection from "./CompanySettingsSection";
import OutlookSettingsSection from "./OutlookSettingsSection";
import RewardsSettingsSection from "./RewardsSettingsSection";
import SystemSettingsSection from "./SystemSettingsSection";

const settingsTabs = [
  { id: "profile", label: "Profil", icon: UserRound },
  { id: "company", label: "Firma", icon: Building2 },
  { id: "system", label: "System", icon: SlidersHorizontal },
  { id: "rewards", label: "Nagrody", icon: Gift },
  { id: "integrations", label: "Integracje", icon: Plug },
] as const;

type SettingsTab = (typeof settingsTabs)[number]["id"];

export default function SettingsTabs() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [visitedTabs, setVisitedTabs] = useState<SettingsTab[]>(["profile"]);

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    setVisitedTabs((current) =>
      current.includes(tab) ? current : [...current, tab],
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % settingsTabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + settingsTabs.length) % settingsTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = settingsTabs.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = settingsTabs[nextIndex];
    selectTab(nextTab.id);
    document.getElementById(`settings-tab-${nextTab.id}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto border-b border-white/8">
        <div
          role="tablist"
          aria-label="Sekcje ustawień"
          className="flex min-w-max gap-7"
        >
          {settingsTabs.map(({ id, label, icon: Icon }, index) => {
            const isActive = activeTab === id;

            return (
              <button
                key={id}
                id={`settings-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`settings-panel-${id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectTab(id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`group relative flex h-12 items-center gap-2 text-sm font-semibold transition-colors hover:text-on-surface focus-visible:text-on-surface ${
                  isActive ? "text-on-surface" : "text-on-surface-muted"
                }`}
              >
                <Icon
                  size={16}
                  className={`transition-colors ${
                    isActive
                      ? "text-primary-light"
                      : "group-hover:text-primary-light"
                  }`}
                />
                {label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full bg-primary-light transition-transform ${
                    isActive
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <TabPanel id="profile" activeTab={activeTab} visitedTabs={visitedTabs}>
        <ProfileSettingsCard fallbackLabel="Owner" />
      </TabPanel>

      <TabPanel id="company" activeTab={activeTab} visitedTabs={visitedTabs}>
        <CompanySettingsSection />
      </TabPanel>

      <TabPanel id="system" activeTab={activeTab} visitedTabs={visitedTabs}>
        <SystemSettingsSection />
      </TabPanel>

      <TabPanel id="rewards" activeTab={activeTab} visitedTabs={visitedTabs}>
        <RewardsSettingsSection />
      </TabPanel>

      <TabPanel
        id="integrations"
        activeTab={activeTab}
        visitedTabs={visitedTabs}
      >
        <OutlookSettingsSection />
      </TabPanel>
    </div>
  );
}

function TabPanel({
  id,
  activeTab,
  visitedTabs,
  children,
}: {
  id: SettingsTab;
  activeTab: SettingsTab;
  visitedTabs: SettingsTab[];
  children: ReactNode;
}) {
  if (!visitedTabs.includes(id)) return null;

  return (
    <div
      id={`settings-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`settings-tab-${id}`}
      tabIndex={0}
      hidden={activeTab !== id}
    >
      {children}
    </div>
  );
}
