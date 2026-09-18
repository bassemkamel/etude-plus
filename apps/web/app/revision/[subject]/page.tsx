"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Library, FileText, ClipboardList, Layers, ChevronRight } from "lucide-react";
import { RequireAuth } from "@/components/guards";
import { Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { unslugSubject, subjectEmoji } from "@/lib/subjects";

const MODULES = [
  { href: "banque", icon: Library, title: "Banque de questions", desc: "Exercices par chapitre, barème /20" },
  { href: "examens-blancs", icon: FileText, title: "Examens blancs", desc: "Annales filtrées par année" },
  { href: "examens-pratiques", icon: ClipboardList, title: "Examens pratiques", desc: "QCM et exercices packagés" },
  { href: "flashcards", icon: Layers, title: "Flashcards", desc: "Recto / verso — espace pour retourner" },
];

function SubjectHub() {
  const params = useParams<{ subject: string }>();
  const subject = unslugSubject(params.subject);

  return (
    <FadeIn>
      <Link href="/revision" className="text-sm text-primary font-medium">← Matières</Link>
      <PageHeader title={`${subjectEmoji(subject)} ${subject}`} description="Choisis un module de révision." />
      <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
        {MODULES.map((m) => (
          <Link key={m.href} href={`/revision/${params.subject}/${m.href}`}>
            <Card className="p-6 h-full hover:border-primary/40 transition-all flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <m.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-bold">{m.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />
            </Card>
          </Link>
        ))}
      </div>
    </FadeIn>
  );
}

export default function SubjectPage() {
  return (
    <RequireAuth roles={["student"]}>
      <SubjectHub />
    </RequireAuth>
  );
}
