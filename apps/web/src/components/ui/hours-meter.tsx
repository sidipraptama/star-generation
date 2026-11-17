import clsx from "clsx";
import { formatDuration } from "@/lib/format";

type HoursMeterProps = {
  leftMinutes: number;
  purchasedMinutes: number;
};

export function HoursMeter({ leftMinutes, purchasedMinutes }: HoursMeterProps) {
  const left = Math.max(0, leftMinutes);
  const share = purchasedMinutes > 0 ? Math.min(100, (left / purchasedMinutes) * 100) : 0;
  const low = left === 0 || share <= 20;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-semibold">{formatDuration(left)} left</span>
        <span className="text-xs text-muted">of {formatDuration(purchasedMinutes)} bought</span>
      </div>
      <div
        role="progressbar"
        aria-label="Hours left"
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-cloud"
      >
        <div
          className={clsx("h-full rounded-full", low ? "bg-danger" : "bg-success")}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}
