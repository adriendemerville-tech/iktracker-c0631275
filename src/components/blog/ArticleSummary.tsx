import { ListChecks, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface ArticleSummaryProps {
  content: string;
}

// Extract key points from article content for summary
function extractKeyPoints(content: string): string[] {
  // Try to find bullet points in the content first
  const bulletMatches = content.match(/^[-•*]\s+(.+)$/gm);
  if (bulletMatches && bulletMatches.length >= 3) {
    return bulletMatches
      .slice(0, 3)
      .map(line => cleanMarkdown(line.replace(/^[-•*]\s+/, '').trim()));
  }

  // Otherwise extract from headings or first sentences
  const lines = content.split('\n').filter(line => line.trim());
  const keyPoints: string[] = [];

  // Look for H2 headings first
  for (const line of lines) {
    if (line.startsWith('## ') && keyPoints.length < 3) {
      const heading = line.replace(/^##\s+/, '').trim();
      if (heading.length > 10 && heading.length < 100) {
        keyPoints.push(cleanMarkdown(heading));
      }
    }
  }

  // If not enough headings, extract from paragraphs
  if (keyPoints.length < 3) {
    const paragraphs = lines.filter(
      line => !line.startsWith('#') && 
              !line.startsWith('-') && 
              !line.startsWith('*') &&
              line.length > 50
    );

    for (const para of paragraphs) {
      if (keyPoints.length >= 3) break;
      // Get first sentence
      const sentence = para.split(/[.!?]/)[0]?.trim();
      if (sentence && sentence.length > 20 && sentence.length < 120) {
        const clean = cleanMarkdown(sentence);
        if (!keyPoints.includes(clean)) {
          keyPoints.push(clean);
        }
      }
    }
  }

  // Fallback generic points if nothing found
  if (keyPoints.length === 0) {
    return [
      "Informations pratiques sur les indemnités kilométriques",
      "Conseils pour optimiser vos déclarations",
      "Outils et méthodes pour un suivi efficace"
    ];
  }

  return keyPoints.slice(0, 3);
}

// Clean markdown formatting from text
function cleanMarkdown(text: string): string {
  return text
    // Remove bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove links - keep only the text part
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function ArticleSummary({ content }: ArticleSummaryProps) {
  const keyPoints = extractKeyPoints(content);
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <div 
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl mb-8",
        "bg-gradient-to-br from-primary/[0.03] via-background to-primary/[0.06]",
        "border border-primary/10",
        "shadow-[0_4px_24px_-4px] shadow-primary/5",
        "dark:from-primary/[0.06] dark:via-slate-900/80 dark:to-primary/[0.08]",
        "dark:border-primary/15"
      )}
    >
      {/* Subtle gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="tracking-tight">Points clés de l'article</span>
        </div>

        {/* Key Points List - reduced spacing */}
        <ul className="space-y-1">
          {keyPoints.map((point, index) => (
            <li 
              key={index} 
              className={cn(
                "group flex items-start gap-2.5 py-1.5 px-2 -mx-2 rounded-lg",
                "transition-all duration-200 ease-out",
                "hover:bg-primary/5",
                // Staggered animation
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              )}
              style={{
                transitionDelay: isVisible ? `${index * 80 + 80}ms` : '0ms'
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                <ChevronRight className="h-3.5 w-3.5 text-primary/70 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5" />
              </div>
              <span className="text-sm text-muted-foreground leading-snug group-hover:text-foreground transition-colors duration-200">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
