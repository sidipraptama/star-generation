import { BookOpen, CalendarDays, LayoutDashboard, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/nav-links";
import { requireRole } from "@/lib/auth";

const iconClass = "size-5";

const nav: NavItem[] = [
  {
    href: "/tutor",
    label: "Overview",
    icon: <LayoutDashboard className={iconClass} aria-hidden />,
    exact: true,
  },
  {
    href: "/tutor/classes",
    label: "My classes",
    icon: <BookOpen className={iconClass} aria-hidden />,
  },
  {
    href: "/tutor/schedule",
    label: "Schedule",
    icon: <CalendarDays className={iconClass} aria-hidden />,
  },
  {
    href: "/tutor/earnings",
    label: "Earnings",
    icon: <Wallet className={iconClass} aria-hidden />,
  },
];

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("tutor");
  return (
    <AppShell profile={profile} nav={nav}>
      {children}
    </AppShell>
  );
}
