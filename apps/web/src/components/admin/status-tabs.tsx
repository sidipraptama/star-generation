import Link from "next/link";
import clsx from "clsx";

export type StatusTab = { value: string; label: string };

type StatusTabsProps = {
  basePath: string;
  tabs: StatusTab[];
  active: string;
  defaultValue: string;
};

export function StatusTabs({ basePath, tabs, active, defaultValue }: StatusTabsProps) {
  return (
    <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        const href = tab.value === defaultValue ? basePath : `${basePath}?status=${tab.value}`;
        return (
          <Link
            key={tab.value}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              isActive
                ? "border-navy bg-navy text-white"
                : "border-cloud text-navy hover:bg-navy/5 bg-white",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function pickTab(tabs: StatusTab[], value: string | undefined, fallback: string) {
  return tabs.find((tab) => tab.value === value)?.value ?? fallback;
}
