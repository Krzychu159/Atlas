import {
  LayoutDashboard,
  UserPen,
  Users,
  CalendarDays,
  Settings,
  Wallet,
  ReceiptText,
} from "lucide-react";

export type AppRole = "owner" | "trainer" | "client";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const navigationByRole: Record<AppRole, NavItem[]> = {
  owner: [
    { label: "Panel", href: "/owner", icon: LayoutDashboard },
    { label: "Trenerzy", href: "/owner/trainers", icon: UserPen },
    { label: "Klienci", href: "/owner/clients", icon: Users },
    { label: "Grafik", href: "/owner/schedule", icon: CalendarDays },
    { label: "Pakiety", href: "/owner/packages", icon: Wallet },
    { label: "Rozliczenia", href: "/owner/settlements", icon: ReceiptText },
    { label: "Ustawienia", href: "/owner/settings", icon: Settings },
  ],
  trainer: [
    { label: "Panel", href: "/trainer", icon: LayoutDashboard },
    { label: "Klienci", href: "/trainer/clients", icon: Users },
    { label: "Ustawienia", href: "/trainer/settings", icon: Settings },
  ],
  client: [
    { label: "Panel", href: "/client", icon: LayoutDashboard },
    { label: "Płatności", href: "/client/payments", icon: Wallet },
    { label: "Grafik", href: "/client/schedule", icon: CalendarDays },
    { label: "Ustawienia", href: "/client/settings", icon: Settings },
  ],
};
