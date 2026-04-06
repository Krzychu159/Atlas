"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserPen,
  Users,
  CalendarDays,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trainers", href: "/trainers", icon: UserPen },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "group flex items-center  px-3 py-3 transition-all duration-200",
              isActive
                ? "bg-surface-container border-l-4 border-primary text-primary-light shadow-soft "
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
            ].join(" ")}
          >
            <item.icon className="mr-3 h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
