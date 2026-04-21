import {
  LayoutDashboard,
  UserPen,
  Users,
  CalendarDays,
  Settings,
  Wallet,
} from "lucide-react";

export type AppRole = "owner" | "trainer" | "client";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const navigationByRole: Record<AppRole, NavItem[]> = {
  owner: [
    { label: "Dashboard", href: "/owner", icon: LayoutDashboard },
    { label: "Trainers", href: "/owner/trainers", icon: UserPen },
    { label: "Clients", href: "/owner/clients", icon: Users },
    { label: "Schedule", href: "/owner/schedule", icon: CalendarDays },
    { label: "Packages", href: "/owner/packages", icon: Wallet },
    { label: "Settings", href: "/owner/settings", icon: Settings },
  ],
  trainer: [
    { label: "Dashboard", href: "/trainer", icon: LayoutDashboard },
    { label: "Clients", href: "/trainer/clients", icon: Users },
    { label: "Settings", href: "/trainer/settings", icon: Settings },
  ],
  client: [
    { label: "Dashboard", href: "/client", icon: LayoutDashboard },
    { label: "Pay", href: "/client/payments", icon: Wallet },
    { label: "Schedule", href: "/client/schedule", icon: CalendarDays },
    { label: "Settings", href: "/client/settings", icon: Settings },
  ],
};
