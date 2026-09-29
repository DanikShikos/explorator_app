import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthScreen } from "@/components/auth/auth-screen";

export default function ForgotPasswordPage() {
  return (
    <AuthScreen
      title="Восстановление пароля"
      description="Отправим на почту ссылку, по которой можно задать новый пароль."
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Вернуться ко входу
        </Link>
      }
    >
      <AuthForm action={requestPasswordReset} submitLabel="Отправить ссылку" fields={["email"]} />
    </AuthScreen>
  );
}
