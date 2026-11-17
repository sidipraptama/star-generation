export type Bounds = { min: number; max: number; step: number };

export function parseDigits(text: string) {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
}

export function clamp(value: number, { min, max }: Pick<Bounds, "min" | "max">) {
  return Math.min(max, Math.max(min, value));
}

export function stepValue(value: number | null, direction: 1 | -1, bounds: Bounds) {
  if (value === null) return bounds.min;
  const multiples =
    direction === 1 ? Math.floor(value / bounds.step) + 1 : Math.ceil(value / bounds.step) - 1;
  return clamp(multiples * bounds.step, bounds);
}

export function caretAfterDigits(text: string, digitCount: number) {
  if (digitCount === 0) return 0;
  let seen = 0;
  for (let index = 0; index < text.length; index++) {
    if (/\d/.test(text[index])) seen++;
    if (seen === digitCount) return index + 1;
  }
  return text.length;
}
