import { RegisterForm } from "@/components/auth/register-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md space-y-4">
      <RegisterForm />
      <OAuthButtons />
    </div>
  );
}
