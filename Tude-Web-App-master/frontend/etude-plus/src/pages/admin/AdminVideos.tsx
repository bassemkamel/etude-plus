import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getToken } from "@workspace/api-client-react";
import { Upload, Trash2, Play, Plus, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudyVideo {
  id: number;
  title: string;
  description: string | null;
  videoPath: string;
  thumbnailPath: string | null;
  gradeLevel: string | null;
  subject: string | null;
  views: number;
  createdAt: string;
  uploaderName: string | null;
}

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return res;
}

async function uploadVideoFile(file: File): Promise<string> {
  const token = getToken();
  // Step 1: request upload slot
  const slotRes = await fetch(`${API_URL}/storage/uploads/request-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name: file.name, contentType: file.type, size: file.size }),
  });
  const slot = await slotRes.json();
  if (!slotRes.ok) throw new Error(slot.error ?? "Erreur lors de la demande d'upload");

  if (slot.local) {
    // Local mode: read as base64 and post to /storage/uploads/direct
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const directRes = await fetch(`${API_URL}/storage/uploads/direct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ objectPath: slot.objectPath, content: base64, contentType: file.type }),
    });
    if (!directRes.ok) throw new Error("Erreur lors de l'upload local");
    return slot.objectPath as string;
  }

  // GCS presigned upload
  await fetch(slot.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return slot.objectPath as string;
}

export function AdminVideos() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<StudyVideo[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    gradeLevel: "",
    subject: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function loadVideos() {
    setLoadingList(true);
    apiFetch(`${API_URL}/mon-prof/videos`).then(async res => {
      if (res.ok) setVideos(await res.json());
      setLoadingList(false);
    });
  }

  useEffect(() => { loadVideos(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) { toast({ title: "Sélectionne un fichier vidéo", variant: "destructive" }); return; }
    if (!form.title.trim()) { toast({ title: "Le titre est requis", variant: "destructive" }); return; }

    setUploading(true);
    try {
      const videoPath = await uploadVideoFile(selectedFile);
      const createRes = await apiFetch(`${API_URL}/mon-prof/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          videoPath,
          gradeLevel: form.gradeLevel.trim() || undefined,
          subject: form.subject.trim() || undefined,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Erreur");
      }
      toast({ title: "Vidéo publiée avec succès !" });
      setShowForm(false);
      setForm({ title: "", description: "", gradeLevel: "", subject: "" });
      setSelectedFile(null);
      loadVideos();
    } catch (err: any) {
      toast({ title: err.message ?? "Erreur lors de l'upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    const res = await apiFetch(`${API_URL}/mon-prof/videos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setVideos(v => v.filter(x => x.id !== id));
      toast({ title: "Vidéo supprimée" });
    } else {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
    setDeleting(null);
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Shorts Étude</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Publiez des courtes vidéos pédagogiques pour les élèves</p>
          </div>
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Annuler" : "Nouvelle vidéo"}
          </button>
        </div>

        {/* Upload form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="border border-border rounded-2xl p-6 space-y-4 bg-card">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Publier une nouvelle vidéo
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1">Titre *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="Ex: Démonstration du théorème de Pythagore"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus-visible:outline-none focus-visible:border-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Brève description du contenu..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus-visible:outline-none focus-visible:border-primary resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Niveau</label>
                <input
                  value={form.gradeLevel}
                  onChange={e => setForm(f => ({ ...f, gradeLevel: e.target.value }))}
                  placeholder="Ex: bac, 3eme, 9eme..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus-visible:outline-none focus-visible:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Matière</label>
                <input
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Ex: Mathématiques, Physique..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus-visible:outline-none focus-visible:border-primary"
                />
              </div>
            </div>

            {/* File picker */}
            <div>
              <label className="text-sm font-medium block mb-2">Fichier vidéo * (.mp4, .webm)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors text-sm text-muted-foreground hover:text-foreground w-full justify-center"
              >
                <Upload className="w-4 h-4" />
                {selectedFile ? selectedFile.name : "Choisir un fichier vidéo"}
              </button>
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Publication en cours..." : "Publier la vidéo"}
            </button>
          </form>
        )}

        {/* Videos list */}
        {loadingList ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
            <Play className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune vidéo publiée</p>
            <p className="text-sm mt-1">Publiez votre première courte vidéo pédagogique.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{videos.length} vidéo{videos.length !== 1 ? "s" : ""} publiée{videos.length !== 1 ? "s" : ""}</p>
            {videos.map(video => (
              <div key={video.id} className="border border-border rounded-2xl p-4 bg-card flex items-start gap-4">
                {/* Thumbnail / icon */}
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {video.thumbnailPath ? (
                    <img src={`${API_URL}/storage${video.thumbnailPath}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Play className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{video.title}</p>
                  {video.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{video.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {video.gradeLevel && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{video.gradeLevel}</span>
                    )}
                    {video.subject && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{video.subject}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{video.views} vue{video.views !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(video.id)}
                  disabled={deleting === video.id}
                  className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                >
                  {deleting === video.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
