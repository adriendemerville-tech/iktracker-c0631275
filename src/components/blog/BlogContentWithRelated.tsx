import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { RelatedArticle } from './RelatedArticle';

interface BlogContentWithRelatedProps {
  content: string;
  postId: string;
}

export function BlogContentWithRelated({ content, postId }: BlogContentWithRelatedProps) {
  // Split content into paragraphs to insert RelatedArticle after the 2nd paragraph
  const { beforeParagraphs, afterParagraphs } = useMemo(() => {
    const lines = content.split('\n');
    let paragraphCount = 0;
    let splitIndex = -1;
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track code blocks
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      if (inCodeBlock) continue;
      
      // Count actual paragraph breaks (empty line after content)
      const isEmptyLine = line.trim() === '';
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      
      // A paragraph ends when we hit an empty line after non-empty content
      // that isn't a heading or list item
      if (isEmptyLine && prevLine && !prevLine.startsWith('#') && !prevLine.startsWith('-') && !prevLine.startsWith('*') && !prevLine.startsWith('>')) {
        paragraphCount++;
        
        if (paragraphCount === 2) {
          splitIndex = i;
          break;
        }
      }
    }
    
    if (splitIndex === -1) {
      // If we can't find 2 paragraphs, put the card at the end of first third
      const thirdIndex = Math.floor(lines.length / 3);
      return {
        beforeParagraphs: lines.slice(0, thirdIndex).join('\n'),
        afterParagraphs: lines.slice(thirdIndex).join('\n')
      };
    }
    
    return {
      beforeParagraphs: lines.slice(0, splitIndex).join('\n'),
      afterParagraphs: lines.slice(splitIndex).join('\n')
    };
  }, [content]);

  const proseClasses = `prose prose-lg max-w-none dark:prose-invert
    prose-headings:text-foreground prose-headings:font-display
    prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
    prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3
    prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2
    prose-p:text-foreground/90 prose-p:leading-relaxed
    prose-a:text-primary hover:prose-a:underline prose-a:font-medium
    prose-strong:text-foreground prose-strong:font-semibold
    prose-ul:text-foreground/90 prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
    prose-ol:text-foreground/90 prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
    prose-li:my-1
    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
    prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
    prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
    prose-img:rounded-lg prose-img:my-6
    prose-table:border-collapse prose-table:w-full
    prose-th:bg-muted prose-th:p-3 prose-th:text-left prose-th:font-semibold
    prose-td:border prose-td:border-border prose-td:p-3`;

  const markdownComponents = {
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <OptimizedImage
        src={src || ''}
        alt={alt || ''}
        className="rounded-lg my-6"
        aspectRatio="16/9"
      />
    )
  };

  return (
    <>
      {/* First part of content (before 2nd paragraph) */}
      <div className={proseClasses}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {beforeParagraphs}
        </ReactMarkdown>
      </div>

      {/* Related Article Card - after 2nd paragraph */}
      <RelatedArticle currentPostId={postId} />

      {/* Rest of content */}
      <div className={proseClasses}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {afterParagraphs}
        </ReactMarkdown>
      </div>
    </>
  );
}
