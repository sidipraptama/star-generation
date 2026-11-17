import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <EmptyState
        icon={SearchX}
        title="We could not find that page"
        description="The link may be old, or you may not have access to it."
        action={<ButtonLink href="/">Go to my home page</ButtonLink>}
      />
    </main>
  );
}
