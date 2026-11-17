import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listHref, pageCount, pageSummary, pageWindow, ROWS_PER_PAGE } from "@/lib/list";

type PaginationProps = {
  basePath: string;
  /** The other parameters of the page, kept in every link. */
  params: Record<string, string | undefined>;
  page: number;
  total: number;
  /** What is being counted, in the plural: "invoices". */
  noun: string;
  size?: number;
  /** Use a different parameter when a page has more than one paged list. */
  pageParam?: string;
};

const linkClass =
  "rounded-card border px-3 py-1.5 text-sm font-semibold transition-colors inline-flex items-center gap-1";

export function Pagination({
  basePath,
  params,
  page,
  total,
  noun,
  size = ROWS_PER_PAGE,
  pageParam = "page",
}: PaginationProps) {
  if (total === 0) return null;

  const pages = pageCount(total, size);
  const { first, last } = pageSummary(page, total, size);
  const href = (target: number) => listHref(basePath, params, target, pageParam);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted text-sm" aria-live="polite">
        Showing {first}–{last} of {total} {noun}
      </p>

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              rel="prev"
              className={clsx(linkClass, "border-cloud hover:bg-navy/5 bg-white")}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Link>
          ) : (
            <span aria-disabled className={clsx(linkClass, "border-cloud bg-white opacity-40")}>
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </span>
          )}

          <p className="text-muted px-2 text-sm sm:hidden">
            Page {page} of {pages}
          </p>

          <ul className="hidden items-center gap-1.5 sm:flex">
            {pageWindow(page, pages).map((entry, index) =>
              entry === "gap" ? (
                <li key={`gap-${index}`} aria-hidden className="text-muted px-1">
                  …
                </li>
              ) : (
                <li key={entry}>
                  <Link
                    href={href(entry)}
                    aria-label={`Page ${entry}`}
                    aria-current={entry === page ? "page" : undefined}
                    className={clsx(
                      linkClass,
                      "min-w-9 justify-center",
                      entry === page
                        ? "border-navy bg-navy text-white"
                        : "border-cloud hover:bg-navy/5 bg-white",
                    )}
                  >
                    {entry}
                  </Link>
                </li>
              ),
            )}
          </ul>

          {page < pages ? (
            <Link
              href={href(page + 1)}
              rel="next"
              className={clsx(linkClass, "border-cloud hover:bg-navy/5 bg-white")}
            >
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span aria-disabled className={clsx(linkClass, "border-cloud bg-white opacity-40")}>
              Next
              <ChevronRight className="size-4" aria-hidden />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
