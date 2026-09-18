import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@workspace/api-client-react";
import { Card, Button, Input, Label } from "@/components/ui/Premium";
import { Camera, Loader2, Star, BookOpen, MapPin, Calendar, Shield, Save } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const API_URL = import.meta.env.VITE_API_URL ?? "";

const ROLE_LABELS: Record<string, string> = {
  student: "Élève",
  professor: "Professeur",
  admin: "Administrateur",
  super_admin: "Super Admin",
};

async function uploadFile(file: File, token: string): Promise<string> {
  const urlRes = await fetch(`${API_URL}/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!urlRes.ok) throw new Error("Impossible d'obtenir l'URL d'upload");
  const { uploadURL, objectPath, local } = await urlRes.json();

  if (local) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const dirRes = await fetch(`${API_URL}/storage/uploads/direct`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ objectPath, content: base64, contentType: file.type }),
    });
    if (!dirRes.ok) throw new Error("Échec de l'upload local");
  } else {
    const putRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putRes.ok) throw new Error("Échec de l'upload");
  }
  return objectPath;
}

export function ProfileCard() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [city, setCity] = useState((user as any)?.city ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!user) return null;

  const prof = (user as any)?.professorProfile;
  const rating = prof?.rating ? Number(prof.rating) : null;
  const photoUrl = previewUrl
    ?? (user.profilePhoto ? `${API_URL}/storage${user.profilePhoto}` : null);

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Seules les images sont acceptées.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Image trop lourde (max 5 Mo).", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Non authentifié");
      const objectPath = await uploadFile(file, token);

      // Save to user profile
      const res = await fetch(`${API_URL}/users/${(user as any).id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profilePhoto: objectPath }),
      });
      if (!res.ok) throw new Error("Impossible de sauvegarder la photo");

      setPreviewUrl(`${API_URL}/storage${objectPath}`);
      await refreshUser();
      toast({ title: "Photo mise à jour" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: "Erreur", description: "Le nom ne peut pas être vide.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/users/${(user as any).id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: fullName.trim(), city: city.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error ?? "Erreur de sauvegarde");
      }
      await refreshUser();
      toast({ title: "Profil mis à jour" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-8">
      <form onSubmit={handleSave}>
        {/* Avatar + identity */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-border">
          {/* Avatar */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={uploadingPhoto}
              className="w-28 h-28 rounded-full overflow-hidden border-4 border-background shadow-xl ring-2 ring-border hover:ring-primary transition-all group relative block"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="Photo de profil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/15 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{user.fullName.charAt(0)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                {uploadingPhoto
                  ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                  : <Camera className="w-6 h-6 text-white" />}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Identity info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold">{user.fullName}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">{user.email}</p>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
              {/* Role badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                user.role === "super_admin" ? "bg-red-100 text-red-700" :
                user.role === "admin" ? "bg-blue-100 text-blue-700" :
                user.role === "professor" ? "bg-green-100 text-green-700" :
                "bg-violet-100 text-violet-700"
              }`}>
                <Shield className="w-3 h-3" />
                {ROLE_LABELS[user.role] ?? user.role}
              </span>

              {/* City */}
              {(user as any).city && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  <MapPin className="w-3 h-3" />{(user as any).city}
                </span>
              )}

              {/* Member since */}
              {(user as any).createdAt && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Membre depuis {format(new Date((user as any).createdAt), "MMMM yyyy", { locale: fr })}
                </span>
              )}
            </div>

            {/* Professor stats */}
            {prof && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4">
                {rating !== null && (
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-4 h-4 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                      ))}
                      <span className="font-bold text-sm ml-1">{rating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{prof.totalReviews ?? 0} avis</p>
                  </div>
                )}
                {prof.totalStudents != null && (
                  <div className="text-center">
                    <p className="font-bold text-lg">{prof.totalStudents}</p>
                    <p className="text-xs text-muted-foreground">élèves</p>
                  </div>
                )}
                {prof.subjects?.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    {prof.subjects.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editable fields */}
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Votre nom" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted/60 text-muted-foreground cursor-not-allowed" />
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Tunis, Sfax…" />
          </div>
          <div>
            <Label>Rôle</Label>
            <Input value={ROLE_LABELS[user.role] ?? user.role} disabled className="bg-muted/60 text-muted-foreground cursor-not-allowed" />
          </div>
        </div>

        <div className="mt-6">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde…</> : <><Save className="w-4 h-4 mr-2" />Enregistrer le profil</>}
          </Button>
        </div>
      </form>
    </Card>
  );
}
