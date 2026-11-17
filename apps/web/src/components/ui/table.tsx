import clsx from "clsx";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border-cloud overflow-x-auto border bg-white">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={clsx(
        "border-cloud bg-cloud/30 text-muted border-b px-4 py-3 text-xs font-semibold tracking-wide uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={clsx("border-cloud/70 border-b px-4 py-3 align-middle", className)}>
      {children}
    </td>
  );
}
