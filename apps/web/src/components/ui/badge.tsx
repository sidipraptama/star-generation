import clsx from "clsx";
import {
  Ban,
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  PencilLine,
  Send,
  type LucideIcon,
} from "lucide-react";

const tones = {
  success: "bg-success/12 text-success-ink",
  warning: "bg-gold/25 text-gold-ink",
  danger: "bg-danger/12 text-danger-ink",
  neutral: "bg-cloud/70 text-navy",
} as const;

type Tone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  icon: Icon,
  children,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

type StatusMeta = { label: string; tone: Tone; icon: LucideIcon };

const statuses = {
  invoice: {
    unpaid: { label: "Waiting for payment", tone: "warning", icon: Clock },
    paid: { label: "Paid", tone: "success", icon: CircleCheck },
    void: { label: "Cancelled", tone: "neutral", icon: Ban },
  },
  logbook: {
    draft: { label: "In progress", tone: "neutral", icon: PencilLine },
    changes_requested: { label: "Needs changes", tone: "danger", icon: CircleX },
    submitted: { label: "Waiting for review", tone: "warning", icon: Send },
    approved: { label: "Approved", tone: "success", icon: CircleCheck },
  },
  enrollment: {
    pending_payment: { label: "Waiting for payment", tone: "warning", icon: Clock },
    active: { label: "Active", tone: "success", icon: CircleCheck },
    cancelled: { label: "Cancelled", tone: "neutral", icon: Ban },
  },
  lesson: {
    scheduled: { label: "Scheduled", tone: "neutral", icon: Hourglass },
    cancelled: { label: "Cancelled", tone: "danger", icon: Ban },
  },
} as const satisfies Record<string, Record<string, StatusMeta>>;

type Statuses = typeof statuses;

export function StatusBadge<K extends keyof Statuses>({
  kind,
  status,
}: {
  kind: K;
  status: keyof Statuses[K];
}) {
  const meta = (statuses[kind] as Record<string, StatusMeta>)[status as string];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}
