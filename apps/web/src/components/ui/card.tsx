import clsx from "clsx";

type CardProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export function Card({ title, description, action, className, children }: CardProps) {
  return (
    <section className={clsx("rounded-card border-cloud border bg-white", className)}>
      {(title || action) && (
        <header className="border-cloud flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="text-muted mt-0.5 text-sm">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children && <div className="p-5">{children}</div>}
    </section>
  );
}
