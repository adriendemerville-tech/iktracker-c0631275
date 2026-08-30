import type { ReactNode } from "react";

interface DirectAnswerProps {
  /** Formulée comme un prompt utilisateur : "Combien puis-je déduire au kilomètre en 2026 ?" */
  question: string;
  /** Réponse autoportante de 2 à 3 phrases maximum, chiffres inclus. */
  children: ReactNode;
  className?: string;
}

/**
 * Bloc "direct answer" placé immédiatement sous le H1 pour l'AEO/GEO :
 * une question formulée comme un prompt, suivie d'une réponse circonstanciée
 * autoportante (qui / quand / quoi / où / combien / pourquoi).
 *
 * Un JSON-LD `speakable` (WebPage + SpeakableSpecification) est rendu inline
 * en SSR pour signaler ce passage aux SERP et assistants vocaux.
 */
export function DirectAnswer({ question, children, className = "" }: DirectAnswerProps) {
  const speakableJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: question,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["[data-direct-answer]"],
    },
  }).replace(/</g, "\\u003c");

  return (
    <>
      <section
        id="direct-answer"
        aria-label="Réponse directe"
        data-direct-answer
        className={`citable-passage mx-auto mt-8 max-w-3xl rounded-xl border-l-4 border-primary bg-muted/40 px-5 py-5 text-left ${className}`}
      >
        <h3 className="text-base font-semibold text-foreground sm:text-lg">{question}</h3>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-foreground">{children}</div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: speakableJsonLd }} />
    </>
  );
}
