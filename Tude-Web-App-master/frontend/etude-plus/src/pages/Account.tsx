import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Input, Label, Badge } from "@/components/ui/Premium";
import { useGetMyTransactions } from "@workspace/api-client-react";
import {
  User, Mail, MapPin, GraduationCap, CreditCard, FileText,
  ShieldCheck, CheckCircle, Clock, XCircle, ChevronRight, LogOut
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatTND } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function Account() {
  const { t } = useTranslation();
  const { user, logoutFn } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const { data: myTransactions = [] } = useGetMyTransactions() as any;

  const ROLE_LABELS: Record<string, string> = {
    student: t("account.roleStudent"),
    professor: t("account.roleProfessor"),
    admin: t("account.roleAdmin"),
    super_admin: t("account.roleSuperAdmin"),
  };

  const TABS = [
    { id: "profile",  label: t("account.tabProfile"),   icon: User },
    { id: "payments", label: t("account.tabPayments"),  icon: CreditCard },
    { id: "terms",    label: t("account.tabTerms"),     icon: FileText },
  ];

  function statusBadge(status: string) {
    if (status === "completed") return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />{t("account.statusCompleted")}</Badge>;
    if (status === "pending")   return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{t("account.statusPending")}</Badge>;
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{status}</Badge>;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: t("account.profileUpdated"), description: t("account.profileUpdatedDesc") });
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("account.title")}
          description={t("account.description")}
        />

        <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <Card className="p-5">
              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center mb-6 pb-6 border-b border-border">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-md mb-3">
                  <span className="text-2xl font-bold text-primary">
                    {user.fullName.charAt(0)}
                  </span>
                </div>
                <p className="font-bold text-lg">{user.fullName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge variant="secondary" className="mt-2">
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              </div>

              {/* Tab nav */}
              <nav className="space-y-1">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                      activeTab === t.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <t.icon className="w-4 h-4 shrink-0" />
                    {t.label}
                    <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                  </button>
                ))}
              </nav>

              <div className="mt-6 pt-6 border-t border-border">
                <button
                  onClick={logoutFn}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t("account.logout")}
                </button>
              </div>
            </Card>
          </aside>

          {/* Main content */}
          <div className="flex-1">
            {/* Profile tab */}
            {activeTab === "profile" && (
              <Card className="p-8">
                <h2 className="text-xl font-bold mb-6 pb-4 border-b border-border">{t("account.profileTitle")}</h2>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>{t("account.fullName")}</Label>
                      <Input defaultValue={user.fullName} />
                    </div>
                    <div>
                      <Label>{t("account.email")}</Label>
                      <Input defaultValue={user.email} disabled className="opacity-60 cursor-not-allowed" />
                      <p className="text-xs text-muted-foreground mt-1">{t("account.emailNote")}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>
                        <MapPin className="w-3.5 h-3.5 inline mr-1" />
                        {t("account.city")}
                      </Label>
                      <Input defaultValue={(user as any).city ?? ""} placeholder="Ex: Tunis" />
                    </div>
                    <div>
                      <Label>
                        <GraduationCap className="w-3.5 h-3.5 inline mr-1" />
                        {t("account.gradeLevel")}
                      </Label>
                      <Input defaultValue={(user as any).gradeLevel ?? ""} placeholder="Ex: Baccalauréat" />
                    </div>
                  </div>

                  {/* Verified badge */}
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800 text-sm">{t("account.verifiedAccount")}</p>
                      <p className="text-xs text-green-600">{t("account.verifiedDesc")}</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">{t("account.save")}</Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Payments tab */}
            {activeTab === "payments" && (
              <div className="space-y-6">
                {/* Payment method info */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">{t("account.paymentMethod")}</h2>
                  <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border">
                    <div className="w-12 h-8 rounded bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">TND</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t("account.paymentTND")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("account.paymentSecure")}
                      </p>
                    </div>
                    <Badge variant="success" className="ml-auto">{t("account.active")}</Badge>
                  </div>
                </Card>

                {/* Transaction history */}
                <Card className="overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <h2 className="text-xl font-bold">{t("account.paymentHistory")}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {myTransactions.length} {myTransactions.length !== 1 ? t("account.transactions_plural") : t("account.transactions")}
                    </p>
                  </div>

                  {myTransactions.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>{t("account.noPayments")}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {myTransactions.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between p-5">
                          <div>
                            <p className="font-semibold text-sm">
                              {t.class?.title ?? `Cours #${t.classId}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(t.createdAt), "d MMMM yyyy", { locale: fr })}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-bold">{formatTND(t.amount)}</p>
                            {statusBadge(t.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Terms tab */}
            {activeTab === "terms" && (
              <Card className="p-8">
                <h2 className="text-xl font-bold mb-6 pb-4 border-b border-border">
                  {t("account.termsTitle")}
                </h2>
                <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
                  <div>
                    <h3 className="font-bold text-foreground text-base mb-2">1. Objet</h3>
                    <p>
                      Étude+ est une plateforme de mise en relation entre élèves et professeurs particuliers
                      en Tunisie. Les présentes conditions régissent l'utilisation de la plateforme par tout
                      utilisateur inscrit.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base mb-2">2. Inscription et compte</h3>
                    <p>
                      L'inscription est gratuite. Chaque utilisateur doit fournir des informations exactes
                      lors de la création de son compte. Les professeurs sont soumis à une vérification KYC
                      obligatoire avant de pouvoir publier des cours.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base mb-2">3. Paiements et tarifs</h3>
                    <p>
                      Les cours sont facturés en Dinars Tunisiens (TND). Le prix de chaque cours est fixé
                      librement par le professeur. Étude+ prélève une commission de 15% sur chaque transaction.
                      En cas d'annulation par le professeur, l'élève est remboursé intégralement.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base mb-2">4. Propriété intellectuelle</h3>
                    <p>
                      Les contenus publiés par les professeurs (supports, quiz, devoirs) leur appartiennent.
                      Les élèves bénéficient d'une licence d'utilisation personnelle et non-transférable.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base mb-2">5. Données personnelles</h3>
                    <p>
                      Étude+ collecte et traite vos données conformément à la réglementation tunisienne
                      sur la protection des données. Vos données ne sont pas vendues à des tiers. Vous
                      pouvez demander la suppression de votre compte à tout moment.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base mb-2">6. Suspension de compte</h3>
                    <p>
                      Étude+ se réserve le droit de suspendre tout compte en cas de violation des présentes
                      conditions, de comportement abusif, ou d'informations frauduleuses.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base mb-2">7. Droit applicable</h3>
                    <p>
                      Les présentes conditions sont soumises au droit tunisien. Tout litige sera soumis
                      à la juridiction compétente en Tunisie.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Dernière mise à jour : Mars 2025. En utilisant Étude+, vous acceptez l'intégralité de ces conditions.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
