import Link from "next/link";
import { PathNotice, PathRetryButton } from "@/components/book/PathNotice";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { TodayPanel } from "@/components/today/TodayPanel";
import { Button } from "@/components/ui/button";
import { getTodayPanel, isDatabaseConfigured } from "@/lib/data";

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Панель</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Почти готово</h1>
        </div>
        <DatabaseSetupBanner />
      </div>
    );
  }

  let panel;
  try {
    panel = await getTodayPanel();
  } catch {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Панель</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-path-ink">Сегодня</h1>
        </div>
        <PathNotice
          mood="idle"
          tone="alert"
          caption="Сбой данных"
          title="Не удалось загрузить ход"
          description="Панель временно недоступна. Попробуй ещё раз — или открой библиотеку."
        >
          <div className="flex flex-wrap justify-center gap-3">
            <PathRetryButton />
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-2xl border-path px-6 text-path-ink hover:bg-path-soft"
            >
              <Link href="/books">В библиотеку</Link>
            </Button>
          </div>
        </PathNotice>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Панель</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-path-ink">Сегодня</h1>
      </div>

      <TodayPanel panel={panel} />

      <p className="text-sm text-muted-foreground">
        Короткие записи отдельно от тропы —{" "}
        <Link href="/notes" className="font-medium text-path-ink underline-offset-4 hover:underline">
          открыть /notes
        </Link>
        .
      </p>
    </div>
  );
}
