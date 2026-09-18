import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button } from "@/components/ui/Premium";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, isToday as dateFnsIsToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function StudentCalendar() {
  const { t } = useTranslation();
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);

  const calDays = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  const firstDayOffset = (getDay(calDays[0]) + 6) % 7;

  const DAY_LABELS = [
    t("student.calendar.mon"), t("student.calendar.tue"), t("student.calendar.wed"),
    t("student.calendar.thu"), t("student.calendar.fri"), t("student.calendar.sat"), t("student.calendar.sun"),
  ];

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("student.calendar.title")}
          description={t("student.calendar.description")}
        />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar grid */}
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
                  {t("student.calendar.today")}
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
                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-card min-h-[80px] p-1.5 ${isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""} ${!inMonth ? "opacity-30" : ""}`}
                  >
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Right panel */}
          <Card className="p-6">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" /> {t("student.calendar.upcomingSessions")}
            </h3>
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="w-10 h-10 opacity-30 mx-auto mb-3" />
              <p className="text-sm">{t("student.calendar.noSessions")}</p>
              {/* MVP: live session calendar will be populated when professor features are re-enabled */}
            </div>
          </Card>
        </div>
      </FadeIn>
    </DashboardLayout>
  );
}
