"use client";

import { useState } from "react";
import { Bell, LogOut, Search, CircleUserRound } from "lucide-react";
import Link from "next/link";
import NotificationsPanel from "@/app/(app)/owner/components/NotificationsPanel";

export function Header() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <>
      <header className="max-w-[1000px] mx-auto mt-4 mb-12 grid grid-cols-[1fr_auto] items-center">
        <div className="flex justify-between border-r-2 border-surface-container pr-4">
          <div className="relative hidden md:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search members"
              className="min-w-lg pl-10 pr-6 py-3 text-sm rounded bg-surface-container-lowest focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4 ml-auto md:ml-16">
            <Link
              href="/owner/notifications"
              className="md:hidden relative text-on-surface-variant hover:text-on-surface"
            >
              <Bell width={18} height={18} />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-tertiary-light" />
            </Link>

            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="hidden md:block relative text-on-surface-variant hover:text-on-surface"
              aria-label="Otwórz powiadomienia"
            >
              <Bell width={18} height={18} />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-tertiary-light" />
            </button>

            <Link href="/logout">
              <LogOut width={18} height={18} />
            </Link>
          </div>
        </div>

        <div className="hidden md:flex px-4 gap-4">
          <div>
            <p className="text-label text-on-surface-muted">Full Name</p>
            <p className="text-xs text-on-surface">Role</p>
          </div>
          <CircleUserRound width={32} height={32} />
        </div>
      </header>

      <NotificationsPanel
        open={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </>
  );
}
