import { formatDuration } from "@/lib/format";

type CancelCheck = {
  status: string | null;
  canCancel: boolean | null;
  balanceMinutes: number | null;
  hours: number | null;
};

/** Why a paid invoice cannot be cancelled any more, or undefined when it can (or needs no check). */
export function cancelBlockedReason({ status, canCancel, balanceMinutes, hours }: CancelCheck) {
  if (status !== "paid" || canCancel !== false || hours === null) return undefined;

  const left = Math.min(Math.max(0, balanceMinutes ?? 0), hours * 60);
  return left === 0
    ? `Cannot cancel: the student has already used all ${hours}h from this payment.`
    : `Cannot cancel: the student has already used some of these hours (${formatDuration(left)} left of ${hours}h).`;
}
