import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button } from "@/components/ui/Premium";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isSameMonth, isToday as dateFnsIsToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { StartClassButton, LiveBadge } from "@/components/shared/SessionButton";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// ── Status chip colours ────────────────────────────────────────────────────────

function chipClass(status: string) {
  if (status === "live")
    return "bg-red-500/15 text-red-700 border border-red-400/40 dark:bg-red-500/20 dark:text-red-400 font-semibold animate-pulse";
  if (status === "ended")
    return "bg-muted text-muted-foreground border border-border opacity-60";
  return "bg-blue-500/15 text-blue-700 border border-blue-400/30 dark:bg-blue-500/20 dark:text-blue-400 font-medium";
}

export function ProfessorCalendar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const [selected, setSelected] = useState<any | null>(null);

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["professor-my-sessions"],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`${API_URL}/classes/my-sessions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const calDays = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  const firstDayOffset = (getDay(calDays[0]) + 6) % 7;

  const upcomingSessions = sessions
    .filter(s => new Date(s.scheduledAt) >= today && (s.status === "scheduled" || s.status === "live"))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 6);

  const DAY_LABELS = [
    t("prof.calendar.mon"), t("prof.calendar.tue"), t("prof.calendar.wed"),
    t("prof.calendar.thu"), t("prof.calendar.fri"), t("prof.calendar.sat"), t("prof.calendar.sun"),
  ];

  const startSession = async (sessionId: number) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/classes/sessions/${sessionId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d?.error ?? "Erreur lors du démarrage");
    }
    await qc.invalidateQueries({ queryKey: ["professor-my-sessions"] });
    // Update local selected session status too
    setSelected((s: any) => s ? { ...s, status: "live" } : s);
    toast({ title: "Cours démarré", description: "Le statut est maintenant EN DIRECT." });
  };

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("prof.calendar.title")}
          description={t("prof.calendar.description")}
        />

        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Calendar grid ──────────────────────────────────────────────── */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg capitalize">
                {format(viewDate, "MMMM yyyy", { locale: fr })}
              </h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setViewDate(today)}>
                  {t("prof.calendar.today")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {DAY_LABELS.map(day => (
                <div key={day} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {day}
                </div>
              ))}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-card/50 min-h-[80px] p-1" />
              ))}
              {calDays.map(day => {
                const isToday = dateFnsIsToday(day);
                const inMonth = isSameMonth(day, viewDate);
                const daySessions = sessions.filter(s => isSameDay(new Date(s.scheduledAt), day));
                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-card min-h-[80px] p-1.5 ${isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""} ${!inMonth ? "opacity-30" : ""}`}
                  >
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {daySessions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelected(s)}
                          className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate transition-opacity hover:opacity-80 ${chipClass(s.status)} ${selected?.id === s.id ? "ring-1 ring-current" : ""}`}
                          title={`${s.title} — ${s.className}`}
                        >
                          {format(new Date(s.scheduledAt), "HH:mm")} {s.title || s.className}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500/30 border border-blue-400/40" />Programmée</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/30 border border-red-400/40" />En direct</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-muted border border-border" />Terminée</span>
            </div>
          </Card>

          {/* ── Right panel ───────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Selected session detail */}
            {selected ? (
              <Card className={`p-5 ${selected.status === "live" ? "border-red-300 shadow-lg shadow-red-100/50 dark:shadow-red-900/20" : "border-primary/30"}`}>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selected.status === "live" ? <LiveBadge /> : (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        selected.status === "scheduled"
                          ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {selected.status === "scheduled" ? "Programmée" : "Terminée"}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="font-bold text-base leading-snug mb-1">{selected.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">{selected.className}</p>

                <div className="space-y-1.5 text-sm text-muted-foreground mb-5">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                    <span>{format(new Date(selected.scheduledAt), "EEEE d MMMM yyyy", { locale: fr })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      {format(new Date(selected.scheduledAt), "HH:mm")}
                      {" · "}{selected.durationHours}h
                    </span>
                  </div>
                  {selected.subject && (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 text-center text-primary shrink-0 text-xs font-bold">S</span>
                      <span>{selected.subject}</span>
                    </div>
                  )}
                </div>

                {selected.status !== "ended" && (
                  <StartClassButton
                    session={selected}
                    userName={user?.fullName ?? "Professeur"}
                    onStart={startSession}
                    className="w-full justify-center"
                  />
                )}
              </Card>
            ) : (
              /* Upcoming sessions list */
              <Card className="p-6">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> {t("prof.calendar.upcomingSessions")}
                </h3>
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="w-10 h-10 opacity-30 mx-auto mb-3" />
                    <p className="text-sm">{t("prof.calendar.noSessions")}</p>
                    <p className="text-xs mt-1">{t("prof.calendar.createFromCourse")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingSessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelected(s)}
                        className="w-full text-left flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 ${s.status === "live" ? "bg-red-500/10" : "bg-primary/10"}`}>
                          <span className={`text-[9px] font-bold uppercase ${s.status === "live" ? "text-red-600" : "text-primary"}`}>
                            {format(new Date(s.scheduledAt), "MMM", { locale: fr })}
                          </span>
                          <span className={`text-base font-bold leading-none ${s.status === "live" ? "text-red-600" : "text-primary"}`}>
                            {new Date(s.scheduledAt).getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm leading-tight truncate flex-1">{s.title}</p>
                            {s.status === "live" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{s.className}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(s.scheduledAt), "HH:mm")} · {s.durationHours}h
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <Card className="p-5">
              <p className="text-sm font-semibold mb-3">{t("prof.calendar.shortcuts")}</p>
              <Link href="/professor/classes">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> {t("prof.calendar.newSession")}
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
