import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ForumAvatar } from "@/components/forum/ForumAvatar";
import { ForumLevelBadge } from "@/components/forum/ForumLevelBadge";
import { useForumProfile } from "@/hooks/useForumProfile";
import { upsertForumProfile } from "@/lib/forum.functions";
import { PERSONA_LABELS, levelInfo, nextLevel } from "@/lib/forum/constants";
import { getSupabase } from "@/integrations/supabase/lazy";

export default function ForumProfilePage() {
  const { profile, loading, refresh, user } = useForumProfile();
  const navigate = useNavigate();

  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [persona, setPersona] = useState("autre");
  const [city, setCity] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setPseudo(profile.pseudo);
      setBio(profile.bio ?? "");
      setPersona(profile.persona ?? "autre");
      setCity(profile.city ?? "");
      setVehicle(profile.vehicle ?? "");
      setAvatarUrl(profile.avatar_url);
    } else if (user && !loading) {
      const fallback = (user.email ?? "membre").split("@")[0];
      setPseudo(fallback.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20));
    }
  }, [profile, user, loading]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image trop lourde (2 Mo maximum).");
      return;
    }
    setUploading(true);
    try {
      const supabase = await getSupabase();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("forum-avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      // Bucket privé : lien signé longue durée (1 an) stocké sur la fiche.
      const { data } = await supabase.storage
        .from("forum-avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      setAvatarUrl(data?.signedUrl ?? null);
      toast.success("Photo mise à jour");
    } catch {
      toast.error("Envoi de la photo impossible.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (pseudo.trim().length < 3) {
      toast.error("Le pseudo doit faire au moins 3 caractères.");
      return;
    }
    setSaving(true);
    try {
      const res = await upsertForumProfile({
        data: {
          pseudo: pseudo.trim(),
          bio: bio.trim() || null,
          persona,
          city: city.trim() || null,
          vehicle: vehicle.trim() || null,
          avatar_url: avatarUrl,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await refresh();
      toast.success("Fiche d'identité enregistrée");
      navigate("/forum");
    } catch {
      toast.error("Enregistrement impossible pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  const current = levelInfo(profile?.level ?? "nouveau");
  const upcoming = nextLevel(profile?.level ?? "nouveau");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold">Ma fiche d'identité forum</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Votre e-mail, vos plaques d'immatriculation et vos trajets restent strictement privés :
        seuls votre pseudo, votre métier, votre photo et votre niveau sont visibles.
      </p>

      <div className="mt-6 space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <ForumAvatar pseudo={pseudo || "?"} avatarUrl={avatarUrl} size={64} />
          <div>
            <label
              htmlFor="forum-avatar"
              className="inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-1.5 text-sm"
            >
              {uploading ? "Envoi…" : "Changer la photo"}
            </label>
            <input
              id="forum-avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP · 2 Mo max</p>
          </div>
        </div>

        <div>
          <label htmlFor="pseudo" className="mb-1 block text-xs font-medium">
            Pseudo public
          </label>
          <Input
            id="pseudo"
            value={pseudo}
            maxLength={24}
            onChange={(e) => setPseudo(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="persona" className="mb-1 block text-xs font-medium">
            Métier
          </label>
          <Select value={persona} onValueChange={setPersona}>
            <SelectTrigger id="persona">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERSONA_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="city" className="mb-1 block text-xs font-medium">
            Ville (facultatif)
          </label>
          <Input
            id="city"
            value={city}
            maxLength={60}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex : Nantes"
          />
        </div>

        <div>
          <label htmlFor="vehicle" className="mb-1 block text-xs font-medium">
            Véhicule (facultatif)
          </label>
          <Input
            id="vehicle"
            value={vehicle}
            maxLength={60}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="Ex : Peugeot 308"
          />
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-xs font-medium">
            Présentation (facultatif)
          </label>
          <Textarea
            id="bio"
            rows={3}
            maxLength={280}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ex : infirmière libérale dans le Vaucluse, 30 000 km par an."
          />
        </div>

        {profile && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span>Niveau actuel :</span>
              <ForumLevelBadge level={profile.level} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile.points} points · {profile.discussions_count} discussions ·{" "}
              {profile.replies_count} réponses
              {upcoming
                ? ` · ${Math.max(0, upcoming.min - profile.points)} points avant ${upcoming.label}`
                : ` · niveau maximum ${current.label}`}
            </p>
          </div>
        )}

        <Button variant="gradient" onClick={save} disabled={saving} className="w-full">
          {saving ? "Enregistrement…" : "Enregistrer ma fiche"}
        </Button>
      </div>
    </div>
  );
}
