"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthState } from "@/lib/auth-types";
import { ensureUserStats } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Введите корректную почту").max(200);
const passwordSchema = z
  .string()
  .min(8, "Пароль должен быть не короче 8 символов")
  .max(72, "Пароль слишком длинный");

async function siteOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function fail(error: { message: string }): AuthState {
  const message = error.message.toLowerCase();
  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return { error: "Неверная почта или пароль." };
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return { error: "Эта почта уже зарегистрирована. Войдите или восстановите пароль." };
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return { error: "Слишком много попыток. Подождите немного и попробуйте снова." };
  }
  if (message.includes("password")) {
    return { error: "Пароль не подходит. Нужно хотя бы 8 символов." };
  }
  if (message.includes("email")) {
    return { error: "Проверьте адрес почты." };
  }
  return { error: "Не удалось выполнить запрос. Попробуйте ещё раз." };
}

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      name: z.string().trim().max(80, "Имя слишком длинное").optional(),
      email: emailSchema,
      password: passwordSchema,
      confirm: z.string(),
    })
    .safeParse({
      name: String(formData.get("name") ?? "").trim() || undefined,
      email: formData.get("email"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  }
  if (parsed.data.password !== parsed.data.confirm) {
    return { error: "Пароли не совпадают." };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { name: parsed.data.name ?? "" },
    },
  });

  if (error) {
    return fail(error);
  }

  if (data.user) {
    await ensureUserStats(data.user.id);
  }
  if (data.session) {
    redirect("/");
  }

  return {
    message: "Аккаунт создан. Если на почту пришло письмо, откройте его, чтобы подтвердить адрес.",
  };
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      email: emailSchema,
      password: z.string().min(1, "Введите пароль").max(72),
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return fail(error);
  }

  if (data.user) {
    await ensureUserStats(data.user.id);
  }
  redirect("/");
}

export async function requestPasswordReset(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Введите корректную почту." };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error && /rate limit|too many/i.test(error.message)) {
    return fail(error);
  }

  return { message: "Если эта почта зарегистрирована, мы отправили ссылку для нового пароля." };
}

export async function updatePassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      password: passwordSchema,
      confirm: z.string(),
    })
    .safeParse({
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте пароль." };
  }
  if (parsed.data.password !== parsed.data.confirm) {
    return { error: "Пароли не совпадают." };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { error: "Сессия не найдена. Запросите ссылку для восстановления ещё раз." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return fail(error);
  }

  if (formData.get("stay") === "1") {
    return { message: "Пароль обновлён." };
  }
  redirect("/profile");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
