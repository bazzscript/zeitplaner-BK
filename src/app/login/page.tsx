import { LoginButton } from "@/components/auth/LoginButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-[0.18em]">ZBK</h1>
          <p className="mt-2 text-[var(--optional)]">
            Plan your days. Google Calendar handles scheduling. You handle the
            details.
          </p>
        </div>
        <LoginButton />
        <p className="mt-6 text-center text-xs text-[var(--optional)]">
          Sign in with Google to sync your calendar. No onboarding — start
          planning immediately.
        </p>
      </div>
    </main>
  );
}
