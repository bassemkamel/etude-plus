"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; title: string; description?: string; variant?: "default" | "destructive" };

let seq = 0;
const listeners = new Set<(t: Toast) => void>();

export function toast(input: Omit<Toast, "id">) {
  const t: Toast = { id: ++seq, ...input };
  listeners.forEach((l) => l(t));
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const on = (t: Toast) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4200);
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[80] space-y-2 w-[min(100%-2rem,360px)]">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-2xl border shadow-xl px-4 py-3 bg-card animate-slide-up",
            t.variant === "destructive" ? "border-destructive/40 bg-red-50" : "border-border",
          )}
        >
          <p className="font-semibold text-sm">{t.title}</p>
          {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
