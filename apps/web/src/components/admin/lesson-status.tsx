import { CircleCheck } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { isPast } from "@/lib/time";

type LessonStatusProps = {
  status: "scheduled" | "cancelled";
  endAt: string;
};

export function LessonStatus({ status, endAt }: LessonStatusProps) {
  if (status === "scheduled" && isPast(endAt)) {
    return (
      <Badge tone="success" icon={CircleCheck}>
        Completed
      </Badge>
    );
  }
  return <StatusBadge kind="lesson" status={status} />;
}
