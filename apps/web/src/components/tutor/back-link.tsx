import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted hover:text-navy mb-3 inline-flex items-center gap-1 text-sm font-semibold"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
