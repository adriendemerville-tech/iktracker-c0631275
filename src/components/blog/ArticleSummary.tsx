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
      className="bg-card/50 dark:bg-slate-900/50 border border-border/50 rounded-xl p-6 mb-8 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <ListChecks className="h-4 w-4 text-primary" />
        </div>
        <span>Points clés de l'article</span>
      </div>

      {/* Key Points List */}
      <ul className="space-y-3">
        {keyPoints.map((point, index) => (
          <li 
            key={index} 
            className={cn(
              "group flex items-start gap-3 p-3 -mx-3 rounded-lg",
              "transition-all duration-200 ease-out",
              "hover:bg-muted/50 hover:translate-x-1",
              // Staggered animation
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            )}
            style={{
              transitionDelay: isVisible ? `${index * 100 + 100}ms` : '0ms'
            }}
          >
            <div className="flex-shrink-0 mt-0.5">
              <ChevronRight className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-0.5" />
            </div>
            <span className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-200">
              {point}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
