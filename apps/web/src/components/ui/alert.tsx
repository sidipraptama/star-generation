import clsx from "clsx";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

const tones = {
  danger: { style: "border-danger/40 bg-danger/10 text-danger-ink", Icon: CircleAlert },
  success: { style: "border-success/40 bg-success/10 text-success-ink", Icon: CircleCheck },
  info: { style: "border-gold/60 bg-gold/15 text-navy", Icon: Info },
} as const;

type AlertProps = {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
};

export function Alert({ tone = "info", children, className }: AlertProps) {
  const { style, Icon } = tones[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx("flex items-start gap-2 rounded-card border p-3 text-sm", style, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
