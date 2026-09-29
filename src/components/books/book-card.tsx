import Link from "next/link";

type BookCardProps = {
  id: string;
  title: string;
  author: string | null;
  format: string;
  mastery: number;
  chapters: number;
  hasSummary: boolean;
};

function statusLabel(mastery: number, hasSummary: boolean) {
  if (mastery > 0) return "На тропе";
  if (hasSummary) return "Разобрана";
  return "Новая";
}

function statusClass(mastery: number, hasSummary: boolean) {
  if (mastery > 0) {
    return "bg-path-soft text-path-ink";
  }
  if (hasSummary) {
    return "bg-secondary text-secondary-foreground";
  }
  return "bg-muted text-muted-foreground";
}

export function BookCard({
  id,
  title,
  author,
  format,
  mastery,
  chapters,
  hasSummary,
}: BookCardProps) {
  const label = statusLabel(mastery, hasSummary);

  return (
    <Link
      href={`/books/${id}`}
      data-testid="book-card"
      className="group block rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-colors hover:border-path/30 hover:bg-path-soft/40"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-path-ink">
            {title}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {author || "Автор не указан"}
            <span className="mx-1.5 text-border">·</span>
            <span className="uppercase tracking-wide">{format}</span>
          </p>
        </div>
        <span
          data-testid="book-status"
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(mastery, hasSummary)}`}
        >
          {label}
        </span>
      </div>

      <div className="mt-5 space-y-2">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-path transition-[width]"
            style={{ width: `${Math.min(100, Math.max(0, mastery))}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {chapters} {chapters === 1 ? "глава" : chapters < 5 ? "главы" : "глав"} · {mastery}%
        </p>
      </div>
    </Link>
  );
}
