"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, Bell, Settings, LogOut, Users, Crown,
  TrendingUp, Sparkles, BarChart2, BarChart3, Menu, X, Database,
  CreditCard, Ticket, BookOpen, PenLine, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { API_URL } from "@/lib/api";

type NavItem = { icon: any; label: string; href: string };

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutFn } = useAuth();
  const location = usePathname();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const isSuperAdmin = user.role === "super_admin";
  const isAdmin = user.role === "admin" || isSuperAdmin;

  const studentItems: NavItem[] = [
    { icon: LayoutDashboard, label: t("sidebar.student.dashboard"), href: "/dashboard" },
    { icon: Sparkles, label: "Révision Étude+", href: "/revision" },
    { icon: BarChart3, label: "Ma progression", href: "/progress" },
    { icon: CreditCard, label: "Mon plan", href: "/plan" },
    { icon: FileText, label: "Mes documents", href: "/documents" },
    { icon: Bell, label: t("sidebar.student.notifications"), href: "/notifications" },
    { icon: Settings, label: t("sidebar.student.settings"), href: "/settings" },
  ];

  const adminItems: NavItem[] = [
    { icon: LayoutDashboard, label: t("sidebar.admin.dashboard"), href: "/admin" },
    { icon: Users, label: t("sidebar.admin.users"), href: "/admin/users" },
    { icon: Database, label: "Base de connaissances", href: "/admin/knowledge-base" },
    { icon: BookOpen, label: "Curriculum", href: "/admin/curriculum" },
    { icon: PenLine, label: "Questions", href: "/admin/questions" },
    { icon: Ticket, label: "Codes promo", href: "/admin/discounts" },
  ];

  const superItems: NavItem[] = [
    { icon: LayoutDashboard, label: t("sidebar.admin.dashboard"), href: "/admin" },
    { icon: BarChart2, label: "Analytiques", href: "/admin/analytics" },
    { icon: Users, label: t("sidebar.admin.users"), href: "/admin/users" },
    { icon: CreditCard, label: "Plans", href: "/admin/plans" },
    { icon: Ticket, label: "Codes promo", href: "/admin/discounts" },
    { icon: Database, label: "Base de connaissances", href: "/admin/knowledge-base" },
    { icon: BookOpen, label: "Curriculum", href: "/admin/curriculum" },
    { icon: PenLine, label: "Questions", href: "/admin/questions" },
    { icon: TrendingUp, label: "Abonnements", href: "/admin/subscriptions" },
    { icon: Settings, label: t("sidebar.admin.settings"), href: "/admin/settings" },
  ];

  const items = isSuperAdmin ? superItems : isAdmin ? adminItems : studentItems;
  const roleLabel = isSuperAdmin ? t("sidebar.roles.super_admin") : user.role === "admin" ? t("sidebar.roles.admin") : t("sidebar.roles.student");

  function renderNavItem(item: NavItem, onLinkClick?: () => void) {
    const isRevision = item.href === "/revision";
    const active = isRevision ? location.startsWith("/revision") : location === item.href || location.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onLinkClick}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium w-full",
          isRevision
            ? active
              ? "bg-yellow-400/20 text-yellow-300 shadow-lg shadow-yellow-400/10"
              : "text-yellow-400/80 hover:bg-yellow-400/10 hover:text-yellow-300"
            : active
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <item.icon className={cn("w-5 h-5 shrink-0", isRevision && "text-yellow-400")} />
        {item.label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden lg:flex flex-col fixed inset-y-0 z-40 shadow-2xl shadow-black/10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            <span className="font-serif font-bold text-xl">É</span>
          </div>
          <div>
            <span className="text-xl font-serif font-bold tracking-tight">Étude<span className="text-sidebar-primary">+</span></span>
            {isSuperAdmin && (
              <div className="flex items-center gap-1 mt-0.5">
                <Crown className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80">Control Panel</span>
              </div>
            )}
          </div>
        </div>

        <Link href={isAdmin ? "/admin" : "/settings"}>
          <div className="px-6 py-4 flex items-center gap-3 border-y border-sidebar-border/50 bg-sidebar-accent/30 hover:bg-sidebar-accent/50 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-sidebar-primary/30 flex-shrink-0 bg-sidebar-primary/20">
              {user.profilePhoto ? (
                <img src={`${API_URL}${user.profilePhoto}`} alt="" className="w-full h-full object-cover" />
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

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => renderNavItem(item))}
        </nav>

        <div className="p-4 border-t border-sidebar-border mt-auto space-y-2">
          <LanguageSwitcher className="w-full justify-center" />
          <button onClick={() => void logoutFn()} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors font-medium">
            <LogOut className="w-5 h-5" />
            {t("sidebar.logout")}
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <span className="font-serif font-bold text-xl">Étude+</span>
          <button onClick={() => setMobileOpen((v) => !v)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
        {mobileOpen && (
          <div className="lg:hidden bg-sidebar text-sidebar-foreground p-4 space-y-1">
            {items.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
          </div>
        )}
        <div className="flex-1 p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
