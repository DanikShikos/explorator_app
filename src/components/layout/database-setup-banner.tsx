import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DatabaseSetupBanner() {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-lg">База данных ещё не подключена</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          В файле <code>.env.local</code> строка <code>DATABASE_URL</code> всё ещё шаблон (там
          написано YOUR_PROJECT / YOUR_PASSWORD).
        </p>
        <p>Открой Supabase → Project Settings → Database → Connection string (URI). Скопируй её целиком.</p>
        <p>
          Вставь вместо старой строки. Пароль — тот, который задавал при создании проекта. Потом
          сохрани файл и перезапусти <code>npm run dev</code>.
        </p>
      </CardContent>
    </Card>
  );
}
