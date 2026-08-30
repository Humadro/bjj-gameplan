"use client";

import { useState, useTransition } from "react";

type ActionResult = { error?: string } | void;

// Envuelve una Server Action: la ejecuta en una transición, expone `pending`
// y el último error. Si la acción va bien, `revalidatePath` en el servidor
// refresca los datos del Server Component automáticamente.
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    action: (fd: FormData) => Promise<ActionResult>,
    formData: FormData,
    onSuccess?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await action(formData);
      if (res && res.error) {
        setError(res.error);
        return;
      }
      onSuccess?.();
    });
  }

  return { pending, error, setError, run };
}
