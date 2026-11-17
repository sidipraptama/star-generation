import { Badge } from "@/components/ui/badge";
import { HoursMeter } from "@/components/ui/hours-meter";
import { Clock } from "lucide-react";

type EnrollmentHoursProps = {
  status: "pending_payment" | "active" | "cancelled";
  balanceMinutes: number;
  invoices: { hours: number; status: string }[];
};

export function EnrollmentHours({ status, balanceMinutes, invoices }: EnrollmentHoursProps) {
  if (status === "pending_payment") {
    return (
      <Badge tone="warning" icon={Clock}>
        Waiting for payment
      </Badge>
    );
  }

  const purchasedMinutes = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((total, invoice) => total + invoice.hours * 60, 0);

  return (
    <div className="min-w-48">
      <HoursMeter leftMinutes={balanceMinutes} purchasedMinutes={purchasedMinutes} />
    </div>
  );
}
