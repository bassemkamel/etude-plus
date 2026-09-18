"use client";

import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { formatDateTN } from "@/lib/utils";

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <FadeIn>
        <PageHeader title="Notifications" />
        <NotifList />
      </FadeIn>
    </RequireAuth>
  );
}

function NotifList() {
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<Array<{ id: string; title: string; body?: string; createdAt: string }>>("/api/v1/notifications"),
  });
  if (!data.length) return <Card className="p-8 text-center text-muted-foreground">Rien de nouveau pour le moment.</Card>;
  return (
    <div className="space-y-2 max-w-2xl">
      {data.map((n) => (
        <Card key={n.id} className="p-4">
          <p className="font-semibold">{n.title}</p>
          {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
          <p className="text-xs text-muted-foreground mt-1">{formatDateTN(n.createdAt)}</p>
        </Card>
      ))}
    </div>
  );
}
