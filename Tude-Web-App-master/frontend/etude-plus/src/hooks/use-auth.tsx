import React, { createContext, useContext } from "react";

const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";
import { User, useGetMe, getGetMeQueryKey, login, logout, register, LoginRequest, RegisterRequest, saveToken, clearToken, getToken } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginFn: (data: LoginRequest) => Promise<User>;
  registerFn: (data: RegisterRequest) => Promise<User>;
  logoutFn: () => void;
  refreshUser: () => Promise<void>;
  startImpersonation: (token: string, targetUser: any) => Promise<void>;
  exitImpersonation: () => void;
  impersonating: ImpersonationState | null;
}

export interface ImpersonationState {
  adminToken: string;
  adminUser: { fullName: string; email: string; id: number };
  targetUser: { fullName: string; email: string; role: string; id: number };
}

const IMPERSONATION_KEY = "etude_impersonation";

export function getImpersonationState(): ImpersonationState | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const AuthContext = createContext<AuthContextType | null>(null);

const RECENT_ACCOUNTS_KEY = "etude_recent_accounts";

export interface RecentAccount {
  email: string;
  fullName: string;
  role: string;
}

export function getSavedAccounts(): RecentAccount[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_ACCOUNTS_KEY) || "[]");
  } catch { return []; }
}

function saveAccount(user: User) {
  try {
    const existing = getSavedAccounts().filter(a => a.email !== user.email);
    const updated = [{ email: user.email, fullName: user.fullName, role: user.role }, ...existing].slice(0, 5);
    localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch {}
}

export function getDashboardPath(role: string) {
  // MVP: professor role suppressed — redirect to student dashboard if encountered
  // if (role === "professor") return "/professor/dashboard";
  if (role === "admin" || role === "super_admin") return "/admin/dashboard";
  return "/student/dashboard";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 5 * 60 * 1000 }
  });

  const impersonating = getImpersonationState();

  const loginFn = async (data: LoginRequest): Promise<User> => {
    const res = await login(data);
    saveToken(res.token);
    saveAccount(res.user);
    trackEvent("login");
    // Cancel any in-flight /me requests BEFORE setting data — an unauthenticated
    // 401 response that was still in flight would otherwise overwrite the user.
    await queryClient.cancelQueries({ queryKey: getGetMeQueryKey() });
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    return res.user;
  };

  const registerFn = async (data: RegisterRequest): Promise<User> => {
    const res = await register(data);
    saveToken(res.token);
    saveAccount(res.user);
    trackEvent("signup_completed");
    await queryClient.cancelQueries({ queryKey: getGetMeQueryKey() });
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    return res.user;
  };

  const logoutFn = async () => {
    // If impersonating, exit impersonation rather than actually logging out
    const imp = getImpersonationState();
    if (imp) {
      await exitImpersonation();
      return;
    }
    trackEvent("logout");
    // Clear server-side session cookie (fire-and-forget).
    // Uses api-client-react logout() so the call goes through customFetch routing
    // and reaches the correct Supabase /auth/logout endpoint.
    logout().catch(() => {});
    clearToken();
    queryClient.setQueryData([`/api/auth/me`], null);
    queryClient.clear();
    window.location.href = "/login";
  };

  const refreshUser = async () => {
    await queryClient.invalidateQueries({ queryKey: [`/api/auth/me`] });
  };

  const startImpersonation = async (token: string, targetUser: any) => {
    if (!user) return;

    // Ensure we have an admin bearer token saved — if the session came from a cookie
    // (e.g. page refresh) there may be no localStorage token yet.
    let adminToken = getToken();
    if (!adminToken) {
      try {
        const res = await fetch(`${SUPABASE_FN}/auth/restore-session`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (data.token) {
          adminToken = data.token as string;
          saveToken(adminToken);
        }
      } catch {}
    }

    if (!adminToken) return;

    const state: ImpersonationState = {
      adminToken,
      adminUser: { fullName: user.fullName, email: user.email, id: (user as any).id },
      targetUser: { fullName: targetUser.fullName, email: targetUser.email, role: targetUser.role, id: targetUser.id },
    };
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
    saveToken(token);
    queryClient.clear();
    window.location.href = getDashboardPath(targetUser.role);
  };

  const exitImpersonation = async () => {
    const imp = getImpersonationState();
    if (!imp) return;
    localStorage.removeItem(IMPERSONATION_KEY);
    saveToken(imp.adminToken);
    // Restore the admin's session cookie by calling restore-session with the admin bearer token
    await fetch(`${SUPABASE_FN}/auth/restore-session`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${imp.adminToken}` },
    }).catch(() => {});
    queryClient.clear();
    window.location.href = "/admin/users";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginFn, registerFn, logoutFn, refreshUser, startImpersonation, exitImpersonation, impersonating }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
