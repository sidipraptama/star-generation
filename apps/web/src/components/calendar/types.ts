export type ChipTone = "scheduled" | "done" | "attention" | "warning" | "cancelled";

export type CalendarChip = {
  id: string;
  startAt: string;
  endAt: string;
  title: string;
  subtitle?: string;
  /** Short text so status never depends on colour alone, e.g. "Entry needed". */
  note?: string;
  tone: ChipTone;
  repeats?: boolean;
};

export type LegendItem = { tone: ChipTone; label: string };
