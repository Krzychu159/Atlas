"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Trainers", href: "/trainers" },
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
              "group flex items-center rounded-xl px-3 py-3 transition-all duration-200",
              isActive
                ? "bg-primary-container text-on-primary-container shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
            ].join(" ")}
          >
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
