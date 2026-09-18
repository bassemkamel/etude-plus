"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, TrendingUp, CreditCard, BookOpen, FileText, UserX } from "lucide-react";
import { RequireAuth } from "@/components/guards";
import { Card, FadeIn, PageHeader, Badge } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { formatTND } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type Overview = {
  revenueMtd: number;
  revenue30: number;
  mrr: number;
  activeSubs: number;
  new7: number;
  students: number;
  suspended: number;
  questionsPublished: number;
  draftsAi: number;
  pdf7: number;
  byLevel: Array<{ gradeLevel: string | null; _count: number }>;
  dailyRevenue: Array<{ date: string; amount: number }>;
};

function AdminHome() {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api<Overview>("/api/v1/admin/analytics/overview"),
    enabled: isSuper,
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users-home"],
    queryFn: () => api<{ total: number }>("/api/v1/admin/users?limit=1"),
  });

  const kpis = isSuper
    ? [
        { label: "Revenu MTD", value: isLoading ? "…" : formatTND(data?.revenueMtd ?? 0), icon: TrendingUp, sub: `30 j : ${formatTND(data?.revenue30 ?? 0)}` },
        { label: "MRR", value: isLoading ? "…" : formatTND(data?.mrr ?? 0), icon: CreditCard, sub: `${data?.activeSubs ?? 0} abos actifs` },
        { label: "Élèves", value: isLoading ? "…" : String(data?.students ?? 0), icon: Users, sub: `+${data?.new7 ?? 0} / 7 j` },
        { label: "Questions", value: isLoading ? "…" : String(data?.questionsPublished ?? 0), icon: BookOpen, sub: `${data?.draftsAi ?? 0} brouillons IA` },
      ]
    : [
        { label: "Utilisateurs", value: String(users?.total ?? "…"), icon: Users, sub: "Comptes visibles" },
        { label: "Suspendus", value: "—", icon: UserX, sub: "Modération" },
        { label: "Contenu", value: "—", icon: FileText, sub: "KB & questions" },
        { label: "Codes promo", value: "—", icon: CreditCard, sub: "Gestion" },
      ];

  const levelData = (data?.byLevel ?? []).map((l) => ({ name: l.gradeLevel || "—", n: l._count }));

  return (
    <FadeIn>
      <PageHeader title="Vue d’ensemble" description="Pilotage Étude+" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <k.icon className="w-4 h-4" /> {k.label}
            </div>
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
          </Card>
        ))}
      </div>
      {isSuper && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-5">
            <p className="font-semibold mb-4">Revenu journalier (30 j)</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.dailyRevenue ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {!(data?.dailyRevenue?.length) && <p className="text-sm text-muted-foreground -mt-48 text-center pt-24">Pas encore de paiements.</p>}
          </Card>
          <Card className="p-5">
            <p className="font-semibold mb-4">Élèves par niveau</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="n" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/users"><Badge>Utilisateurs</Badge></Link>
        <Link href="/admin/questions"><Badge>Questions</Badge></Link>
        <Link href="/admin/discounts"><Badge>Codes promo</Badge></Link>
        {isSuper && <Link href="/admin/subscriptions"><Badge>Grant abo</Badge></Link>}
        {isSuper && <Link href="/admin/analytics"><Badge>Analytiques</Badge></Link>}
      </div>
    </FadeIn>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth roles={["admin", "super_admin"]}>
      <AdminHome />
    </RequireAuth>
  );
}
