"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Array<"student" | "admin" | "super_admin">;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(user.role === "student" ? "/dashboard" : "/admin");
    }
  }, [isLoading, user, roles, router, path]);

  if (isLoading || !user) return <LoadingScreen />;
  if (roles && !roles.includes(user.role)) return <LoadingScreen />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;
    router.replace(user.role === "student" ? "/dashboard" : "/admin");
  }, [isLoading, user, router]);

  if (isLoading) return <LoadingScreen />;
  if (user) return <LoadingScreen />;
  return <>{children}</>;
}
