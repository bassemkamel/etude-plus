"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Badge, Button, Card, FadeIn, Input, Label, PageHeader } from "@/components/ui/Premium";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";
import { formatDateTN } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  deletedAt: string | null;
  createdAt: string;
  student?: { gradeLevel?: string | null; educationSection?: string | null } | null;
  subscriptions?: Array<{ plan?: { nameFr?: string }; status: string }>;
};

function UsersInner() {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", email: "", password: "EtudePlus!2026", role: "student", gradeLevel: "bac" });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-users", q, role, status],
    queryFn: () => api<{ items: UserRow[]; total: number }>(`/api/v1/admin/users?q=${encodeURIComponent(q)}&role=${role}&status=${status}&limit=50`),
  });

  async function act(path: string, method = "POST") {
    try {
      await api(path, { method });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "OK" });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    }
  }

  async function create() {
    try {
      await api("/api/v1/admin/users", { method: "POST", body: JSON.stringify(form) });
      setCreateOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Utilisateur créé" });
    } catch (e) {
      toast({ title: (e as ApiError).message, variant: "destructive" });
    }
  }

  return (
    <FadeIn>
      <PageHeader
        title="Utilisateurs"
        description={`${data?.total ?? 0} comptes`}
        action={isSuper ? <Button onClick={() => setCreateOpen((v) => !v)}>Créer</Button> : undefined}
      />
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Recherche email / nom" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-12 rounded-xl border-2 border-border px-3">
          <option value="">Tous rôles</option>
          <option value="student">Élève</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 rounded-xl border-2 border-border px-3">
          <option value="">Actifs (non supprimés)</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
          <option value="archived">archived</option>
        </select>
      </div>
      {createOpen && (
        <Card className="p-5 mb-4 grid sm:grid-cols-2 gap-3">
          <div><Label>Prénom</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Mot de passe</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div>
            <Label>Rôle</Label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-12 w-full rounded-xl border-2 border-border px-3">
              <option value="student">student</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <Button onClick={() => void create()}>Enregistrer</Button>
        </Card>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-3">Nom</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Niveau</th>
              <th>Plan</th>
              <th>Créé</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="py-3">
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td>{u.role}</td>
                <td>
                  <Badge variant={u.deletedAt ? "destructive" : u.status === "suspended" ? "destructive" : "success"}>
                    {u.deletedAt ? "Supprimé" : u.status}
                  </Badge>
                </td>
                <td>{u.student?.gradeLevel || "—"}</td>
                <td>{u.subscriptions?.[0]?.plan?.nameFr || "—"}</td>
                <td>{formatDateTN(u.createdAt)}</td>
                <td className="space-x-1 whitespace-nowrap">
                  {u.status === "active" && <Button size="sm" variant="ghost" onClick={() => void act(`/api/v1/admin/users/${u.id}/suspend`)}>Suspendre</Button>}
                  {u.status !== "active" && <Button size="sm" variant="ghost" onClick={() => void act(`/api/v1/admin/users/${u.id}/activate`)}>Activer</Button>}
                  {isSuper && !u.deletedAt && <Button size="sm" variant="ghost" onClick={() => void act(`/api/v1/admin/users/${u.id}/archive`)}>Archiver</Button>}
                  {isSuper && u.deletedAt && <Button size="sm" variant="ghost" onClick={() => void act(`/api/v1/admin/users/${u.id}/restore`)}>Restaurer</Button>}
                  {isSuper && !u.deletedAt && u.role !== "super_admin" && (
                    <Button size="sm" variant="destructive" onClick={() => { setConfirmId(u.id); setConfirmEmail(""); }}>
                      Supprimer
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirmId && (
        <Card className="p-5 mt-4 max-w-md">
          <p className="font-semibold mb-2">Soft-delete : tape l’email du compte</p>
          <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" onClick={() => setConfirmId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => {
                const row = data?.items.find((x) => x.id === confirmId);
                if (row && confirmEmail.trim().toLowerCase() === row.email.toLowerCase()) {
                  void act(`/api/v1/admin/users/${confirmId}`, "DELETE");
                  setConfirmId(null);
                } else toast({ title: "Email incorrect", variant: "destructive" });
              }}
            >
              Confirmer
            </Button>
          </div>
        </Card>
      )}
    </FadeIn>
  );
}

export default function AdminUsersPage() {
  return (
    <RequireAuth roles={["admin", "super_admin"]}>
      <UsersInner />
    </RequireAuth>
  );
}
