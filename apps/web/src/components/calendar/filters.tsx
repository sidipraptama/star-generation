"use client";

/** A GET form that re-submits whenever a field changes, so filters apply without an extra click. */
export function AutoSubmitForm({
  action,
  className,
  children,
}: {
  action: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      method="get"
      className={className}
      onChange={(event) => event.currentTarget.requestSubmit()}
    >
      {children}
      <noscript>
        <button type="submit">Apply</button>
      </noscript>
    </form>
  );
}
