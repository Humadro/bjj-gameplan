"use client";

import { useState, useTransition } from "react";
import { useToast } from "./Toast";

type ActionResult = { error?: string } | void;

// Envuelve una Server Action: la ejecuta en una transición, expone `pending`
// y el último error. Si la acción va bien, `revalidatePath` en el servidor
// refresca los datos del Server Component automáticamente. Los errores salen
// también como toast (no-op si no hay ToastProvider, p. ej. en /maps).
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

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
        toast({ message: res.error, tone: "error" });
        return;
      }
      onSuccess?.();
    });
  }

  return { pending, error, setError, run };
}
