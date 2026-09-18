/**
 * /kb — Private admin knowledge base upload tool.
 * No link from anywhere in the UI. Admin accesses by typing /kb directly.
 * Completely standalone — no sidebar, no nav, no DashboardLayout.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { SIMPLE_LEVELS, SECTION_LEVELS } from "@/lib/educationConfig";
import { apiFetch, apiFetchArray } from "@/lib/api";

const API = import.meta.env.VITE_API_URL ?? "";

// ── Education data ──────────────────────────────────────────────────────────

const ALL_SUBJECTS = [
  ...new Set([
    ...Object.values(SIMPLE_LEVELS).flatMap(l => [...l.subjects]),
    ...Object.values(SECTION_LEVELS).flatMap(nv =>
      Object.values(nv.sections).flatMap(s => [...s.subjects])
    ),
  ]),
].sort((a, b) => a.localeCompare(b, "fr"));

type GradeOption = { value: string; label: string; sectionKey?: string };
const GRADE_OPTIONS: GradeOption[] = [
  // Collège & 1ère secondaire (tronc commun)
  { value: "7eme",            label: "7ème année de base" },
  { value: "8eme",            label: "8ème année de base" },
  { value: "9eme",            label: "9ème année de base" },
  { value: "1ere_secondaire", label: "1ère année secondaire" },
  // 2ème — 4 orientations (مسلك)
  { value: "2eme", sectionKey: "lettres",                  label: "2ème — Lettres" },
  { value: "2eme", sectionKey: "sciences",                 label: "2ème — Sciences" },
  { value: "2eme", sectionKey: "economie_services",        label: "2ème — Économie et Services" },
  { value: "2eme", sectionKey: "technologie_informatique", label: "2ème — Technologie de l'Informatique" },
  // 3ème — 6 sections (شعبة)
  { value: "3eme", sectionKey: "lettres",                  label: "3ème — Lettres" },
  { value: "3eme", sectionKey: "mathematiques",            label: "3ème — Mathématiques" },
  { value: "3eme", sectionKey: "sciences_experimentales",  label: "3ème — Sciences Expérimentales" },
  { value: "3eme", sectionKey: "sciences_techniques",      label: "3ème — Sciences Techniques" },
  { value: "3eme", sectionKey: "economie_gestion",         label: "3ème — Économie et Gestion" },
  { value: "3eme", sectionKey: "sciences_informatique",    label: "3ème — Sciences de l'Informatique" },
  // Bac — 6 sections (شعبة)
  { value: "bac",  sectionKey: "lettres",                  label: "Bac — Lettres" },
  { value: "bac",  sectionKey: "mathematiques",            label: "Bac — Mathématiques" },
  { value: "bac",  sectionKey: "sciences_experimentales",  label: "Bac — Sciences Expérimentales" },
  { value: "bac",  sectionKey: "sciences_techniques",      label: "Bac — Sciences Techniques" },
  { value: "bac",  sectionKey: "economie_gestion",         label: "Bac — Économie et Gestion" },
  { value: "bac",  sectionKey: "sciences_informatique",    label: "Bac — Sciences de l'Informatique" },
];

const CONTENT_TYPES = [
  { value: "cours",   label: "Cours / Leçon" },
  { value: "examen",  label: "Examen / Contrôle" },
  { value: "exercices", label: "Exercices" },
  { value: "annale",  label: "Annale officielle" },
  { value: "resume",  label: "Résumé / Fiche" },
  { value: "manuel",  label: "Manuel scolaire (extrait)" },
];

// ── Types ───────────────────────────────────────────────────────────────────

interface SelectedFile {
  file: File;
  id:   string;
  dupWarning: boolean;
  dupExisting: any | null;
  ignoredup: boolean;
}

// Drizzle returns camelCase keys matching the schema column names
interface KBFileRecord {
  id:              number;
  fileName:        string;
  fileType:        string | null;
  subject:         string;
  gradeLevel:      string;
  topic:           string;
  contentType:     string;
  status:          "processing" | "processed" | "error";
  errorMessage:    string | null;
  questionsCount:  number;
  flashcardsCount: number;
  notionsCount:    number;
  createdAt:       string;
  processedAt:     string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fileIcon(name: string | null | undefined, mime: string | null | undefined) {
  const ext  = (name ?? "").split(".").pop()?.toLowerCase() ?? "";
  const type = mime ?? "";
  if (type.includes("pdf") || ext === "pdf")  return "📄";
  if (ext === "txt")                           return "📝";
  if (ext === "pptx")                          return "📊";
  if (type.includes("image") || ["jpg","jpeg","png"].includes(ext)) return "🖼️";
  return "📎";
}

function statusBadge(status: KBFileRecord["status"]) {
  if (status === "processing") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
      🟡 En traitement
    </span>
  );
  if (status === "processed") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      ✅ Traité
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      ❌ Erreur
    </span>
  );
}

// authHeader removed — all fetches now use the shared apiFetch/apiFetchArray utility

// ── Main Component ───────────────────────────────────────────────────────────

export function KnowledgeBase() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Auth gate
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }
  if (!user) { navigate("/login"); return null; }
  if (user.role !== "admin" && user.role !== "super_admin") {
    const dash = user.role === "professor" ? "/professor/dashboard" :
                 user.role === "student"   ? "/student/dashboard"   : "/";
    navigate(dash);
    return null;
  }

  return <KBPage userId={user.id} />;
}

// ── Inner Page (auth guaranteed) ────────────────────────────────────────────

function KBPage({ userId }: { userId: number }) {
  // Metadata form
  const [subject,      setSubject]      = useState("");
  const [gradeKey,     setGradeKey]     = useState<GradeOption | null>(null);
  const [topic,        setTopic]        = useState("");
  const [contentType,  setContentType]  = useState("");
  const [notes,        setNotes]        = useState("");

  // File selection
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [dragging,      setDragging]      = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploading,      setUploading]      = useState(false);
  const [uploadedBatch,  setUploadedBatch]  = useState<KBFileRecord[]>([]);
  const [pollingIds,     setPollingIds]     = useState<number[]>([]);

  // History
  const [history,        setHistory]        = useState<KBFileRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedRow,    setExpandedRow]    = useState<number | null>(null);
  const [expandedData,   setExpandedData]   = useState<any | null>(null);

  // Load history on mount
  useEffect(() => {
    apiFetchArray<KBFileRecord>(`${API}/api/kb/files`)
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .finally(() => setHistoryLoading(false));
  }, []);

  // Poll for status of recently uploaded files
  useEffect(() => {
    if (pollingIds.length === 0) return;
    const interval = setInterval(async () => {
      const raw = await apiFetchArray<KBFileRecord>(
        `${API}/api/kb/files/status?ids=${pollingIds.join(",")}`,
      );
      const data = Array.isArray(raw) ? raw : [];

      setUploadedBatch(prev =>
        (Array.isArray(prev) ? prev : []).map(f => {
          const updated = data.find(d => d.id === f.id);
          return updated ?? f;
        })
      );

      setHistory(prev =>
        (Array.isArray(prev) ? prev : []).map(f => {
          const updated = data.find(d => d.id === f.id);
          return updated ?? f;
        })
      );

      const stillProcessing = data.filter(d => d.status === "processing").map(d => d.id);
      setPollingIds(stillProcessing);
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingIds]);

  // ── File handling ──────────────────────────────────────────────────────────

  const addFiles = useCallback((incoming: File[]) => {
    const allowed = incoming.filter(f => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return ["pdf","txt","pptx","jpg","jpeg","png"].includes(ext) ||
             ["application/pdf","text/plain","application/vnd.openxmlformats-officedocument.presentationml.presentation","image/jpeg","image/png"].includes(f.type);
    });
    setSelectedFiles(prev => [
      ...prev,
      ...allowed.map(f => ({
        file: f,
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        dupWarning: false,
        dupExisting: null,
        ignoredup: false,
      })),
    ]);
  }, []);

  const removeFile = (id: string) =>
    setSelectedFiles(prev => prev.filter(f => f.id !== id));

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  // ── Duplicate check ────────────────────────────────────────────────────────

  const checkDuplicates = async () => {
    if (!subject || !gradeKey) return;
    const updated = await Promise.all(
      selectedFiles.map(async sf => {
        const params = new URLSearchParams({
          file_name:   sf.file.name,
          subject,
          grade_level: gradeKey.value,
        });
        const data = await apiFetch<{ duplicate: boolean; existing?: any }>(
          `${API}/api/kb/check-duplicate?${params}`,
        );
        return { ...sf, dupWarning: data?.duplicate ?? false, dupExisting: data?.existing ?? null };
      })
    );
    setSelectedFiles(updated);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const canSubmit = subject && gradeKey && topic && contentType && selectedFiles.length > 0 && !uploading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await checkDuplicates();

    const filesToProcess = selectedFiles.filter(sf => !sf.dupWarning || sf.ignoredup);
    if (filesToProcess.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    filesToProcess.forEach(sf => formData.append("files", sf.file));
    formData.append("subject",      subject);
    formData.append("grade_level",  gradeKey!.value);
    if (gradeKey!.sectionKey) formData.append("section_key", gradeKey!.sectionKey);
    formData.append("topic",        topic);
    formData.append("content_type", contentType);
    if (notes) formData.append("notes", notes);

    try {
      const result = await apiFetch<KBFileRecord[]>(`${API}/api/kb/upload`, {
        method: "POST",
        body:   formData as any,
      });
      const created = Array.isArray(result) ? result : [];
      setUploadedBatch(created);
      setPollingIds(created.filter(f => f.status === "processing").map(f => f.id));
      setHistory(prev => [...created, ...(Array.isArray(prev) ? prev : [])]);
      setSelectedFiles([]);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const deleteFile = async (id: number) => {
    if (!confirm("Supprimer ce fichier et tout le contenu généré ?")) return;
    await apiFetch(`${API}/api/kb/files/${id}`, { method: "DELETE" });
    setHistory(prev => (Array.isArray(prev) ? prev : []).filter(f => f.id !== id));
    setUploadedBatch(prev => (Array.isArray(prev) ? prev : []).filter(f => f.id !== id));
    if (expandedRow === id) { setExpandedRow(null); setExpandedData(null); }
  };

  // ── Row expand ─────────────────────────────────────────────────────────────

  const toggleRow = async (id: number) => {
    if (expandedRow === id) { setExpandedRow(null); setExpandedData(null); return; }
    setExpandedRow(id);
    setExpandedData(null);
    const data = await apiFetch(`${API}/api/kb/files/${id}`);
    setExpandedData(data ?? null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center font-serif font-bold text-amber-950 text-lg">É</div>
        <h1 className="text-lg font-bold tracking-tight">Base de Connaissances — Étude+</h1>
        <span className="ml-auto text-xs text-gray-400 font-mono">Admin only · /kb</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Upload section ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 className="text-base font-semibold">Importer des fichiers</h2>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? "border-amber-400 bg-amber-50" : "border-gray-300 hover:border-amber-400 hover:bg-amber-50/30"
            }`}
          >
            <div className="text-4xl mb-3">📁</div>
            <p className="font-medium text-gray-700">Glisser-déposer des fichiers ici</p>
            <p className="text-sm text-gray-400 mt-1">ou cliquer pour parcourir</p>
            <p className="text-xs text-gray-300 mt-2">PDF · TXT · PPTX · JPG · PNG — max 25 Mo par fichier</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.pptx,.jpg,.jpeg,.png,application/pdf,text/plain,image/jpeg,image/png"
              className="hidden"
              onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }}
            />
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map(sf => (
                <div key={sf.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xl">{fileIcon(sf.file.name, sf.file.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sf.file.name}</p>
                    <p className="text-xs text-gray-400">{(sf.file.size / 1024 / 1024).toFixed(2)} Mo</p>
                    {sf.dupWarning && !sf.ignoredup && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-amber-700">
                        <span>⚠️ Ce fichier a déjà été traité.</span>
                        <button className="font-bold underline" onClick={() => setSelectedFiles(prev => prev.map(f => f.id === sf.id ? { ...f, ignoredup: true } : f))}>Retraiter</button>
                        <button className="font-bold underline text-red-600" onClick={() => removeFile(sf.id)}>Ignorer</button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeFile(sf.id)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          )}

          {/* Metadata form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Matière */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Matière *</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Sélectionner...</option>
                {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Niveau */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Niveau / Classe *</label>
              <select
                value={gradeKey ? `${gradeKey.value}__${gradeKey.sectionKey ?? ""}` : ""}
                onChange={e => {
                  const [val, sk] = e.target.value.split("__");
                  setGradeKey(GRADE_OPTIONS.find(g => g.value === val && (g.sectionKey ?? "") === sk) ?? null);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Sélectionner...</option>
                {GRADE_OPTIONS.map(g => (
                  <option key={`${g.value}__${g.sectionKey ?? ""}`} value={`${g.value}__${g.sectionKey ?? ""}`}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapitre */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Chapitre / Thème *</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="ex. Fonctions linéaires"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Type de contenu */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Type de contenu *</label>
              <select
                value={contentType}
                onChange={e => setContentType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Sélectionner...</option>
                {CONTENT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Notes (optionnel)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Contexte supplémentaire pour l'IA..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-amber-400 hover:bg-amber-500 text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? "Envoi en cours..." : `Envoyer à la base de connaissances${selectedFiles.length > 0 ? ` (${selectedFiles.length} fichier${selectedFiles.length > 1 ? "s" : ""})` : ""}`}
          </button>
        </div>

        {/* ── Current batch status ── */}
        {uploadedBatch.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
            <h2 className="text-base font-semibold">Dernier envoi</h2>
            {uploadedBatch.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xl">{fileIcon(f.fileName, f.fileType ?? "")}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.fileName}</p>
                  {f.status === "processed" && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {f.questionsCount} questions · {f.flashcardsCount} flashcards · {f.notionsCount} notions
                    </p>
                  )}
                  {f.status === "error" && f.errorMessage && (
                    <p className="text-xs text-red-600 mt-0.5">{f.errorMessage}</p>
                  )}
                </div>
                {statusBadge(f.status)}
              </div>
            ))}
          </div>
        )}

        {/* ── Processing history table ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold">Historique des imports</h2>
          </div>
          {historyLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Chargement...</div>
          ) : !Array.isArray(history) || history.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Aucun fichier importé pour l'instant.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Fichier</th>
                    <th className="px-4 py-3 text-left">Matière</th>
                    <th className="px-4 py-3 text-left">Niveau</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left">Contenu généré</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map(f => (
                    <>
                      <tr
                        key={f.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleRow(f.id)}
                      >
                        <td className="px-4 py-3 max-w-[180px]">
                          <div className="flex items-center gap-2">
                            <span>{fileIcon(f.fileName, f.fileType ?? "")}</span>
                            <span className="truncate font-medium">{f.fileName}</span>
                          </div>
                          <p className="text-xs text-gray-400 ml-6 truncate">{f.topic}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{f.subject}</td>
                        <td className="px-4 py-3 text-gray-600">{f.gradeLevel}</td>
                        <td className="px-4 py-3">{statusBadge(f.status)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {f.status === "processed"
                            ? `${f.questionsCount} q · ${f.flashcardsCount} fc · ${f.notionsCount} n`
                            : f.status === "error" ? <span className="text-red-500">Erreur</span>
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(f.createdAt).toLocaleDateString("fr-TN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={e => { e.stopPropagation(); deleteFile(f.id); }}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                      {expandedRow === f.id && (
                        <tr key={`${f.id}-detail`}>
                          <td colSpan={7} className="px-4 py-4 bg-gray-50">
                            {!expandedData ? (
                              <p className="text-xs text-gray-400">Chargement...</p>
                            ) : (
                              <div className="space-y-3">
                                {expandedData.questions?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">QUESTIONS ({expandedData.questions.length})</p>
                                    <div className="space-y-1">
                                      {expandedData.questions.slice(0, 5).map((q: any) => (
                                        <div key={q.id} className="text-xs bg-white rounded-lg border border-gray-100 px-3 py-2">
                                          <span className="font-medium text-amber-600">[{q.difficulty}]</span>{" "}
                                          {q.question_text?.slice(0, 100) ?? q.questionText?.slice(0, 100)}...
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {expandedData.flashcards?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">FLASHCARDS ({expandedData.flashcards.length})</p>
                                    <div className="grid grid-cols-2 gap-1">
                                      {expandedData.flashcards.slice(0, 4).map((fc: any) => (
                                        <div key={fc.id} className="text-xs bg-white rounded-lg border border-gray-100 px-3 py-2">
                                          <span className="font-medium">{fc.front?.slice(0, 60)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {expandedData.notions?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">NOTIONS ({expandedData.notions.length})</p>
                                    <div className="flex flex-wrap gap-1">
                                      {expandedData.notions.map((n: any) => (
                                        <span key={n.id} className="text-xs bg-purple-50 text-purple-700 rounded-full px-2 py-0.5">
                                          {n.title}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {expandedData.annales?.length > 0 && (
                                  <p className="text-xs text-green-600 font-medium">✅ Sauvegardé comme annale</p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
