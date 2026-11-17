"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function RouteError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something went wrong"
      description="We could not load this page. Please try again."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
