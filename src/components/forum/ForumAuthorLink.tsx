import { useState } from "react";
import { Car, MapPin, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ForumAvatar } from "@/components/forum/ForumAvatar";
import { ForumLevelBadge } from "@/components/forum/ForumLevelBadge";
import { personaLabel } from "@/lib/forum/constants";
import { getSupabase } from "@/integrations/supabase/lazy";

interface ProfileSummary {
  user_id: string;
  pseudo: string;
  avatar_url: string | null;
  level: string;
  persona: string | null;
  city: string | null;
  vehicle: string | null;
  bio: string | null;
  points: number;
  discussions_count: number;
  replies_count: number;
  upvotes_received: number;
  member_since: string;
  pseudo_enabled: boolean;
  is_moderator: boolean;
}

interface ForumAuthorLinkProps {
  userId?: string | null;
  pseudo?: string | null;
  className?: string;
}

/** Nom d'auteur cliquable ouvrant une fiche de profil résumée. */
export function ForumAuthorLink({ userId, pseudo, className }: ForumAuthorLinkProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const sendToModerator = async () => {
    const text = message.trim();
    if (text.length < 5) {
      toast.error("Votre message est trop court.");
      return;
    }
    setSending(true);
    try {
      const supabase = await getSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Connectez-vous pour écrire au modérateur.");
        return;
      }
      const { error } = await supabase.from("feedback").insert({
        user_id: auth.user.id,
        message: `[Forum → modérateur] ${text}`,
      });
      if (error) throw error;
      toast.success("Message envoyé au modérateur.");
      setMessage("");
      setComposing(false);
    } catch {
      toast.error("Envoi impossible pour le moment.");
    } finally {
      setSending(false);
    }
  };

  const label = pseudo ?? "Membre";

  if (!userId) {
    return <span className={className}>{label}</span>;
  }

  const load = async () => {
    setOpen(true);
    if (profile || loading) return;
    setLoading(true);
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("forum_profiles")
        .select(
          "user_id, pseudo, avatar_url, level, persona, city, vehicle, bio, points, discussions_count, replies_count, upvotes_received, member_since, pseudo_enabled, is_moderator",
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setProfile(data as unknown as ProfileSummary);
    } finally {
      setLoading(false);
    }
  };

  const anonymous = profile?.pseudo_enabled === false;
  const displayName = anonymous ? "Membre anonyme" : (profile?.pseudo ?? label);

  return (
    <>
      <button
        type="button"
        onClick={load}
        className={`rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`}
      >
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Profil de {displayName}</DialogTitle>
          </DialogHeader>

          {loading && !profile ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>
          ) : profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ForumAvatar
                  pseudo={displayName}
                  avatarUrl={anonymous ? null : profile.avatar_url}
                  size={56}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{displayName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <ForumLevelBadge level={profile.level} moderator={profile.is_moderator} />
                    {personaLabel(profile.persona) && <span>{personaLabel(profile.persona)}</span>}
                    {profile.city && !anonymous && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {profile.city}
                      </span>
                    )}
                    {profile.vehicle && !anonymous && (
                      <span className="inline-flex items-center gap-1">
                        <Car className="h-3 w-3" aria-hidden="true" />
                        {profile.vehicle}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {profile.bio && !anonymous && (
                <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
              )}

              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Discussions", value: profile.discussions_count },
                  { label: "Réponses", value: profile.replies_count },
                  { label: "Votes reçus", value: profile.upvotes_received },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-muted/30 p-2">
                    <dt className="text-[11px] text-muted-foreground">{stat.label}</dt>
                    <dd className="text-sm font-semibold">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              {profile.is_moderator && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="flex items-center gap-2 text-xs font-medium text-primary">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Modérateur du forum
                  </p>
                  {composing ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="Votre message au modérateur…"
                        className="text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setComposing(false)}>
                          Annuler
                        </Button>
                        <Button size="sm" onClick={sendToModerator} disabled={sending}>
                          <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                          {sending ? "Envoi…" : "Envoyer"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setComposing(true)}
                    >
                      Écrire au modérateur
                    </Button>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Membre depuis le{" "}
                {new Date(profile.member_since).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}{" "}
                · {profile.points} points
              </p>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Profil indisponible.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
