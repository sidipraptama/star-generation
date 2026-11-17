"use client";

import { RouteError } from "@/components/layout/route-error";

export default function Error({ reset }: { reset: () => void }) {
  return <RouteError reset={reset} />;
}
