import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Premium";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { subjectToSlug, subjectFromSlug } from "@/lib/educationConfig";
import {
  BookOpen, ChevronRight, Lightbulb, ChevronDown, ChevronUp,
  Construction,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch(path: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function NotionsCles() {
  const { t } = useTranslation();
  const [, params] = useRoute("/revision/:subject/notions-cles");
  const subject = params?.subject ? (subjectFromSlug(params.subject) ?? decodeURIComponent(params.subject)) : "";
  const { user } = useAuth();

  const gradeLevel: string = (user as any)?.studentProfile?.gradeLevel ?? "";
  const sectionKey: string | null = (user as any)?.studentProfile?.educationSection ?? null;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const { data: notions = [], isLoading } = useQuery<any[]>({
    queryKey: ["notions", subject, gradeLevel, sectionKey],
    queryFn: () => apiFetch(
      `/api/revision/content/notions?subject=${encodeURIComponent(subject)}&gradeLevel=${encodeURIComponent(gradeLevel)}${sectionKey ? `&sectionKey=${encodeURIComponent(sectionKey)}` : ""}`
    ),
    enabled: !!subject && !!gradeLevel,
    staleTime: 10 * 60 * 1000,
  });

  // Distinct topics
  const topics = [...new Set(notions.map((n: any) => n.topic).filter(Boolean))];
  const filtered = selectedTopic ? notions.filter((n: any) => n.topic === selectedTopic) : notions;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 flex-wrap">
            <BookOpen className="w-4 h-4" />
            <Link href="/revision" className="hover:text-foreground transition-colors">{t("revisionPages.notionsCles.breadcrumbHub")}</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/revision/${subjectToSlug(subject)}`} className="hover:text-foreground transition-colors">{subject}</Link>
            <ChevronRight className="w-3 h-3" />
            <span>{t("revisionPages.notionsCles.breadcrumbSection")}</span>
          </div>
          <h1 className="text-2xl font-bold">{t("revisionPages.notionsCles.title", { subject })}</h1>
          <p className="text-muted-foreground mt-1">{t("revisionPages.notionsCles.subtitle")}</p>
        </div>

        {/* Topic filter */}
        {topics.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTopic(null)}
              className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                !selectedTopic ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {t("revisionPages.notionsCles.all")}
            </button>
            {topics.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  selectedTopic === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        )}

        {!isLoading && notions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Construction className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold">{t("revisionPages.notionsCles.inPrep")}</h2>
            <p className="text-muted-foreground max-w-sm">
              {t("revisionPages.notionsCles.inPrepDesc", { subject })}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((notion: any) => {
              const isExpanded = expandedId === notion.id;
              return (
                <Card key={notion.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full text-left p-5 flex items-start gap-4"
                    onClick={() => setExpandedId(isExpanded ? null : notion.id)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {notion.topic && (
                        <p className="text-xs text-muted-foreground mb-0.5">{notion.topic}</p>
                      )}
                      <p className="font-semibold text-sm">{notion.title}</p>
                    </div>
                    <div className="shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pl-[68px] space-y-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {notion.content}
                      </p>
                      {notion.example && (
                        <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4">
                          <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">{t("revisionPages.notionsCles.example")}</p>
                          <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
                            {notion.example}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
