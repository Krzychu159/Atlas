"use client";

import { useState } from "react";
import TrainingCalendar, {
  type SessionEvent,
} from "@/app/components/TrainingCalendar";
import SessionDetailsModal from "./components/SessionDetailModal";

export default function SchedulePage() {
  const [selectedSession, setSelectedSession] = useState<SessionEvent | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectSession = (session: SessionEvent) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  return (
    <>
      <div className="max-w-[1000px] mx-auto">
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-[560px]">
              <p className="text-label text-primary-light">
                Sprawdź swój plan zajęć
              </p>
              <h1 className="mt-2 text-[2.25rem] leading-[0.95] mb-3 font-semibold font-display tracking-tight">
                Plan <span className="text-primary-light">Zajęć</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-surface-container p-1">
              <button className="px-4 py-2.5 rounded-[10px] bg-surface-container-low text-on-surface text-sm font-medium">
                Dzień
              </button>
              <button className="px-4 py-2.5 rounded-[10px] bg-primary text-on-primary text-sm font-medium">
                Tydzień
              </button>
            </div>
          </div>

          <div className="card-shell p-4 md:p-5 overflow-hidden">
            <TrainingCalendar onSelectSession={handleSelectSession} />
          </div>
        </div>
      </div>

      <SessionDetailsModal
        session={selectedSession}
        open={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
