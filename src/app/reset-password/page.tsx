import Link from "next/link";
import { updatePassword } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthScreen } from "@/components/auth/auth-screen";
import { getOptionalUser } from "@/lib/current-user";

export default async function ResetPasswordPage() {
  const user = await getOptionalUser();

  return (
    <AuthScreen
      title="Новый пароль"
      description={user ? "Придумайте пароль не короче 8 символов." : "Откройте ссылку из письма, чтобы задать пароль."}
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Вернуться ко входу
        </Link>
      }
    >
      {user ? (
        <AuthForm
          action={updatePassword}
          submitLabel="Сохранить пароль"
          fields={["password", "confirm"]}
          passwordAutocomplete="new-password"
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Сессия восстановления не найдена.{" "}
          <Link href="/forgot-password" className="text-primary hover:underline">
            Запросите ссылку ещё раз
          </Link>
          .
        </p>
      )}
    </AuthScreen>
  );
}
