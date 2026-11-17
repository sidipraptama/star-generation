import Form from "next/form";
import Link from "next/link";
import { SearchInput } from "@/components/list/search-input";

type ListToolbarProps = {
  /** The page the form searches: its own path. */
  action: string;
  query: string;
  placeholder: string;
  /** Parameters to keep when searching, such as the selected status tab. */
  keep?: Record<string, string | undefined>;
  /** Shows the clear link when a search or filter is applied. */
  filtered: boolean;
  clearHref: string;
  /** The filters: comboboxes that submit the form when you choose. */
  children?: React.ReactNode;
};

export function ListToolbar({
  action,
  query,
  placeholder,
  keep,
  filtered,
  clearHref,
  children,
}: ListToolbarProps) {
  return (
    <Form action={action} className="mb-4 flex flex-wrap items-center gap-3">
      {Object.entries(keep ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <SearchInput defaultValue={query} placeholder={placeholder} />
      {children}
      {filtered && (
        <Link href={clearHref} className="text-sm font-semibold underline">
          Clear filters
        </Link>
      )}
    </Form>
  );
}
