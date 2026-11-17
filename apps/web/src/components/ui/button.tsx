import Link from "next/link";
import clsx from "clsx";

const variants = {
  primary: "bg-navy text-white hover:bg-navy/90",
  gold: "bg-gold text-navy hover:bg-gold/90",
  secondary: "border border-cloud bg-white text-navy hover:bg-navy/5",
  danger: "bg-danger text-white hover:bg-danger/90",
  ghost: "text-navy hover:bg-navy/5",
} as const;

const sizes = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-card font-semibold whitespace-nowrap transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={clsx(buttonClass(variant, size), className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={clsx(buttonClass(variant, size), className)} {...props} />;
}
