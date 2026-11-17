export type Option = { value: string; label: string; hint?: string };
export type OptionPage = { options: Option[]; hasMore: boolean };

/** How many options a remote list returns per request. */
export const PAGE_SIZE = 20;

const MAX_OFFSET = 100_000;

const normalize = (text: string) => text.trim().toLowerCase();

export function filterOptions(options: Option[], query: string) {
  const needle = normalize(query);
  if (!needle) return options;
  return options.filter(
    (option) =>
      normalize(option.label).includes(needle) ||
      (option.hint !== undefined && normalize(option.hint).includes(needle)),
  );
}

/** Escapes the characters that act as wildcards in a SQL LIKE pattern. */
export function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, "\\$&");
}

/** Server actions receive untrusted arguments, so clamp the offset to a sane integer. */
export function parseOffset(value: unknown) {
  const offset = Math.floor(Number(value));
  return Number.isFinite(offset) && offset > 0 ? Math.min(offset, MAX_OFFSET) : 0;
}

/** Turns PAGE_SIZE + 1 fetched rows into a page: the extra row only says there is more. */
export function toPage<T>(rows: T[], toOption: (row: T) => Option): OptionPage {
  return { options: rows.slice(0, PAGE_SIZE).map(toOption), hasMore: rows.length > PAGE_SIZE };
}
