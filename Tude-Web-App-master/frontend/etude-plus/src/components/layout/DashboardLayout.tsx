import React, { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  BookOpen, LayoutDashboard, GraduationCap,
  CreditCard, Bell, Settings, LogOut, Users, CheckSquare,
  ScrollText, Crown,
  TrendingUp, UserCog, ArrowLeftRight, Sparkles, BarChart2, BarChart3, Menu, X, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type NavItem = {
  icon: any;
  label: string;
  href: string;
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutFn, impersonating, exitImpersonation } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "admin" || isSuperAdmin;

  const NAV_ITEMS: Record<string, NavItem[]> = {
    student: [
      { icon: LayoutDashboard, label: t("sidebar.student.dashboard"), href: "/student/dashboard" },
      { icon: Sparkles,        label: "Révision Étude+",              href: "/revision" },
      { icon: BarChart3,       label: "Ma progression",               href: "/student/progress" },
      { icon: CheckSquare,     label: t("sidebar.student.grades"),    href: "/student/grades" },
      { icon: Bell,            label: t("sidebar.student.notifications"), href: "/student/notifications" },
      { icon: Settings,        label: t("sidebar.student.settings"),  href: "/student/settings" },
    ],
    // MVP: professor nav suppressed — restore by adding professor: [...] back here
    admin: [
      { icon: LayoutDashboard, label: t("sidebar.admin.dashboard"),    href: "/admin/dashboard" },
      { icon: Users,           label: t("sidebar.admin.users"),        href: "/admin/users" },
      { icon: Database,        label: "Base de Connaissances",         href: "/admin/knowledge-base" },
    ],
    super_admin: [
      { icon: LayoutDashboard, label: t("sidebar.admin.dashboard"),    href: "/admin/dashboard" },
      { icon: BarChart2,       label: "Analytiques",                   href: "/admin/analytics" },
      { icon: Users,           label: t("sidebar.admin.users"),        href: "/admin/users" },
      { icon: Database,        label: "Base de Connaissances",         href: "/admin/knowledge-base" },
      { icon: TrendingUp,      label: t("sidebar.admin.finances"),     href: "/admin/finances" },
      { icon: ScrollText,      label: t("sidebar.admin.auditLogs"),    href: "/admin/audit-logs" },
      { icon: Settings,        label: t("sidebar.admin.settings"),     href: "/admin/settings" },
    ],
  };

  const items = NAV_ITEMS[user.role as keyof typeof NAV_ITEMS] || [];

  const roleLabel =
    isSuperAdmin ? t("sidebar.roles.super_admin") :
    user.role === "admin" ? t("sidebar.roles.admin") :
    t("sidebar.roles.student");

  function renderNavItem(item: NavItem, onLinkClick?: () => void) {
    // Special highlight for Révision Étude+
    const isRevision = item.href === "/revision";
    const active = isRevision
      ? location.startsWith("/revision")
      : location === item.href || location.startsWith(item.href + "/");

    if (isRevision) {
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onLinkClick}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium w-full",
            active
              ? "bg-yellow-400/20 text-yellow-300 shadow-lg shadow-yellow-400/10"
              : "text-yellow-400/80 hover:bg-yellow-400/10 hover:text-yellow-300"
          )}
        >
          <Sparkles className="w-5 h-5 shrink-0 text-yellow-400" />
          <span className="flex-1">Révision Étude+</span>
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onLinkClick}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {item.label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden lg:flex flex-col fixed inset-y-0 z-40 shadow-2xl shadow-black/10">
        {/* Brand */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            <span className="font-serif font-bold text-xl">É</span>
          </div>
          <div>
            <span className="text-xl font-serif font-bold tracking-tight">
              Étude<span className="text-sidebar-primary">+</span>
            </span>
            {isSuperAdmin && (
              <div className="flex items-center gap-1 mt-0.5">
                <Crown className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80">Control Panel</span>
              </div>
            )}
          </div>
        </div>

        {/* User profile */}
        <Link href={
          isSuperAdmin || user.role === "admin" ? "/admin/settings" : "/student/settings"
        }>
          <div className="px-6 py-4 flex items-center gap-3 border-y border-sidebar-border/50 bg-sidebar-accent/30 hover:bg-sidebar-accent/50 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-sidebar-primary/30 flex-shrink-0 bg-sidebar-primary/20">
              {user.profilePhoto ? (
                <img src={`${API_URL}/storage${user.profilePhoto}`} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-bold text-sidebar-primary">{user.fullName.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-semibold text-sm truncate group-hover:text-sidebar-primary transition-colors">{user.fullName}</p>
              <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1">
                {isSuperAdmin && <Crown className="w-3 h-3 text-yellow-400" />}
                {roleLabel}
              </p>
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {isAdmin && (
            <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
              {isSuperAdmin ? t("sidebar.controlPanel") : t("sidebar.administration")}
            </p>
          )}
          {items.map((item: NavItem) => renderNavItem(item))}
        </nav>

        <div className="p-4 border-t border-sidebar-border mt-auto space-y-2">
          <LanguageSwitcher className="w-full justify-center" />
          <button
            onClick={logoutFn}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            {t("sidebar.logout")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Impersonation Banner */}
        {impersonating && (
          <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <UserCog className="w-4 h-4 shrink-0" />
              <span>
                {t("impersonation.actingAs")} <strong>{impersonating.targetUser.fullName}</strong> ({impersonating.targetUser.email})
                &nbsp;·&nbsp;{t("impersonation.loggedInAs")}&nbsp;<strong>{impersonating.adminUser.fullName}</strong>
              </span>
            </div>
            <button
              onClick={exitImpersonation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/20 hover:bg-amber-950/30 text-amber-950 font-bold text-xs transition-colors shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {t("impersonation.back")}
            </button>
          </div>
        )}
        {/* Mobile header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-6 lg:hidden">
          <span className="text-xl font-serif font-bold">Étude<span className="text-primary">+</span></span>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Mobile drawer overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            {/* Drawer */}
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground flex flex-col shadow-2xl">
              {/* Header */}
              <div className="p-6 flex items-center justify-between border-b border-sidebar-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
                    <span className="font-serif font-bold text-xl">É</span>
                  </div>
                  <span className="text-xl font-serif font-bold">Étude<span className="text-sidebar-primary">+</span></span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl hover:bg-sidebar-accent transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* User */}
              <div className="px-6 py-4 flex items-center gap-3 border-b border-sidebar-border/50 bg-sidebar-accent/30">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-sidebar-primary/30 flex-shrink-0 bg-sidebar-primary/20">
                  {user.profilePhoto ? (
                    <img src={`${API_URL}/storage${user.profilePhoto}`} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-bold text-sidebar-primary">{user.fullName.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{user.fullName}</p>
                  <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
                </div>
              </div>
              {/* Nav */}
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {items.map((item: NavItem) => renderNavItem(item, () => setMobileOpen(false)))}
              </nav>
              {/* Footer */}
              <div className="p-4 border-t border-sidebar-border space-y-2">
                <LanguageSwitcher className="w-full justify-center" />
                <button
                  onClick={() => { setMobileOpen(false); logoutFn(); }}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  {t("sidebar.logout")}
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* MVP: KYC banner suppressed (professor-only feature) */}

        <div className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
