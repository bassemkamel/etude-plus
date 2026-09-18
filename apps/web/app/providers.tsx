"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ToastHost } from "@/components/ui/toast";
import { loadSavedLanguage } from "@/lib/i18n";
import "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
      }),
  );
  useEffect(() => {
    loadSavedLanguage();
  }, []);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        {children}
        <ToastHost />
      </AuthProvider>
    </QueryClientProvider>
  );
}
