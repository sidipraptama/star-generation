import { GraduationCap, Receipt, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/nav-links";
import { requireRole } from "@/lib/auth";

const iconClass = "size-5";

const nav: NavItem[] = [
  {
    href: "/student/classes",
    label: "My classes",
    icon: <GraduationCap className={iconClass} aria-hidden />,
  },
  {
    href: "/student/browse",
    label: "Find a class",
    icon: <Search className={iconClass} aria-hidden />,
  },
  {
    href: "/student/invoices",
    label: "Invoices",
    icon: <Receipt className={iconClass} aria-hidden />,
  },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  return (
    <AppShell profile={profile} nav={nav}>
      {children}
    </AppShell>
  );
}
