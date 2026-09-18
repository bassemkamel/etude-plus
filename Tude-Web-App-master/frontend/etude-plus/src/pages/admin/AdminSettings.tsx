import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Input, Label } from "@/components/ui/Premium";
import { ProfileCard } from "@/components/shared/ProfileCard";
import { useToast } from "@/hooks/use-toast";
import { getToken, changePassword } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Settings, Shield, AlertTriangle, KeyRound, Percent,
  DollarSign, Save, Loader2, User, Megaphone, Trash2,
  Tag, Copy, Check, ToggleLeft, ToggleRight, Plus, Calendar,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function adminFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
  return data;
}

export function AdminSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const audienceLabels: Record<string, string> = {
    all: t("admin.settings.audienceAll"),
    students: t("admin.settings.audienceStudents"),
    professors: t("admin.settings.audienceProfessors"),
    admins: t("admin.settings.audienceAdmins"),
    specific: t("admin.settings.audienceSpecific"),
  };

  // Announcements
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annAudience, setAnnAudience] = useState<"all" | "students" | "professors" | "admins" | "specific">("all");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<{ id: number; fullName: string; role: string }[]>([]);

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["admin-announcements"],
    queryFn: () => adminFetch(`${API_URL}/announcements/all`),
    refetchInterval: 30_000,
  });

  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["admin-all-users"],
    queryFn: () => adminFetch(`${API_URL}/users`),
  });

  const filteredUsers = userSearch.trim().length > 1
    ? allUsers.filter((u: any) =>
        !selectedUsers.find(s => s.id === u.id) &&
        (u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
         u.email?.toLowerCase().includes(userSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  const postAnn = useMutation({
    mutationFn: (data: { title: string; body: string; targetAudience: string; targetUserIds: number[] }) =>
      adminFetch(`${API_URL}/announcements`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setAnnTitle(""); setAnnBody(""); setAnnAudience("all"); setSelectedUsers([]); setUserSearch("");
      toast({ title: t("admin.settings.annPublished"), description: t("admin.settings.annPublishedDesc", { audience: audienceLabels[annAudience] }) });
    },
    onError: (err: any) => toast({ title: t("common.error"), description: err.message, variant: "destructive" }),
  });

  const deleteAnn = useMutation({
    mutationFn: (id: number) => adminFetch(`${API_URL}/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  // Discount codes
  const [dcCode, setDcCode] = useState("");
  const [dcPct, setDcPct] = useState("");
  const [dcMaxUses, setDcMaxUses] = useState("");
  const [dcExpiry, setDcExpiry] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [confirmDeleteDc, setConfirmDeleteDc] = useState<number | null>(null);

  const { data: discountCodes = [] } = useQuery<any[]>({
    queryKey: ["admin-discount-codes"],
    queryFn: () => adminFetch(`${API_URL}/admin/discount-codes`),
  });

  const createDc = useMutation({
    mutationFn: (data: any) => adminFetch(`${API_URL}/admin/discount-codes`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-discount-codes"] });
      setDcCode(""); setDcPct(""); setDcMaxUses(""); setDcExpiry("");
      toast({ title: t("admin.settings.dcCreated"), description: t("admin.settings.dcCreatedDesc") });
    },
    onError: (err: any) => toast({ title: t("common.error"), description: err.message, variant: "destructive" }),
  });

  const patchDc = useMutation({
    mutationFn: ({ id, ...data }: any) => adminFetch(`${API_URL}/admin/discount-codes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-discount-codes"] }),
    onError: (err: any) => toast({ title: t("common.error"), description: err.message, variant: "destructive" }),
  });

  const deleteDc = useMutation({
    mutationFn: (id: number) => adminFetch(`${API_URL}/admin/discount-codes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-discount-codes"] });
      setConfirmDeleteDc(null);
    },
    onError: (err: any) => toast({ title: t("common.error"), description: err.message, variant: "destructive" }),
  });

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Platform settings — loaded from /api/admin/settings
  const [commission, setCommission] = useState("15");
  const [maxPrice, setMaxPrice] = useState("30");
  const [maintenance, setMaintenance] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);

  // Load real settings on mount
  const { data: platformSettings } = useQuery<any>({
    queryKey: ["admin-platform-settings"],
    queryFn: () => adminFetch(`${API_URL}/admin/settings`),
  });

  // Sync state when settings load (must be in useEffect — never call setState during render)
  useEffect(() => {
    if (!platformSettings) return;
    if (platformSettings.commissionRate !== undefined) setCommission(String(platformSettings.commissionRate));
    if (platformSettings.maxCoursePrice !== undefined) setMaxPrice(String(platformSettings.maxCoursePrice));
    if (platformSettings.maintenanceMode !== undefined) setMaintenance(!!platformSettings.maintenanceMode);
  }, [platformSettings]);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseFloat(commission);
    const p = parseFloat(maxPrice);
    if (isNaN(c) || c < 1 || c > 50) {
      toast({ title: t("common.error"), description: t("admin.settings.commissionError"), variant: "destructive" });
      return;
    }
    if (isNaN(p) || p < 1) {
      toast({ title: t("common.error"), description: t("admin.settings.maxPriceError"), variant: "destructive" });
      return;
    }
    setSavingPlatform(true);
    try {
      await adminFetch(`${API_URL}/admin/settings`, {
        method: "PUT",
        body: JSON.stringify({ commissionRate: c, maxCoursePrice: p, maintenanceMode: maintenance }),
      });
      qc.invalidateQueries({ queryKey: ["admin-platform-settings"] });
      toast({
        title: t("admin.settings.platformSaved"),
        description: maintenance
          ? t("admin.settings.maintenanceActiveDesc")
          : t("admin.settings.platformUpdated"),
      });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: t("common.error"), description: t("admin.settings.passwordMismatch"), variant: "destructive" });
      return;
    }
    if (newPassword && newPassword.length < 8) {
      toast({ title: t("common.error"), description: t("admin.settings.passwordTooShort"), variant: "destructive" });
      return;
    }
    if (!newPassword) {
      toast({ title: t("admin.settings.nothingToChange"), description: t("admin.settings.enterNewPassword"), variant: "destructive" });
      return;
    }
    setSavingAccount(true);
    try {
      if (newPassword) {
        await changePassword({ currentPassword, newPassword });
      }
      toast({ title: t("admin.settings.accountUpdated"), description: t("admin.settings.accountUpdatedDesc") });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("admin.settings.title")}
          description={t("admin.settings.description")}
        />

        <div className="max-w-3xl space-y-6">

          {/* Profile */}
          <ProfileCard />

          {/* Platform settings */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t("admin.settings.platformTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("admin.settings.platformDesc")}</p>
              </div>
            </div>

            <form onSubmit={handleSavePlatform} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <Label className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-muted-foreground" /> {t("admin.settings.commissionLabel")}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      step="0.5"
                      value={commission}
                      onChange={e => setCommission(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t("admin.settings.commissionHint", { commission })}</p>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" /> {t("admin.settings.maxPriceLabel")}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">TND</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t("admin.settings.maxPriceHint")}</p>
                </div>
              </div>

              {/* Maintenance mode */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${maintenance ? "text-orange-500" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-semibold text-sm">{t("admin.settings.maintenanceMode")}</p>
                    <p className="text-xs text-muted-foreground">
                      {maintenance
                        ? t("admin.settings.maintenanceOn")
                        : t("admin.settings.maintenanceOff")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenance(m => !m)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${maintenance ? "bg-orange-500" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${maintenance ? "translate-x-7" : "translate-x-0"}`} />
                </button>
              </div>

              {maintenance && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-bold mb-1">{t("admin.settings.maintenanceWarningTitle")}</p>
                    <p>{t("admin.settings.maintenanceWarningBody")}</p>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={savingPlatform}>
                {savingPlatform ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("admin.settings.saving")}</> : <><Save className="w-4 h-4 mr-2" />{t("admin.settings.saveSettings")}</>}
              </Button>
            </form>
          </Card>

          {/* Password change */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg">{t("admin.settings.changePassword")}</h3>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 max-w-sm">
              <div>
                <Label>{t("admin.settings.currentPassword")}</Label>
                <Input
                  type="password"
                  placeholder={t("admin.settings.currentPasswordPlaceholder")}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("admin.settings.newPassword")}</Label>
                <Input
                  type="password"
                  placeholder={t("admin.settings.newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("admin.settings.confirmPassword")}</Label>
                <Input
                  type="password"
                  placeholder={t("admin.settings.confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={savingAccount}>
                {savingAccount ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("admin.settings.updating")}</> : <><Save className="w-4 h-4 mr-2" />{t("admin.settings.changePasswordBtn")}</>}
              </Button>
            </form>
          </Card>

          {/* Announcements */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t("admin.settings.announcementsTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("admin.settings.announcementsDesc")}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label>{t("admin.settings.annTitleLabel")}</Label>
                <Input placeholder={t("admin.settings.annTitlePlaceholder")} value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
              </div>
              <div>
                <Label>{t("admin.settings.annMessageLabel")}</Label>
                <textarea
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={t("admin.settings.annMessagePlaceholder")}
                  value={annBody}
                  onChange={e => setAnnBody(e.target.value)}
                />
              </div>

              {/* Audience selector */}
              <div>
                <Label>{t("admin.settings.annRecipients")}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {(["all", "students", "professors", "admins", "specific"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { setAnnAudience(opt); setSelectedUsers([]); setUserSearch(""); }}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${
                        annAudience === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      {audienceLabels[opt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* User picker for "specific" */}
              {annAudience === "specific" && (
                <div>
                  <Label>{t("admin.settings.searchUsers")}</Label>
                  <div className="relative mt-1">
                    <Input
                      placeholder={t("admin.settings.searchUsersPlaceholder")}
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                    />
                    {filteredUsers.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                        {filteredUsers.map((u: any) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full px-4 py-2.5 text-left hover:bg-muted/50 flex items-center justify-between gap-3 text-sm"
                            onClick={() => { setSelectedUsers(s => [...s, u]); setUserSearch(""); }}
                          >
                            <span className="font-medium">{u.fullName}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">{u.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedUsers.map(u => (
                        <span key={u.id} className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                          {u.fullName}
                          <button type="button" onClick={() => setSelectedUsers(s => s.filter(x => x.id !== u.id))} className="hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{t("admin.settings.addAtLeastOne")}</p>
                  )}
                </div>
              )}

              <Button
                disabled={
                  postAnn.isPending || !annTitle || !annBody ||
                  (annAudience === "specific" && selectedUsers.length === 0)
                }
                onClick={() => postAnn.mutate({
                  title: annTitle,
                  body: annBody,
                  targetAudience: annAudience,
                  targetUserIds: selectedUsers.map(u => u.id),
                })}
              >
                <Megaphone className="w-4 h-4 mr-2" />
                {postAnn.isPending ? t("admin.settings.publishing") : t("admin.settings.publishTo", { audience: audienceLabels[annAudience] })}
              </Button>
            </div>

            {announcements.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{t("admin.settings.activeAnnouncements", { count: announcements.length })}</p>
                <div className="space-y-3">
                  {announcements.map((a: any) => (
                    <div key={a.id} className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{a.title}</p>
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                            {audienceLabels[a.targetAudience] ?? t("admin.settings.audienceAll")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                        {a.targetAudience === "specific" && Array.isArray(a.targetUserIds) && a.targetUserIds.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("admin.settings.recipientCount", { count: a.targetUserIds.length })}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteAnn.mutate(a.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Discount codes */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Tag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t("admin.settings.promoCodesTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("admin.settings.promoCodesDesc")}</p>
              </div>
            </div>

            {/* Create form */}
            <div className="mb-6 p-5 bg-secondary/50 rounded-xl border border-border">
              <h4 className="font-semibold text-sm mb-4 flex items-center gap-2"><Plus className="w-4 h-4" />{t("admin.settings.createNewCode")}</h4>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>{t("admin.settings.codeLabelHint")}</Label>
                  <Input
                    placeholder="ETUDE20"
                    value={dcCode}
                    onChange={e => setDcCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    className="uppercase font-mono tracking-widest"
                  />
                </div>
                <div>
                  <Label>{t("admin.settings.discountPct")}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="20"
                    value={dcPct}
                    onChange={e => setDcPct(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("admin.settings.maxUses")}</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="100"
                    value={dcMaxUses}
                    onChange={e => setDcMaxUses(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{t("admin.settings.expiryDate")}</Label>
                  <Input
                    type="date"
                    value={dcExpiry}
                    onChange={e => setDcExpiry(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
              <Button
                onClick={() => createDc.mutate({ code: dcCode, discountPercentage: dcPct, maxUses: dcMaxUses || null, expiresAt: dcExpiry || null })}
                disabled={createDc.isPending || !dcCode || !dcPct}
              >
                {createDc.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {t("admin.settings.createCode")}
              </Button>
            </div>

            {/* Codes table */}
            {discountCodes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t("admin.settings.noCodes")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="pb-3 pr-4">{t("admin.settings.colCode")}</th>
                      <th className="pb-3 pr-4">{t("admin.settings.colDiscount")}</th>
                      <th className="pb-3 pr-4">{t("admin.settings.colUses")}</th>
                      <th className="pb-3 pr-4">{t("admin.settings.colExpiry")}</th>
                      <th className="pb-3 pr-4">{t("admin.settings.colStatus")}</th>
                      <th className="pb-3">{t("admin.settings.colActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {discountCodes.map((dc: any) => {
                      const isExpired = dc.expiresAt && new Date() > new Date(dc.expiresAt);
                      const isExhausted = dc.maxUses !== null && dc.timesUsed >= dc.maxUses;
                      const statusLabel = isExpired
                        ? t("admin.settings.statusExpired")
                        : isExhausted
                        ? t("admin.settings.statusExhausted")
                        : dc.isActive
                        ? t("admin.settings.statusActive")
                        : t("admin.settings.statusInactive");
                      const statusClass = isExpired || isExhausted
                        ? "bg-red-100 text-red-700"
                        : dc.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground";

                      return (
                        <tr key={dc.id} className="py-3">
                          <td className="py-3 pr-4">
                            <span className="font-mono font-bold tracking-wider text-foreground">{dc.code}</span>
                          </td>
                          <td className="py-3 pr-4 font-semibold text-primary">{dc.discountPercentage}%</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {dc.timesUsed}{dc.maxUses !== null ? `/${dc.maxUses}` : ""}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {dc.expiresAt ? new Date(dc.expiresAt).toLocaleDateString("fr-FR") : "—"}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              {/* Copy */}
                              <button
                                onClick={() => copyCode(dc.id, dc.code)}
                                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                                title={t("admin.settings.copyCode")}
                              >
                                {copiedId === dc.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              {/* Toggle active */}
                              {!isExpired && !isExhausted && (
                                <button
                                  onClick={() => patchDc.mutate({ id: dc.id, isActive: !dc.isActive })}
                                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                                  title={dc.isActive ? t("admin.settings.deactivate") : t("admin.settings.activate")}
                                >
                                  {dc.isActive
                                    ? <ToggleRight className="w-4 h-4 text-green-500" />
                                    : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                                </button>
                              )}
                              {/* Delete */}
                              {confirmDeleteDc === dc.id ? (
                                <div className="flex items-center gap-1 ml-1">
                                  <button
                                    onClick={() => deleteDc.mutate(dc.id)}
                                    className="text-xs px-2 py-0.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                                  >
                                    {t("common.delete")}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteDc(null)}
                                    className="text-xs px-2 py-0.5 border border-border rounded-md hover:bg-muted"
                                  >
                                    {t("common.cancel")}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteDc(dc.id)}
                                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-red-500"
                                  title={t("common.delete")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Platform info */}
          <Card className="p-8">
            <h3 className="font-bold text-base mb-4 pb-3 border-b border-border">{t("admin.settings.systemInfo")}</h3>
            <dl className="space-y-2 text-sm">
              {[
                [t("admin.settings.infoPlatform"), "Étude+"],
                [t("admin.settings.infoVersion"), "2.0.0"],
                [t("admin.settings.infoEnv"), process.env.NODE_ENV ?? "production"],
                [t("admin.settings.infoDb"), "PostgreSQL"],
                [t("admin.settings.infoCommission"), `${commission}%`],
                [t("admin.settings.infoMaxPrice"), `${maxPrice} TND`],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between py-2 border-b border-border/30 last:border-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
