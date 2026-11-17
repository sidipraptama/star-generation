import clsx from "clsx";

export const controlClass =
  "block w-full rounded-card border border-cloud bg-white px-3 py-2 text-sm text-navy placeholder:text-muted focus:border-navy disabled:bg-cloud/40";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

export function Field({ label, htmlFor, hint, className, children }: FieldProps) {
  return (
    <div className={clsx("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-muted text-xs">{hint}</p>}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { name: string };

export function Input({ className, id, name, ...props }: InputProps) {
  return <input id={id ?? name} name={name} className={clsx(controlClass, className)} {...props} />;
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string };

export function Textarea({ className, id, name, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      id={id ?? name}
      name={name}
      rows={rows}
      className={clsx(controlClass, "resize-y", className)}
      {...props}
    />
  );
}
