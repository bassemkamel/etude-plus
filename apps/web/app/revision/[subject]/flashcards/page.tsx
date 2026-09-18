"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/guards";
import { Button, Card, FadeIn, PageHeader } from "@/components/ui/Premium";
import { api } from "@/lib/api";
import { unslugSubject } from "@/lib/subjects";

type CardT = { id: string; front: string; back: string; topic: string; preview?: boolean };

function Flash() {
  const params = useParams<{ subject: string }>();
  const subject = unslugSubject(params.subject);
  const { data: cards = [] } = useQuery({
    queryKey: ["flash", subject],
    queryFn: () => api<CardT[]>(`/api/v1/revision/flashcards?subject=${encodeURIComponent(subject)}`),
  });
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const c = cards[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setFlip((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <FadeIn>
      <Link href={`/revision/${params.subject}`} className="text-sm text-primary font-medium">← {subject}</Link>
      <PageHeader title="Flashcards" description="Espace = retourner la carte." />
      {!c ? (
        <Card className="p-10 text-center text-muted-foreground">Pas encore de cartes pour cette matière.</Card>
      ) : (
        <>
          <button type="button" onClick={() => setFlip((v) => !v)} className="w-full max-w-xl">
            <Card className="p-12 min-h-[240px] flex items-center justify-center text-center text-xl font-medium">
              {flip ? c.back : c.front}
            </Card>
          </button>
          <p className="text-sm text-muted-foreground mt-3">{c.topic} · {i + 1}/{cards.length}</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" disabled={i === 0} onClick={() => { setI((x) => x - 1); setFlip(false); }}>Précédent</Button>
            <Button disabled={i >= cards.length - 1} onClick={() => { setI((x) => x + 1); setFlip(false); }}>Suivant</Button>
          </div>
        </>
      )}
    </FadeIn>
  );
}

export default function FlashPage() {
  return (
    <RequireAuth roles={["student"]}>
      <Flash />
    </RequireAuth>
  );
}
