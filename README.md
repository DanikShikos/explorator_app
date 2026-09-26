# Explorator

PWA для Markdown-заметок, ИИ-викторин и интервального повторения (FSRS).

Стек: Next.js App Router, TypeScript, Tailwind CSS, Shadcn UI, Drizzle ORM, Supabase, Vercel AI SDK, ts-fsrs.

## Что уже есть

- Схема БД: `notes`, `quiz_cards` (поля FSRS), `review_logs` + RLS
- Навигация: панель / заметки / повторение
- Command palette: `Ctrl+K` / `Cmd+K`
- Заглушки UI для dashboard, списка заметок, редактора и викторины
- API `POST /api/quiz/generate` через `generateObject` + Zod

## Запуск

1. Скопируйте `.env.example` в `.env.local` и заполните ключи Supabase / OpenAI.
2. В SQL Editor Supabase выполните `drizzle/0000_init.sql` (или `npm run db:push`).
3. `npm install` (нужен Node 20+).
4. `npm run dev`

## Дальше

- CRUD заметок через Drizzle
- Сохранение сгенерированных карточек
- Реальная сессия повторения с `ts-fsrs`
- Авторизация Supabase Auth
