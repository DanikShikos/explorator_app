import { removeNullBytes } from "@/lib/utils";

/**
 * Пока нет входа через Supabase Auth, все заметки принадлежат одному
 * «локальному хозяину». Это простой UUID, не пароль.
 */
export function getCurrentUserId() {
  return removeNullBytes(process.env.EXPLORATOR_USER_ID ?? "00000000-0000-4000-8000-000000000001");
}
