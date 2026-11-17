import { addMonths, buildHref, monthStart } from "@/lib/calendar";
import { formatMonth } from "@/lib/format";
import { escapeLike } from "@/lib/options";

/** Rows per page on every table, and cards per page on the card lists. */
export const ROWS_PER_PAGE = 20;
export const CARDS_PER_PAGE = 12;

const MAX_PAGE = 100_000;
const MAX_SEARCH_LENGTH = 100;

type RawParam = string | string[] | undefined;

/** The first value of a search parameter, trimmed, or undefined when it is missing or empty. */
export function param(value: RawParam) {
  const text = (Array.isArray(value) ? value[0] : value)?.trim();
  return text ? text : undefined;
}

export function parseSearch(value: RawParam) {
  return param(value)?.replace(/\s+/g, " ").slice(0, MAX_SEARCH_LENGTH);
}

export function parsePage(value: RawParam) {
  const page = Math.floor(Number(param(value)));
  return Number.isFinite(page) && page > 1 ? Math.min(page, MAX_PAGE) : 1;
}

/** The inclusive row range for Supabase's `.range()`. */
export function pageBounds(page: number, size = ROWS_PER_PAGE) {
  return { from: (page - 1) * size, to: page * size - 1 };
}

export function pageCount(total: number, size = ROWS_PER_PAGE) {
  return Math.max(1, Math.ceil(total / size));
}

/** The page numbers to show: first, last and the neighbours of the current page, with gaps. */
export function pageWindow(page: number, pages: number): (number | "gap")[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  sorted.forEach((number, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && number - previous === 2) result.push(number - 1);
    else if (previous !== undefined && number - previous > 2) result.push("gap");
    result.push(number);
  });
  return result;
}

/** The numbers in "Showing 21–40 of 132". */
export function pageSummary(page: number, total: number, size = ROWS_PER_PAGE) {
  if (total === 0) return { first: 0, last: 0 };
  return { first: (page - 1) * size + 1, last: Math.min(page * size, total) };
}

/**
 * A PostgREST `or` filter that matches the text in any of the columns, ignoring case.
 * The pattern is quoted because commas and brackets in a search would otherwise end the filter.
 */
export function orIlike(columns: string[], text: string) {
  const quoted = escapeLike(text).replace(/[\\"]/g, "\\$&");
  return columns.map((column) => `${column}.ilike."%${quoted}%"`).join(",");
}

/** A link to a list with the given parameters. Empty values and page 1 are left out. */
export function listHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page = 1,
  pageParam = "page",
) {
  return buildHref(basePath, { ...params, [pageParam]: page > 1 ? String(page) : undefined });
}

/** The current month and the ones before it, as options for a month filter. */
export function recentMonths(today: string, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const month = addMonths(monthStart(today), -index);
    return { value: month, label: formatMonth(month) };
  });
}

/** The page numbers of a screen with several paged lists, as link parameters, leaving one out. */
export function otherPages(pages: Record<string, number>, without: string) {
  return Object.fromEntries(
    Object.entries(pages)
      .filter(([key, page]) => key !== without && page > 1)
      .map(([key, page]) => [key, String(page)]),
  );
}
