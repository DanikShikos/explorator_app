"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthState } from "@/lib/auth-types";

const initialState: AuthState = {};

type Field = "name" | "email" | "password" | "confirm";

export function AuthForm({
  action,
  submitLabel,
  fields,
  passwordAutocomplete = "current-password",
  extraError,
  stay,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  fields: Field[];
  passwordAutocomplete?: "current-password" | "new-password";
  extraError?: string;
  stay?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const error = state.error ?? extraError;

  return (
    <form action={formAction} className="space-y-4">
      {stay ? <input type="hidden" name="stay" value="1" /> : null}
      {fields.includes("name") ? (
        <label className="grid gap-2 text-sm font-medium">
          Имя
          <Input name="name" autoComplete="name" placeholder="Как к вам обращаться" maxLength={80} />
        </label>
      ) : null}
      {fields.includes("email") ? (
        <label className="grid gap-2 text-sm font-medium">
          Почта
          <Input name="email" type="email" autoComplete="email" placeholder="you@email.com" required />
        </label>
      ) : null}
      {fields.includes("password") ? (
        <label className="grid gap-2 text-sm font-medium">
          Пароль
          <Input
            name="password"
            type="password"
            autoComplete={passwordAutocomplete}
            minLength={fields.includes("confirm") ? 8 : 1}
            maxLength={72}
            required
          />
        </label>
      ) : null}
      {fields.includes("confirm") ? (
        <label className="grid gap-2 text-sm font-medium">
          Пароль ещё раз
          <Input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
        </label>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {state.message ? <p className="text-sm text-muted-foreground">{state.message}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Секунду…" : submitLabel}
      </Button>
    </form>
  );
}
