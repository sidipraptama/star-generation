type SectionProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function Section({ title, description, action, children }: SectionProps) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-muted text-sm">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card border-cloud border bg-white">{children}</div>;
}
