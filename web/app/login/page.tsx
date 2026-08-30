import { hasSupabaseEnv } from "@/lib/supabase/env";
import SetupNotice from "../SetupNotice";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  if (!hasSupabaseEnv) return <SetupNotice />;

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <LoginForm />
    </main>
  );
}
