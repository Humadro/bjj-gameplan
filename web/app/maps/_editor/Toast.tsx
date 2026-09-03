"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastAction = { label: string; onClick: () => void };
type ToastInput = { message: string; tone?: "ok" | "error"; action?: ToastAction; duration?: number };
type ToastItem = ToastInput & { id: number };

type ToastFn = (t: ToastInput | string) => void;

const ToastCtx = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>(
    (input) => {
      const t: ToastInput = typeof input === "string" ? { message: input } : input;
      const id = nextId.current++;
      setItems((cur) => [...cur, { ...t, id }]);
      const ms = t.duration ?? (t.action ? 8000 : 4000);
      window.setTimeout(() => remove(id), ms);
    },
    [remove],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-3 right-3 z-[60] flex w-72 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-md border px-3 py-2 text-xs shadow-lg ${
              t.tone === "error"
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-black/10 bg-white text-zinc-800"
            }`}
          >
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  remove(t.id);
                }}
                className="shrink-0 rounded border border-black/15 px-2 py-0.5 font-medium hover:bg-black/5"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 text-zinc-400 hover:text-zinc-700"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
