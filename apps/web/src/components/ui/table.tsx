import clsx from "clsx";
import { TableScroll } from "@/components/ui/table-scroll";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <TableScroll>
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        {children}
      </table>
    </TableScroll>
  );
}

type CellProps = {
  children?: React.ReactNode;
  className?: string;
  /** Keeps the cell in view at the right edge while the other columns scroll (not on phones, where it would take most of the width). */
  sticky?: boolean;
};

export function Th({ children, className, sticky }: CellProps) {
  return (
    <th
      scope="col"
      className={clsx(
        "border-cloud text-muted border-b px-4 py-3 text-xs font-semibold tracking-wide uppercase",
        sticky
          ? "bg-[color-mix(in_srgb,var(--color-cloud)_30%,white)] sm:sticky sm:right-0 sm:z-10 sm:group-data-[overflowing=true]/table:shadow-[-6px_0_6px_-6px_rgb(47_63_95/0.3)]"
          : "bg-cloud/30",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, sticky }: CellProps) {
  return (
    <td
      className={clsx(
        "border-cloud/70 border-b px-4 py-3 align-middle",
        sticky &&
          "bg-white sm:sticky sm:right-0 sm:z-10 sm:group-data-[overflowing=true]/table:shadow-[-6px_0_6px_-6px_rgb(47_63_95/0.3)]",
        className,
      )}
    >
      {children}
    </td>
  );
}
