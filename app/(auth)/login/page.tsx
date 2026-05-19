import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <p className="font-serif text-2xl tracking-tight text-ink">
          Cosmetic Allergy Tracker
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Your personal allergen radar for cosmetics.
        </p>
      </div>
      <Card>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          We&apos;ll email you a one-time link. No password.
        </CardDescription>
        <div className="mt-5">
          <LoginForm />
        </div>
      </Card>
      <p className="mt-6 text-xs text-ink-muted">
        Informational only. Not medical advice or a diagnosis.
      </p>
    </main>
  );
}
