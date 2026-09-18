"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type User = {
  id: string;
  email: string;
  role: "student" | "admin" | "super_admin";
  status: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profilePhoto?: string | null;
  city?: string | null;
  studentProfile?: {
    gradeLevel?: string | null;
    educationSection?: string | null;
    schoolName?: string | null;
  } | null;
  subscription?: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    plan: { code: string; nameFr: string; nameEn: string; nameAr: string; priceTnd: any; features: any };
  } | null;
};

const Ctx = createContext<{
  user: User | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logoutFn: () => Promise<void>;
}>({ user: null, isLoading: true, refresh: async () => {}, logoutFn: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api<User>("/api/v1/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logoutFn = async () => {
    await api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    window.location.href = "/";
  };

  return <Ctx.Provider value={{ user, isLoading, refresh, logoutFn }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

export function dashboardPath(role?: string) {
  if (role === "admin" || role === "super_admin") return "/admin";
  return "/dashboard";
}
