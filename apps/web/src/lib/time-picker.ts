const pad = (value: number) => String(value).padStart(2, "0");

export function timeSlots(stepMinutes: number) {
  return Array.from({ length: Math.floor(1440 / stepMinutes) }, (_, index) => {
    const minutes = index * stepMinutes;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  });
}

/** Understands "16", "930", "16:30" and "16.30" and returns HH:mm, or null. */
export function parseTime(text: string) {
  const match = /^(\d{1,2})(?:[:.]?(\d{2}))?$/.exec(text.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  return hour > 23 || minute > 59 ? null : `${pad(hour)}:${pad(minute)}`;
}

/** The slots that start with the typed digits, plus the typed time itself when it is not a slot. */
export function timeRows(slots: string[], text: string) {
  const digits = text.replace(/\D/g, "");
  if (digits === "") return slots;

  const matches = slots.filter((slot) => {
    const [hour, minute] = slot.split(":");
    return `${hour}${minute}`.startsWith(digits) || `${Number(hour)}${minute}`.startsWith(digits);
  });
  const typed = parseTime(text);
  return typed && !slots.includes(typed) ? [typed, ...matches] : matches;
}
