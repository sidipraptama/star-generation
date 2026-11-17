import Image from "next/image";

const RATIO = 229 / 256;

/** Decorative: it always sits next to the "Star Generation" name. */
export function Logo({ height }: { height: number }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={Math.round(height * RATIO)}
      height={height}
      unoptimized
      priority
    />
  );
}
