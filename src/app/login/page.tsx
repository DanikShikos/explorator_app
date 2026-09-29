import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthScreen } from "@/components/auth/auth-screen";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const linkError = params.error === "link" ? "Ссылка недействительна или устарела. Запросите новую." : undefined;

  return (
    <AuthScreen
      title="Вход"
      description="Почта и пароль от вашего кабинета."
      footer={
        <>
          <Link href="/forgot-password" className="text-primary hover:underline">
            Забыли пароль?
          </Link>
          <span> · </span>
          <Link href="/register" className="text-primary hover:underline">
            Создать аккаунт
          </Link>
        </>
      }
    >
      <AuthForm
        action={signIn}
        submitLabel="Войти"
        fields={["email", "password"]}
        extraError={linkError}
      />
    </AuthScreen>
  );
}
