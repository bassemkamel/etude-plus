import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button } from "@/components/ui/Premium";
import { Bell, Info, CheckCircle, AlertTriangle, Calendar as CalIcon } from "lucide-react";
import { useGetMyNotifications, useMarkNotificationRead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

function getIcon(type: string) {
  switch (type) {
    case "reminder": return <CalIcon className="w-5 h-5 text-blue-500" />;
    case "success": return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "warning": return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    default: return <Info className="w-5 h-5 text-primary" />;
  }
}

function getBg(type: string) {
  switch (type) {
    case "reminder": return "bg-blue-100";
    case "success": return "bg-green-100";
    case "warning": return "bg-orange-100";
    default: return "bg-primary/20";
  }
}

function fmtDate(iso: string, t: (key: string, opts?: any) => string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return t("student.notifications.justNow");
  if (diff < 3600) return t("student.notifications.minutesAgo", { minutes: Math.floor(diff / 60) });
  if (diff < 86400) return t("student.notifications.hoursAgo", { hours: Math.floor(diff / 3600) });
  if (diff < 172800) return t("student.notifications.yesterday");
  return d.toLocaleDateString("fr-FR");
}

export function StudentNotifications() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useGetMyNotifications() as any;
  const markRead = useMarkNotificationRead();

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleMarkAllRead = () => {
    const unread = notifications.filter((n: any) => !n.isRead);
    Promise.all(unread.map((n: any) => markRead.mutateAsync({ id: n.id }))).then(() => {
      qc.invalidateQueries({ queryKey: ["/api/notifications/me"] });
    });
  };

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader
          title={t("student.notifications.title")}
          description={t("student.notifications.description")}
          action={
            unreadCount > 0
              ? <Button variant="outline" onClick={handleMarkAllRead}>{t("student.notifications.markAllRead")}</Button>
              : undefined
          }
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">{t("student.notifications.noNotifications")}</h3>
            <p className="text-muted-foreground">{t("student.notifications.noNotificationsDesc")}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="divide-y divide-border">
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`p-5 sm:p-6 flex gap-4 transition-colors ${!n.isRead ? "bg-primary/5 hover:bg-primary/10" : "bg-card hover:bg-muted/50"}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${getBg(n.type ?? "info")}`}>
                    {getIcon(n.type ?? "info")}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-base ${!n.isRead ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                        {n.title}
                      </h4>
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap ml-4">
                        {n.createdAt ? fmtDate(n.createdAt, t) : ""}
                      </span>
                    </div>
                    <p className={`text-sm ${!n.isRead ? "text-foreground/90 font-medium" : "text-muted-foreground"}`}>
                      {n.message}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </FadeIn>
    </DashboardLayout>
  );
}
