import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Input, Label } from "@/components/ui/Premium";
import { ProfileCard } from "@/components/shared/ProfileCard";
import { LevelPicker } from "@/components/shared/LevelPicker";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getToken, changePassword } from "@workspace/api-client-react";
import { KeyRound, Loader2, GraduationCap, Save } from "lucide-react";
import { getLevelLabel } from "@/lib/educationConfig";
import { useTranslation } from "react-i18next";

const SUPABASE_FN = "https://hilqkzjqysqjbfftqlkf.supabase.co/functions/v1";

function ChangePasswordCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { toast({ title: t("common.error"), description: t("register.errorPasswordMatch"), variant: "destructive" }); return; }
    if (next.length < 8) { toast({ title: t("common.error"), description: t("student.settings.minChars"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      toast({ title: t("student.settings.passwordUpdated") });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <KeyRound className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-lg">{t("student.settings.changePassword")}</h3>
      </div>
      <form onSubmit={handle} className="space-y-4 max-w-sm">
        <div><Label>{t("student.settings.currentPassword")}</Label><Input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" /></div>
        <div><Label>{t("student.settings.newPassword")}</Label><Input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder={t("student.settings.minCharsPlaceholder")} /></div>
        <div><Label>{t("student.settings.confirmPassword")}</Label><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={t("student.settings.repeatPassword")} /></div>
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("student.settings.updating")}</> : t("student.settings.changePassword")}
        </Button>
      </form>
    </Card>
  );
}

function EducationLevelCard() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const currentLevel: string = (user as any)?.studentProfile?.gradeLevel ?? "";
  const currentSection: string | null = (user as any)?.studentProfile?.educationSection ?? null;
  const [niveauKey, setNiveauKey] = useState(currentLevel);
  const [sectionKey, setSectionKey] = useState<string | null>(currentSection);
  const [saving, setSaving] = useState(false);

  const changed = niveauKey !== currentLevel || sectionKey !== currentSection;

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niveauKey) { toast({ title: t("common.error"), description: t("student.settings.selectLevel"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${SUPABASE_FN}/users/${(user as any).id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ gradeLevel: niveauKey, educationSection: sectionKey }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).error ?? t("common.error")); }
      await refreshUser();
      toast({ title: t("student.settings.levelUpdated"), description: t("student.settings.nowAt", { level: getLevelLabel(niveauKey) }) });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">{t("student.settings.gradeLevel")}</h3>
          {currentLevel && (
            <p className="text-xs text-muted-foreground mt-0.5">{t("student.settings.current")} <strong>{getLevelLabel(currentLevel)}</strong></p>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {t("student.settings.gradeLevelDesc")}
      </p>
      <form onSubmit={handle} className="space-y-4">
        <LevelPicker niveauValue={niveauKey} sectionValue={sectionKey} onChange={(n, s) => { setNiveauKey(n); setSectionKey(s); }} />
        <Button type="submit" disabled={saving || !changed || !niveauKey}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("student.settings.updating")}</> : <><Save className="w-4 h-4 mr-2" />{t("student.settings.saveLevel")}</>}
        </Button>
      </form>
    </Card>
  );
}

export function StudentSettings() {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader title={t("student.settings.title")} description={t("student.settings.description")} />
        <div className="max-w-3xl space-y-6">
          <ProfileCard />
          <EducationLevelCard />
          <ChangePasswordCard />
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
