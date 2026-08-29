import { LastUpdated } from "@/components/LastUpdated";
import { getStaticLastModified } from "@/lib/page-dates";
import { Helmet } from "@/lib/helmet-compat";
import { ORGANIZATION_ID } from "@/lib/seo-schemas";
import { ArrowLeft, Mail, MessageSquare, Send } from "lucide-react";
import { useNavigate, Link } from "@/lib/router-compat";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import founderImage from "@/assets/founder-adrien-optimized.webp";
import { Breadcrumb } from "@/components/Breadcrumb";

const PAGE_LASTMOD = getStaticLastModified("/contact");

const Contact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !email || !message) {
      toast({ title: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Email invalide", variant: "destructive" });
      return;
    }

    if (message.length > 2000) {
      toast({ title: "Message trop long (2000 caractères max)", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        message: `[CONTACT] ${name} (${email})\n\n${message}`,
        user_id: user?.id || "00000000-0000-0000-0000-000000000000",
        device_info: { source: "contact_page", name, email },
      });

      if (error) throw error;

      setSent(true);
      toast({ title: "Message envoyé !", description: "Nous vous répondrons rapidement." });
    } catch {
      toast({
        title: "Erreur lors de l'envoi",
        description: "Réessayez ou écrivez-nous à contact@iktracker.fr",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact IKtracker",
            description: "Page de contact d'IKtracker",
            url: "https://iktracker.fr/contact",
            inLanguage: "fr-FR",
            mainEntity: {
              "@type": "Organization",
              "@id": ORGANIZATION_ID,
              name: "IKtracker",
              url: "https://iktracker.fr",
              email: "contact@iktracker.fr",
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "contact@iktracker.fr",
                availableLanguage: "French",
              },
            },
          })}
        </script>
      </Helmet>

      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById("main-content");
          if (main) {
            main.focus();
            main.scrollIntoView({ behavior: "smooth" });
          }
        }}
      >
        Aller au contenu principal
      </a>

      <header
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-xs border-b border-border"
        role="banner"
      >
        <nav
          className="container mx-auto px-4 py-4 flex items-center gap-4"
          aria-label="Navigation"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="text-xl font-semibold" id="page-heading">
            Contact
          </h1>
        </nav>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 py-8 max-w-xl outline-hidden"
        aria-labelledby="page-heading"
      >
        <Breadcrumb items={[{ label: "Contact" }]} />
        {PAGE_LASTMOD ? <LastUpdated date={PAGE_LASTMOD} className="mb-4" /> : null}

        {/* Intro */}
        <p className="text-muted-foreground leading-relaxed mb-6">
          Une question sur le calcul de vos indemnités kilométriques, un bug à signaler, une
          suggestion de fonctionnalité ou une demande de partenariat&nbsp;? Chaque message est lu
          personnellement par le fondateur. Nous répondons en général sous 48&nbsp;heures ouvrées.
        </p>

        {/* Direct email */}
        <div className="bg-muted/50 rounded-xl p-5 mb-6 flex items-start gap-3">
          <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm text-foreground font-medium">Écrivez-nous directement</p>
            <a href="mailto:contact@iktracker.fr" className="text-sm text-primary hover:underline">
              contact@iktracker.fr
            </a>
          </div>
        </div>

        {/* Self-service */}
        <div className="rounded-xl border border-border bg-card p-5 mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Avant de nous écrire — la réponse est peut-être déjà là&nbsp;:
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/bareme-ik-2026" className="text-primary hover:underline">
                Barème kilométrique 2026
              </Link>{" "}
              <span className="text-muted-foreground">
                — taux officiels par puissance fiscale, majoration électrique
              </span>
            </li>
            <li>
              <Link to="/tarifs" className="text-primary hover:underline">
                Tarifs et gratuité
              </Link>{" "}
              <span className="text-muted-foreground">
                — pourquoi IKtracker est gratuit à vie, sans carte bancaire
              </span>
            </li>
            <li>
              <Link to="/lexique" className="text-primary hover:underline">
                Lexique des frais kilométriques
              </Link>{" "}
              <span className="text-muted-foreground">
                — définitions des termes fiscaux et URSSAF
              </span>
            </li>
            <li>
              <Link to="/blog" className="text-primary hover:underline">
                Blog et guides pratiques
              </Link>{" "}
              <span className="text-muted-foreground">
                — frais réels, contrôle URSSAF, déclaration 2042
              </span>
            </li>
          </ul>
        </div>

        {sent ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Message envoyé !</h2>
            <p className="text-sm text-muted-foreground">
              Nous vous répondrons dans les plus brefs délais.
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => navigate("/")}>
                Retour à l'accueil
              </Button>
              <Button
                onClick={() => {
                  setSent(false);
                  setForm({ name: "", email: "", message: "" });
                }}
              >
                Envoyer un autre message
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nom</Label>
              <Input
                id="contact-name"
                placeholder="Votre nom"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={100}
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="votre@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                maxLength={255}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                placeholder="Comment pouvons-nous vous aider ?"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                maxLength={2000}
                rows={5}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{form.message.length}/2000</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  Envoi…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Envoyer
                </span>
              )}
            </Button>
          </form>
        )}

        {/* Founder section */}
        <section className="mt-12 pt-8 border-t border-border">
          <div className="bg-muted/50 rounded-2xl p-6">
            <figure className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              <img
                src={founderImage}
                alt="Adrien de Volontat, fondateur d'IKtracker"
                width={60}
                height={60}
                className="w-[60px] h-[60px] rounded-full object-cover flex-shrink-0 border-2 border-border"
                loading="lazy"
              />
              <figcaption className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  IKtracker est développé par{" "}
                  <strong className="text-foreground">Adrien de Volontat</strong>, entrepreneur et
                  fondateur d'Avenir Rénovations. Chaque message est lu personnellement.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                  <Link
                    to="/mentions-legales"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Mentions légales
                  </Link>
                  <span className="text-muted-foreground/50" aria-hidden="true">
                    •
                  </span>
                  <Link
                    to="/privacy"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Confidentialité
                  </Link>
                  <span className="text-muted-foreground/50" aria-hidden="true">
                    •
                  </span>
                  <Link
                    to="/"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Accueil
                  </Link>
                </div>
              </figcaption>
            </figure>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Contact;
