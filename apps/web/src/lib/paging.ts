import "server-only";
import { redirect } from "next/navigation";
import { pageCount, ROWS_PER_PAGE } from "@/lib/list";

type PagedResult = { count: number | null; error: object | null };

/**
 * A page past the end (an old link, or rows that were deleted) goes back into range instead of
 * showing an empty list. When the rows still exist, that is the last page. The database refuses a
 * range that starts after the last row, so a failed query on a later page starts again from page 1;
 * a real error then shows on page 1, which never redirects.
 */
export function stayInRange(
  page: number,
  result: PagedResult,
  hrefFor: (page: number) => string,
  size = ROWS_PER_PAGE,
) {
  if (result.error) {
    if (page > 1) redirect(hrefFor(1));
    return;
  }

  const total = result.count ?? 0;
  const pages = pageCount(total, size);
  if (total > 0 && page > pages) redirect(hrefFor(pages));
}
