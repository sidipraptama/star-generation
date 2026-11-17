import { LogOut, Star } from "lucide-react";
import { BottomTabs, SidebarLinks, type NavItem } from "@/components/layout/nav-links";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/auth";

const roleLabels = { admin: "Admin", tutor: "Tutor", student: "Student" } as const;

type AppShellProps = {
  profile: Profile;
  nav: NavItem[];
  children: React.ReactNode;
};

export function AppShell({ profile, nav, children }: AppShellProps) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-navy hidden w-64 shrink-0 flex-col p-4 text-white md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 pt-2">
          <span className="bg-gold text-navy grid size-9 place-items-center rounded-full">
            <Star className="size-5" fill="currentColor" aria-hidden />
          </span>
          <span className="text-lg font-bold">Star Generation</span>
        </div>
        <SidebarLinks items={nav} />
        <div className="mt-auto border-t border-white/15 pt-4">
          <p className="truncate px-2 text-sm font-semibold">{profile.full_name}</p>
          <p className="px-2 text-xs text-white/60">{roleLabels[profile.role]}</p>
          <form action={signOut} className="mt-3">
            <button
              type="submit"
              className="rounded-card flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-5" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="bg-navy flex items-center justify-between px-4 py-3 text-white md:hidden">
          <span className="flex items-center gap-2 font-bold">
            <Star className="text-gold size-5" fill="currentColor" aria-hidden />
            Star Generation
          </span>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="rounded-card p-2 hover:bg-white/10"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>

      <BottomTabs items={nav} />
    </div>
  );
}
