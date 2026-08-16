import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Search, Share2, Bot } from "lucide-react";
import { motion } from "framer-motion";

const SOURCES = [
  { value: "communaute", label: "Communauté", icon: Users, color: "text-blue-500" },
  { value: "google", label: "Google", icon: Search, color: "text-amber-500" },
  { value: "reseaux_sociaux", label: "Réseaux sociaux", icon: Share2, color: "text-pink-500" },
  { value: "chatgpt", label: "ChatGPT", icon: Bot, color: "text-emerald-500" },
] as const;

export function ReferralSourceModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkIfNeeded = async () => {
      // Check if user already answered
      const { data } = await supabase
        .from("referral_sources")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!data || data.length === 0) {
        // Small delay so the app loads first
        setTimeout(() => setOpen(true), 800);
      }
    };

    checkIfNeeded();
  }, [user]);

  const handleSubmit = async () => {
    if (!selected || !user) return;
    setSaving(true);

    await supabase.from("referral_sources").insert({
      user_id: user.id,
      source: selected,
    });

    setSaving(false);
    setOpen(false);
  };

  const handleSkip = async () => {
    if (!user) return;
    // Insert 'skip' so we don't ask again
    await supabase.from("referral_sources").insert({
      user_id: user.id,
      source: "skip",
    });
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleSkip();
      }}
    >
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Comment avez-vous connu IKtracker ?
          </DialogTitle>
          <DialogDescription className="text-center">
            Aidez-nous à mieux comprendre notre audience
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {SOURCES.map((source, i) => {
            const Icon = source.icon;
            const isSelected = selected === source.value;
            return (
              <motion.button
                key={source.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(source.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <Icon className={`w-7 h-7 ${isSelected ? "text-primary" : source.color}`} />
                <span
                  className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}
                >
                  {source.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={handleSubmit} disabled={!selected || saving} className="w-full">
            {saving ? "Enregistrement..." : "Confirmer"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground text-xs"
          >
            Passer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
