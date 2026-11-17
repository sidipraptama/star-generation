import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function NoResults({ clearHref }: { clearHref: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title="Nothing matches your search"
      description="Try a different word, or remove a filter to see more."
      action={
        <ButtonLink href={clearHref} variant="secondary">
          Clear search and filters
        </ButtonLink>
      }
    />
  );
}
