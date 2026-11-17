"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

export function SidebarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map(({ href, label, icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-gold text-navy" : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {icon}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomTabs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-cloud bg-white md:hidden"
    >
      {items.map(({ href, label, icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold",
              active ? "text-navy" : "text-muted",
            )}
          >
            <span className={clsx("rounded-full px-4 py-1", active && "bg-gold")}>
              {icon}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
