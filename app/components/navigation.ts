import {
  LayoutDashboard,
  UserPen,
  Users,
  CalendarDays,
  Settings,
  Wallet,
  ReceiptText,
  CreditCard,
  HandCoins,
  ChartNoAxesCombined,
  Gift,
  Bell,
} from "lucide-react";

export type AppRole = "owner" | "trainer" | "client";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  mobileOnly?: boolean;
};

export const navigationByRole: Record<AppRole, NavItem[]> = {
  owner: [
    { label: "Panel", href: "/owner", icon: LayoutDashboard },
    { label: "Trenerzy", href: "/owner/trainers", icon: UserPen },
    { label: "Klienci", href: "/owner/clients", icon: Users },
    { label: "Grafik", href: "/owner/schedule", icon: CalendarDays },
    { label: "Pakiety", href: "/owner/packages", icon: Wallet },
    { label: "Płatności", href: "/owner/payments", icon: CreditCard },
    { label: "Wydatki", href: "/owner/expenses", icon: HandCoins },
    {
      label: "Statystyki",
      href: "/owner/statistics",
      icon: ChartNoAxesCombined,
    },
    { label: "Rozliczenia", href: "/owner/settlements", icon: ReceiptText },
    { label: "Ustawienia", href: "/owner/settings", icon: Settings },
    { label: "Powiadomienia", href: "/owner/notifications", icon: Bell, mobileOnly: true },
  ],
  trainer: [
    { label: "Panel", href: "/trainer", icon: LayoutDashboard },
    { label: "Klienci", href: "/trainer/clients", icon: Users },
    { label: "Plan", href: "/trainer/schedule", icon: CalendarDays },
    { label: "Pakiety", href: "/trainer/packages", icon: Wallet },
    { label: "Płatności", href: "/trainer/payments", icon: CreditCard },
    { label: "Ustawienia", href: "/trainer/settings", icon: Settings },
    { label: "Powiadomienia", href: "/trainer/notifications", icon: Bell, mobileOnly: true },
  ],
  client: [
    { label: "Panel", href: "/client", icon: LayoutDashboard },
    { label: "Nagrody", href: "/client/rewards", icon: Gift },
    { label: "Płatności", href: "/client/payments", icon: Wallet },
    { label: "Plan", href: "/client/schedule", icon: CalendarDays },
    { label: "Zajęcia grupowe", href: "/zajecia", icon: Users },
    { label: "Ustawienia", href: "/client/settings", icon: Settings },
    { label: "Powiadomienia", href: "/client/notifications", icon: Bell, mobileOnly: true },
  ],
};
