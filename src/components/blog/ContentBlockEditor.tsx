import { useState, useMemo, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { convertToWebP } from '@/lib/image-utils';
import { Image as ImageIcon, Link as LinkIcon, Loader2, GripVertical } from 'lucide-react';
import { RelatedArticleMarker } from './RelatedArticleMarker';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface ContentBlockEditorProps {
  value: string;
  onChange: (value: string) => void;
  relatedArticlePosition: number;
  onRelatedArticlePositionChange: (position: number) => void;
  placeholder?: string;
}

interface ContentBlock {
  id: string;
  type: 'content' | 'related-article';
  content?: string;
}

// Marker to insert in content to track position
const RELATED_ARTICLE_MARKER = '<!-- RELATED_ARTICLE_POSITION -->';

function SortableContentBlock({ 
  block, 
  onChange,
  onPaste,
  onDrop,
  uploading,
  onInsertImage,
  onInsertLink,
}: { 
  block: ContentBlock;
  onChange?: (content: string) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  uploading?: boolean;
  onInsertImage?: () => void;
  onInsertLink?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  if (block.type === 'related-article') {
    return (
      <div ref={setNodeRef} style={style}>
        <RelatedArticleMarker id={block.id} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "shadow-lg ring-2 ring-primary"
      )}
    >
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div 
        className="relative"
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <Textarea
          value={block.content || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onPaste={onPaste}
          placeholder="Contenu de cette section..."
          rows={8}
          className="font-mono text-sm"
        />
        
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Upload en cours...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ContentBlockEditor({ 
  value, 
  onChange, 
  relatedArticlePosition,
  onRelatedArticlePositionChange,
  placeholder 
}: ContentBlockEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Split content into paragraphs and create blocks
  const blocks = useMemo((): ContentBlock[] => {
    const paragraphs = value.split(/\n\n+/);
    const result: ContentBlock[] = [];
    
    // Determine where to insert the related article marker
    const insertPosition = Math.min(relatedArticlePosition, paragraphs.length);
    
    paragraphs.forEach((content, index) => {
      if (index === insertPosition) {
        result.push({ id: 'related-article', type: 'related-article' });
      }
      if (content.trim()) {
        result.push({ id: `content-${index}`, type: 'content', content });
      }
    });
    
    // If position is at the end
    if (insertPosition >= paragraphs.length) {
      result.push({ id: 'related-article', type: 'related-article' });
    }
    
    return result;
  }, [value, relatedArticlePosition]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // If we're moving the related article marker
    if (active.id === 'related-article') {
      // Count content blocks before the new position
      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      let contentBlocksBefore = 0;
      for (const block of newBlocks) {
        if (block.id === 'related-article') break;
        if (block.type === 'content') contentBlocksBefore++;
      }
      onRelatedArticlePositionChange(contentBlocksBefore);
      return;
    }

    // Moving content blocks
    const newBlocks = arrayMove(blocks, oldIndex, newIndex);
    const contentBlocks = newBlocks.filter(b => b.type === 'content');
    const newContent = contentBlocks.map(b => b.content).join('\n\n');
    onChange(newContent);

    // Update related article position
    let relatedPos = 0;
    for (const block of newBlocks) {
      if (block.id === 'related-article') break;
      if (block.type === 'content') relatedPos++;
    }
    onRelatedArticlePositionChange(relatedPos);
  }, [blocks, onChange, onRelatedArticlePositionChange]);

  const updateBlockContent = useCallback((blockId: string, newContent: string) => {
    const contentBlocks = blocks.filter(b => b.type === 'content');
    const blockIndex = contentBlocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;
    
    const updatedContents = contentBlocks.map((b, i) => 
      i === blockIndex ? newContent : b.content
    );
    onChange(updatedContents.join('\n\n'));
  }, [blocks, onChange]);

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const webpFile = await convertToWebP(file, 0.8);
      const filename = `content-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(filename, webpFile, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/webp',
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent, blockId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    e.preventDefault();
    setUploading(true);
    setActiveBlockId(blockId);

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;

      const url = await uploadImageToStorage(file);
      if (url) {
        const block = blocks.find(b => b.id === blockId);
        if (block && block.type === 'content') {
          updateBlockContent(blockId, (block.content || '') + `\n\n![Image](${url})`);
        }
        toast.success('Image collée convertie en WebP');
      }
    }

    setUploading(false);
    setActiveBlockId(null);
  }, [blocks, updateBlockContent]);

  const handleDrop = useCallback(async (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploading(true);
    setActiveBlockId(blockId);

    for (const file of imageFiles) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 5MB`);
        continue;
      }

      const url = await uploadImageToStorage(file);
      if (url) {
        const block = blocks.find(b => b.id === blockId);
        if (block && block.type === 'content') {
          updateBlockContent(blockId, (block.content || '') + `\n\n![Image](${url})`);
        }
      }
    }

    toast.success('Image(s) uploadée(s)');
    setUploading(false);
    setActiveBlockId(null);
  }, [blocks, updateBlockContent]);

  const insertLink = () => {
    if (!linkUrl.trim()) {
      toast.error("L'URL est requise");
      return;
    }

    const displayText = linkText.trim() || linkUrl;
    const markdownLink = `[${displayText}](${linkUrl.trim()})`;

    // Insert at end of first content block
    const firstContentBlock = blocks.find(b => b.type === 'content');
    if (firstContentBlock) {
      updateBlockContent(firstContentBlock.id, (firstContentBlock.content || '') + ' ' + markdownLink);
    }

    setLinkDialogOpen(false);
    setLinkText('');
    setLinkUrl('');
    toast.success('Lien inséré');
  };

  return (
    <div className="space-y-2">
      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insérer un lien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-text">Texte du lien</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Texte affiché (optionnel)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL *</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://exemple.com"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={insertLink}>Insérer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border rounded-t-md bg-muted/50 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4 mr-2" />
          )}
          Insérer image
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLinkDialogOpen(true)}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Insérer lien
        </Button>
        <span className="text-xs text-muted-foreground">
          Glissez la carte "À lire également" pour la positionner
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={async (e) => {
            const files = e.target.files;
            if (!files) return;
            
            setUploading(true);
            for (const file of Array.from(files)) {
              const url = await uploadImageToStorage(file);
              if (url) {
                const firstContentBlock = blocks.find(b => b.type === 'content');
                if (firstContentBlock) {
                  updateBlockContent(firstContentBlock.id, (firstContentBlock.content || '') + `\n\n![Image](${url})`);
                }
              }
            }
            toast.success('Image(s) insérée(s)');
            setUploading(false);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Sortable Content Blocks */}
      <div className="border rounded-b-md border-t-0 p-4 pl-10 space-y-4 bg-background min-h-[400px]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block) => (
              <SortableContentBlock
                key={block.id}
                block={block}
                onChange={(content) => updateBlockContent(block.id, content)}
                onPaste={(e) => handlePaste(e, block.id)}
                onDrop={(e) => handleDrop(e, block.id)}
                uploading={uploading && activeBlockId === block.id}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
