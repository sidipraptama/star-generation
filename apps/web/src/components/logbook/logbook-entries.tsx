import { BookOpen, Eye, Lightbulb, ListChecks } from "lucide-react";
import { formatDuration, formatLessonWhen, lessonMinutes } from "@/lib/format";

export type LogbookEntryView = {
  id: string;
  topic: string;
  activities: string;
  observation: string;
  recommendation: string;
  lesson: { start_at: string; end_at: string };
};

const sections = [
  { key: "activities", label: "What we did", icon: ListChecks },
  { key: "observation", label: "Tutor observation", icon: Eye },
  { key: "recommendation", label: "What comes next", icon: Lightbulb },
] as const;

export function LogbookEntries({ entries }: { entries: LogbookEntryView[] }) {
  const ordered = [...entries].sort((a, b) => a.lesson.start_at.localeCompare(b.lesson.start_at));

  return (
    <ol className="space-y-4">
      {ordered.map((entry) => (
        <li key={entry.id} className="rounded-card border border-cloud bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cloud px-5 py-3">
            <p className="font-semibold">
              {formatLessonWhen(entry.lesson.start_at, entry.lesson.end_at)}
            </p>
            <span className="text-xs text-muted">
              {formatDuration(lessonMinutes(entry.lesson.start_at, entry.lesson.end_at))}
            </span>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">Topic</p>
                <p className="font-semibold">{entry.topic}</p>
              </div>
            </div>
            {sections.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
                  <p className="text-sm whitespace-pre-line">{entry[key]}</p>
                </div>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
