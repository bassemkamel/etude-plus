"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { RequireAuth } from "@/components/guards";
import { Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { formatTND } from "@/lib/utils";

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];

function AnalyticsInner() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api<any>("/api/v1/admin/analytics/overview"),
  });
  const levelData = (data?.byLevel ?? []).map((l: any) => ({ name: l.gradeLevel || "—", n: l._count }));

  return (
    <FadeIn>
      <PageHeader title="Analytiques" description="CA, effectifs, graphes." />
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5"><p className="text-sm text-muted-foreground">MTD</p><p className="text-2xl font-bold">{formatTND(data?.revenueMtd ?? 0)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">MRR</p><p className="text-2xl font-bold">{formatTND(data?.mrr ?? 0)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted-foreground">Abos actifs</p><p className="text-2xl font-bold">{data?.activeSubs ?? 0}</p></Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 h-72">
          <p className="font-semibold mb-3">Revenu 30 j</p>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data?.dailyRevenue ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line dataKey="amount" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 h-72">
          <p className="font-semibold mb-3">Niveaux</p>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={levelData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="n" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 h-72">
          <p className="font-semibold mb-3">Répartition (élèves vs drafts)</p>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={[
                  { name: "Élèves", value: data?.students ?? 0 },
                  { name: "Drafts IA", value: data?.draftsAi ?? 0 },
                  { name: "PDF 7 j", value: data?.pdf7 ?? 0 },
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
              >
                {COLORS.map((c) => <Cell key={c} fill={c} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </FadeIn>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireAuth roles={["super_admin"]}>
      <AnalyticsInner />
    </RequireAuth>
  );
}
