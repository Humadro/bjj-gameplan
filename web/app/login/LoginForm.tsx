"use client";

import { useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { login, signup, type AuthResult } from "./actions";

export default function LoginForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<AuthResult | null>(null);
  const next = useSearchParams().get("next") ?? "";

  function run(action: (fd: FormData) => Promise<AuthResult>) {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    setFeedback(null);
    startTransition(async () => {
      const res = await action(fd);
      // En caso de éxito la acción hace redirect() y no llega aquí.
      if (res) setFeedback(res);
    });
  }

  return (
    <form
      ref={formRef}
      className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault();
        run(login);
      }}
    >
      <h1 className="text-xl font-semibold">BJJ Game Plan</h1>
      <p className="-mt-2 text-sm text-zinc-500">Entra con tu email para ver tu mapa.</p>

      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-zinc-800"
        />
      </label>

      {feedback?.error && (
        <p className="text-sm text-red-600" role="alert">
          {feedback.error}
        </p>
      )}
      {feedback?.message && (
        <p className="text-sm text-green-700" role="status">
          {feedback.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
        >
          {pending ? "…" : "Entrar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(signup)}
          className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm font-medium disabled:opacity-60 dark:border-white/20"
        >
          Crear cuenta
        </button>
      </div>
    </form>
  );
}
