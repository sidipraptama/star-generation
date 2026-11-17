import type { LucideIcon } from "lucide-react";

type StatProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
};

export function Stat({ icon: Icon, label, value, hint }: StatProps) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-cloud bg-white p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold/25">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="text-2xl leading-tight font-bold">{value}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}
