import { BookOpen, CalendarDays, LayoutDashboard, NotebookPen, Receipt, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/nav-links";
import { requireRole } from "@/lib/auth";

const iconClass = "size-5";

const nav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard className={iconClass} aria-hidden />, exact: true },
  { href: "/admin/classes", label: "Classes", icon: <BookOpen className={iconClass} aria-hidden /> },
  { href: "/admin/students", label: "Students", icon: <Users className={iconClass} aria-hidden /> },
  { href: "/admin/invoices", label: "Invoices", icon: <Receipt className={iconClass} aria-hidden /> },
  { href: "/admin/schedule", label: "Schedule", icon: <CalendarDays className={iconClass} aria-hidden /> },
  { href: "/admin/logbooks", label: "Logbooks", icon: <NotebookPen className={iconClass} aria-hidden /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");
  return (
    <AppShell profile={profile} nav={nav}>
      {children}
    </AppShell>
  );
}
