import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Loader2, MessageSquareHeart, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFeedback } from "@/hooks/useFeedback";
import { supabase } from "@/integrations/supabase/client";

const MAX_CHARS = 700;

export default function Messages() {
  const { user } = useAuth();
  const { feedbacks, isLoading, unreadResponsesCount, markAllAsRead } = useFeedback();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (unreadResponsesCount > 0) markAllAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadResponsesCount]);

  const sendReply = async () => {
    if (!user || !reply.trim()) return;
    setSending(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      message: reply.trim(),
    } as any);
    setSending(false);
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre message",
        variant: "destructive",
      });
      return;
    }
    setReply("");
    queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    toast({ title: "Message envoyé", description: "Adrien vous répondra rapidement." });
  };

  const ordered = [...feedbacks].reverse();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/app">
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour
        </Link>
      </Button>

      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <MessageSquareHeart className="h-6 w-6 text-primary" /> Ma discussion
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Vos messages et les réponses d'Adrien, fondateur d'IKtracker.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {ordered.map((f) => (
            <div key={f.id} className="space-y-2">
              <div className="flex justify-end">
                <Card className="max-w-[85%] bg-primary/10">
                  <CardContent className="p-3">
                    <p className="whitespace-pre-wrap text-sm">{f.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Vous — {format(new Date(f.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  </CardContent>
                </Card>
              </div>
              {f.response && (
                <div className="flex justify-start">
                  <Card className="max-w-[85%] border-primary/20">
                    <CardContent className="p-3">
                      <p className="whitespace-pre-wrap text-sm">{f.response}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Adrien
                        {f.responded_at
                          ? ` — ${format(new Date(f.responded_at), "d MMM yyyy à HH:mm", { locale: fr })}`
                          : ""}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-2">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Écrire un message…"
          rows={4}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {reply.length}/{MAX_CHARS}
          </span>
          <Button onClick={sendReply} disabled={sending || !reply.trim()}>
            {sending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1 h-4 w-4" />
            )}
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}
