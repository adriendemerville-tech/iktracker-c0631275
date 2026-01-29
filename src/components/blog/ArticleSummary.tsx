import { ListChecks } from 'lucide-react';

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
      .map(line => line.replace(/^[-•*]\s+/, '').trim());
  }

  // Otherwise extract from headings or first sentences
  const lines = content.split('\n').filter(line => line.trim());
  const keyPoints: string[] = [];

  // Look for H2 headings first
  for (const line of lines) {
    if (line.startsWith('## ') && keyPoints.length < 3) {
      const heading = line.replace(/^##\s+/, '').trim();
      if (heading.length > 10 && heading.length < 100) {
        keyPoints.push(heading);
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
        // Remove markdown formatting
        const clean = sentence
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
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

export function ArticleSummary({ content }: ArticleSummaryProps) {
  const keyPoints = extractKeyPoints(content);

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4 mb-8">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
        <ListChecks className="h-4 w-4 text-primary" />
        <span>Points clés de l'article</span>
      </div>
      <ul className="space-y-2">
        {keyPoints.map((point, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-primary font-bold mt-0.5">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
