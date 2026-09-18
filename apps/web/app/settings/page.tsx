"use client";

import { useState } from "react";
import { RequireAuth } from "@/components/guards";
import { Button, Card, FadeIn, Input, Label, PageHeader } from "@/components/ui/Premium";
import { LevelPicker } from "@/components/shared/LevelPicker";
import { useAuth } from "@/hooks/use-auth";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { isSectionLevel } from "@etudeplus/shared";

function SettingsInner() {
  const { user, refresh } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [school, setSchool] = useState(user?.studentProfile?.schoolName ?? "");
  const [niveau, setNiveau] = useState(user?.studentProfile?.gradeLevel ?? "");
  const [section, setSection] = useState<string | null>(user?.studentProfile?.educationSection || null);
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveProfile() {
    if (niveau && isSectionLevel(niveau) && !section) {
      toast({ title: "Spécialité obligatoire", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api("/api/v1/users/me", { method: "PATCH", body: JSON.stringify({ firstName, lastName, city }) });
      await api("/api/v1/students/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ gradeLevel: niveau || undefined, educationSection: section ?? "", schoolName: school || null }),
      });
      await refresh();
      toast({ title: "Profil mis à jour" });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function savePassword() {
    setLoading(true);
    try {
      await api("/api/v1/users/me/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrent("");
      setNew("");
      toast({ title: "Mot de passe modifié" });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const initial = (user?.fullName || "É")[0];

  return (
    <FadeIn>
      <PageHeader title="Paramètres" description="Photo, identité, niveau et sécurité." />
      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary">
              {initial}
            </div>
            <div>
              <p className="font-semibold">{user?.fullName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Photo : upload signé bientôt (MinIO).</p>
            </div>
          </div>
          <div>
            <Label>Prénom</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Nom</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label>École (optionnel)</Label>
            <Input value={school} onChange={(e) => setSchool(e.target.value)} />
          </div>
          <div>
            <Label>Niveau & spécialité</Label>
            <LevelPicker niveauValue={niveau} sectionValue={section} onChange={(n, s) => { setNiveau(n); setSection(s); }} />
          </div>
          <Button isLoading={loading} onClick={() => void saveProfile()}>Enregistrer</Button>
        </Card>
        <Card className="p-6 space-y-4">
          <h2 className="font-serif font-bold text-xl">Mot de passe</h2>
          <div>
            <Label>Actuel</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <Label>Nouveau</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
          </div>
          <Button variant="outline" isLoading={loading} onClick={() => void savePassword()}>Changer le mot de passe</Button>
        </Card>
      </div>
    </FadeIn>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth roles={["student"]}>
      <SettingsInner />
    </RequireAuth>
  );
}
