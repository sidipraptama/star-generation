import type { LucideIcon } from "lucide-react";

type StatProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
};

export function Stat({ icon: Icon, label, value, hint }: StatProps) {
  return (
    <div className="rounded-card border-cloud flex items-center gap-4 border bg-white p-5">
      <span className="bg-gold/25 grid size-11 shrink-0 place-items-center rounded-full">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-muted text-sm">{label}</p>
        <p className="text-2xl leading-tight font-bold">{value}</p>
        {hint && <p className="text-muted text-xs">{hint}</p>}
      </div>
    </div>
  );
}
