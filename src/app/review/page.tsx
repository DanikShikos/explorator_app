import { ReviewSession } from "@/components/review/review-session";
import { DatabaseSetupBanner } from "@/components/layout/database-setup-banner";
import { isDatabaseConfigured, listDueCards } from "@/lib/data";

export default async function ReviewPage() {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupBanner />;
  }

  const cards = await listDueCards();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Повторение</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Ежедневный обзор</h1>
      </div>
      <ReviewSession cards={cards} />
    </div>
  );
}
