import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthScreen } from "@/components/auth/auth-screen";

export default function RegisterPage() {
  return (
    <AuthScreen
      title="Регистрация"
      description="Пароль сохранится в базе только в виде хеша. Прогресс будет виден только вам."
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Уже есть аккаунт? Войти
        </Link>
      }
    >
      <AuthForm
        action={signUp}
        submitLabel="Создать аккаунт"
        fields={["name", "email", "password", "confirm"]}
        passwordAutocomplete="new-password"
      />
    </AuthScreen>
  );
}
