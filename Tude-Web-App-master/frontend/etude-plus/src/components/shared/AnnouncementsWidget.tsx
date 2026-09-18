import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { Card } from "@/components/ui/Premium";
import { Megaphone, X, ChevronDown, Crown, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch(url: string) {
  const token = getToken();
  const res = await fetch(url, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return res.ok ? res.json() : [];
}

export function AnnouncementsWidget() {
  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["announcements"],
    queryFn: () => apiFetch(`${API_URL}/announcements`),
    refetchInterval: 60_000,
  });

  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(true);

  const visible = announcements.filter((a: any) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <Card className="mb-8 overflow-hidden border-primary/20">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 bg-primary/5 border-b border-primary/10 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-primary">Annonces</span>
          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{visible.length}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-primary transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      {expanded && (
        <div className="divide-y divide-border">
          {visible.map((ann: any) => {
            const isPlatform = ann.type === "platform";
            return (
              <div key={ann.id} className="flex gap-4 p-5 hover:bg-muted/30 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPlatform ? "bg-primary/10" : "bg-blue-100"}`}>
                  {isPlatform
                    ? <Crown className="w-5 h-5 text-primary" />
                    : <BookOpen className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm">{ann.title}</p>
                      <p className="text-xs text-black mt-0.5 flex items-center gap-1.5">
                        {isPlatform
                          ? <span className="text-primary font-semibold">Étude+</span>
                          : <span>{ann.author?.fullName}</span>}
                        <span>·</span>
                        {ann.createdAt && format(new Date(ann.createdAt), "d MMM à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <button
                      onClick={() => setDismissed(s => new Set(s).add(ann.id))}
                      className="text-black hover:text-primary transition-colors shrink-0 mt-0.5"
                      title="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-black mt-1.5 leading-relaxed">{ann.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
