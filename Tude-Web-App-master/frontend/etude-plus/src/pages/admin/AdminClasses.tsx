import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader, Card, FadeIn, Button, Badge, Input } from "@/components/ui/Premium";
import { Search, BookOpen, Users, DollarSign, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { getToken } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatTND } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function adminFetch(path: string, method = "GET", body?: unknown) {
  const token = getToken();
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Error ${res.status}`);
  }
  return res.json();
}

function useAdminClasses(search: string) {
  return useQuery({
    queryKey: ["/api/admin/classes", search],
    queryFn: () => adminFetch(`${API_URL}/admin/classes${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });
}

function useClassAction(action: "archive" | "unarchive" | "delete") {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (classId: number) =>
      action === "delete"
        ? adminFetch(`${API_URL}/admin/classes/${classId}`, "DELETE")
        : adminFetch(`${API_URL}/admin/classes/${classId}/${action}`, "POST"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      const labelKeys: Record<string, string> = {
        archive: "admin.classes.archived",
        unarchive: "admin.classes.restored",
        delete: "admin.classes.deleted",
      };
      toast({ title: t(labelKeys[action]) });
    },
    onError: (err: any) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });
}

export function AdminClasses() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminClasses(search) as any;
  const classes: any[] = data?.classes ?? [];

  const archiveMutation = useClassAction("archive");
  const unarchiveMutation = useClassAction("unarchive");
  const deleteMutation = useClassAction("delete");

  const published = classes.filter((c: any) => !c.isArchived);
  const totalEnrolled = classes.reduce((s: number, c: any) => s + (c.enrolledCount ?? 0), 0);
  const totalVolume = classes.reduce((s: number, c: any) => s + (c.price * (c.enrolledCount ?? 0)), 0);

  return (
    <DashboardLayout>
      <FadeIn>
        <PageHeader title={t("admin.classes.title")} description={t("admin.classes.description")} />

        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          {[
            { label: t("admin.classes.activeCourses"), value: published.length, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
            { label: t("admin.classes.totalEnrollments"), value: totalEnrolled, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
            { label: t("admin.classes.enrollmentVolume"), value: formatTND(totalVolume), icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
          ].map((s, i) => (
            <Card key={i} className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "..." : s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input className="pl-10" placeholder={t("admin.classes.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}</div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold text-muted-foreground">{t("admin.classes.colCourse")}</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">{t("admin.classes.colProfessor")}</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">{t("admin.classes.colSubject")}</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">{t("admin.classes.colStudents")}</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">{t("admin.classes.colPrice")}</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">{t("admin.classes.colStatus")}</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">{t("admin.classes.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls: any) => (
                    <tr
                      key={cls.id}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${cls.isArchived ? "opacity-50" : ""}`}
                    >
                      <td className="p-4">
                        <p className="font-semibold">{cls.title}</p>
                        <p className="text-xs text-muted-foreground">{cls.gradeLevel}</p>
                      </td>
                      <td className="p-4 text-muted-foreground">{cls.professor?.fullName ?? "—"}</td>
                      <td className="p-4"><Badge variant="secondary">{cls.subject}</Badge></td>
                      <td className="p-4 text-center font-medium">{cls.enrolledCount ?? 0}</td>
                      <td className="p-4 text-right font-bold">{formatTND(cls.price)}</td>
                      <td className="p-4 text-center">
                        {cls.isArchived ? (
                          <Badge variant="destructive">{t("admin.classes.statusArchived")}</Badge>
                        ) : cls.isPublished ? (
                          <Badge variant="success">{t("admin.classes.statusPublished")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("admin.classes.statusDraft")}</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {cls.isArchived ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              disabled={unarchiveMutation.isPending}
                              onClick={() => unarchiveMutation.mutate(cls.id)}
                            >
                              <ArchiveRestore className="w-4 h-4 mr-1" /> {t("admin.classes.restore")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-600 border-amber-200 hover:bg-amber-50"
                              disabled={archiveMutation.isPending}
                              onClick={() => archiveMutation.mutate(cls.id)}
                            >
                              <Archive className="w-4 h-4 mr-1" /> {t("admin.classes.archive")}
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (confirm(t("admin.classes.deleteConfirm", { title: cls.title }))) {
                                  deleteMutation.mutate(cls.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {classes.length === 0 && (
                <div className="py-16 text-center text-muted-foreground">
                  <BookOpen className="w-10 h-10 opacity-30 mx-auto mb-3" />
                  <p>{search ? t("admin.classes.noResultsFor", { search }) : t("admin.classes.noClasses")}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </FadeIn>
    </DashboardLayout>
  );
}
