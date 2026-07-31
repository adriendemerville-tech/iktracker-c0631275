import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MailCheck, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const GRACE_MS = 5 * 60 * 1000; // 5 minutes
const firstSeenKey = (uid: string) => `ik_first_session_at_${uid}`;

const isGmail = (email?: string | null) =>
  !!email && /@(gmail\.com|googlemail\.com)$/i.test(email.trim());

export const EmailVerificationGate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blocked, setBlocked] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const verified = !!user?.email_confirmed_at;

  // Start / resume the 5 minute grace period for this user
  useEffect(() => {
    if (!user || verified) {
      setBlocked(false);
      return;
    }

    const key = firstSeenKey(user.id);
    const stored = localStorage.getItem(key);
    const startedAt = stored ? parseInt(stored, 10) : Date.now();
    if (!stored) localStorage.setItem(key, String(startedAt));

    const remaining = startedAt + GRACE_MS - Date.now();
    if (remaining <= 0) {
      setBlocked(true);
      return;
    }

    const timer = window.setTimeout(() => setBlocked(true), remaining);
    return () => window.clearTimeout(timer);
  }, [user, verified]);

  // Open Gmail in a new tab as soon as the gate appears (Gmail addresses only)
  useEffect(() => {
    if (!blocked || verified) return;
    if (!isGmail(user?.email)) return;
    const flag = `ik_gmail_opened_${user?.id}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
    window.open("https://mail.google.com/mail/u/0/#search/IKtracker", "_blank", "noopener,noreferrer");
  }, [blocked, verified, user]);

  const handleResend = useCallback(async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
      toast({
        title: "Lien renvoyé",
        description: `Un nouvel email de vérification a été envoyé à ${user.email}.`,
      });
      if (isGmail(user.email)) {
        window.open("https://mail.google.com/mail/u/0/#search/IKtracker", "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      toast({
        title: "Envoi impossible",
        description: err instanceof Error ? err.message : "Réessayez dans quelques instants.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [user, toast]);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await supabase.auth.refreshSession();
      if (data.session?.user.email_confirmed_at) {
        localStorage.removeItem(firstSeenKey(data.session.user.id));
        setBlocked(false);
        toast({ title: "Email vérifié", description: "Merci, votre accès est débloqué." });
      } else {
        toast({
          title: "Toujours pas vérifié",
          description: "Cliquez sur le lien reçu par email, puis réessayez.",
          variant: "destructive",
        });
      }
    } finally {
      setChecking(false);
    }
  }, [toast]);

  if (!user || verified || !blocked) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && setBlocked(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Vérifiez votre adresse email</DialogTitle>
          <DialogDescription className="text-center">
            Confirmez l'adresse{" "}
            <span className="font-medium text-foreground">{user.email}</span> pour débloquer
            IKtracker. Sans vérification : {UNVERIFIED_TRIP_LIMIT} trajets et{" "}
            {UNVERIFIED_TOUR_LIMIT} tournée maximum, et aucun export de relevé.
          </DialogDescription>
        </DialogHeader>


        <div className="space-y-2">
          <Button className="w-full" onClick={handleResend} disabled={sending}>
            {sending ? "Envoi en cours..." : "Renvoyer le lien"}
          </Button>
          <Button variant="outline" className="w-full" onClick={handleCheck} disabled={checking}>
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            J'ai vérifié mon email
          </Button>
          {isGmail(user.email) && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() =>
                window.open(
                  "https://mail.google.com/mail/u/0/#search/IKtracker",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir Gmail
            </Button>
          )}
          <p className="pt-1 text-center text-xs text-muted-foreground">
            Pensez à vérifier vos spams si vous ne trouvez pas l'email.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
