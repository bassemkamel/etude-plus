import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/Premium";
import { useAuth } from "@/hooks/use-auth";
import { BookPlus, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Navbar() {
  const { user, logoutFn, isLoading } = useAuth();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardLink = () => {
    if (!user) return "/";
    return `/${user.role}/dashboard`;
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled ? "glass py-3" : "bg-transparent py-5"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground group-hover:scale-105 transition-transform shadow-lg shadow-primary/20">
            <BookPlus className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-serif font-bold tracking-tight text-foreground">
            Étude<span className="text-primary">+</span>
          </span>
        </Link>

        {(!user || isLoading) && (
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm">
            <a href="/#features" className="text-foreground/80 hover:text-primary transition-colors">{t("nav.features")}</a>
            <a href="/#how-it-works" className="text-foreground/80 hover:text-primary transition-colors">{t("nav.howItWorks")}</a>
            <Link href="/pricing" className="text-foreground/80 hover:text-primary transition-colors">{t("nav.pricing")}</Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {user && location !== "/" ? (
            <>
              <Link href={getDashboardLink()} className="hidden sm:block">
                <Button variant="ghost" className="font-semibold">{t("nav.mySpace")}</Button>
              </Link>
              <div className="flex items-center gap-2 pl-4 border-l border-border">
                <Link href="/account">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border-2 border-primary/20 hover:border-primary/50 transition-colors cursor-pointer">
                    <User className="w-5 h-5 text-foreground/70" />
                  </div>
                </Link>
                <Button variant="ghost" size="sm" onClick={logoutFn} className="px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : !user ? (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost">{t("nav.login")}</Button>
              </Link>
              <Link href="/select-role">
                <Button>{t("nav.register")}</Button>
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
