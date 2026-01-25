import { useState, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { convertToWebP } from '@/lib/image-utils';
import { Image as ImageIcon, Link as LinkIcon, Loader2, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

interface DetectedLink {
  fullMatch: string;
  text: string;
  url: string;
  startIndex: number;
  endIndex: number;
}

// Regex to match Markdown links: [text](url)
const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;

function detectLinkAtPosition(content: string, cursorPos: number): DetectedLink | null {
  let match;
  MARKDOWN_LINK_REGEX.lastIndex = 0;
  
  while ((match = MARKDOWN_LINK_REGEX.exec(content)) !== null) {
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;
    
    if (cursorPos >= startIndex && cursorPos <= endIndex) {
      return {
        fullMatch: match[0],
        text: match[1],
        url: match[2],
        startIndex,
        endIndex,
      };
    }
  }
  
  return null;
}

export function ContentEditor({ value, onChange, placeholder, rows = 16 }: ContentEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [cursorPosition, setCursorPosition] = useState<{ start: number; end: number } | null>(null);
  const [editingLink, setEditingLink] = useState<DetectedLink | null>(null);
  const [hoveredLink, setHoveredLink] = useState<DetectedLink | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const insertImageAtCursor = (url: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const markdownImage = `\n![Image](${url})\n`;
      onChange(value + markdownImage);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const markdownImage = `![Image](${url})`;
    
    const newValue = value.substring(0, start) + markdownImage + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + markdownImage.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const openLinkDialog = (existingLink?: DetectedLink) => {
    const textarea = textareaRef.current;
    
    if (existingLink) {
      // Editing an existing link
      setEditingLink(existingLink);
      setLinkText(existingLink.text);
      setLinkUrl(existingLink.url);
      setCursorPosition({ start: existingLink.startIndex, end: existingLink.endIndex });
    } else if (textarea) {
      // Creating a new link
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      setCursorPosition({ start, end });
      setLinkText(selectedText);
      setLinkUrl('');
      setEditingLink(null);
    } else {
      setCursorPosition(null);
      setLinkText('');
      setLinkUrl('');
      setEditingLink(null);
    }
    setLinkDialogOpen(true);
    setHoveredLink(null);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) {
      toast.error("L'URL est requise");
      return;
    }

    const displayText = linkText.trim() || linkUrl;
    // Use the URL as-is without any modification
    const finalUrl = linkUrl.trim();
    const markdownLink = `[${displayText}](${finalUrl})`;

    if (cursorPosition) {
      const newValue = value.substring(0, cursorPosition.start) + markdownLink + value.substring(cursorPosition.end);
      onChange(newValue);

      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          const newCursorPos = cursorPosition.start + markdownLink.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      onChange(value + markdownLink);
    }

    setLinkDialogOpen(false);
    setLinkText('');
    setLinkUrl('');
    setCursorPosition(null);
    setEditingLink(null);
    toast.success(editingLink ? 'Lien modifié' : 'Lien inséré');
  };

  const deleteLink = () => {
    if (!editingLink || !cursorPosition) return;
    
    // Replace the link with just the text
    const newValue = value.substring(0, cursorPosition.start) + editingLink.text + value.substring(cursorPosition.end);
    onChange(newValue);
    
    setLinkDialogOpen(false);
    setLinkText('');
    setLinkUrl('');
    setCursorPosition(null);
    setEditingLink(null);
    toast.success('Lien supprimé');
  };

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const detectedLink = detectLinkAtPosition(value, cursorPos);
    
    if (detectedLink) {
      // Calculate approximate position for the popover
      const textBeforeCursor = value.substring(0, detectedLink.startIndex);
      const lines = textBeforeCursor.split('\n');
      const lineNumber = lines.length;
      const charInLine = lines[lines.length - 1].length;
      
      // Get textarea position
      const rect = textarea.getBoundingClientRect();
      const lineHeight = 20; // approximate line height
      const charWidth = 8; // approximate character width for monospace
      
      setPopoverPosition({
        x: Math.min(rect.left + charInLine * charWidth, rect.right - 200),
        y: rect.top + lineNumber * lineHeight + 30,
      });
      setHoveredLink(detectedLink);
    } else {
      setHoveredLink(null);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} n'est pas une image`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 5MB`);
        continue;
      }

      const url = await uploadImageToStorage(file);
      if (url) {
        insertImageAtCursor(url);
        successCount++;
      } else {
        toast.error(`Échec de l'upload de ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} image(s) convertie(s) en WebP et insérée(s)`);
    }
    
    setUploading(false);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
    e.target.value = '';
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) return;

    e.preventDefault();
    setUploading(true);

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;

      const url = await uploadImageToStorage(file);
      if (url) {
        insertImageAtCursor(url);
        toast.success('Image collée convertie en WebP');
      } else {
        toast.error('Échec de l\'upload de l\'image collée');
      }
    }

    setUploading(false);
  }, [value, onChange]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of imageFiles) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 5MB`);
        continue;
      }

      const url = await uploadImageToStorage(file);
      if (url) {
        insertImageAtCursor(url);
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} image(s) glissée(s) convertie(s) en WebP`);
    }

    setUploading(false);
  }, [value, onChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Modifier le lien' : 'Insérer un lien'}</DialogTitle>
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
                placeholder="https://exemple.com ou /page-interne"
              />
              <p className="text-xs text-muted-foreground">
                L'URL sera utilisée telle quelle, sans modification.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingLink && (
              <Button variant="destructive" onClick={deleteLink} className="sm:mr-auto">
                Supprimer le lien
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={insertLink}>
              {editingLink ? 'Modifier' : 'Insérer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Edit Popover */}
      {hoveredLink && popoverPosition && (
        <div 
          className="fixed z-50 bg-popover border rounded-md shadow-md p-2 flex items-center gap-2"
          style={{ 
            left: popoverPosition.x, 
            top: popoverPosition.y,
          }}
        >
          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
            {hoveredLink.url}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openLinkDialog(hoveredLink)}
            className="h-7 px-2"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Modifier
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setHoveredLink(null)}
            className="h-7 px-2"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border rounded-t-md bg-muted/50 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleButtonClick}
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
          onClick={() => openLinkDialog()}
          disabled={uploading}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Insérer lien
        </Button>
        <span className="text-xs text-muted-foreground">
          Glissez-déposez ou collez des images • Cliquez sur un lien pour le modifier
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Editor */}
      <div 
        className="relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onClick={handleTextareaClick}
          onBlur={() => setTimeout(() => setHoveredLink(null), 200)}
          placeholder={placeholder}
          rows={rows}
          className="font-mono text-sm rounded-t-none border-t-0"
        />
        
        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Conversion et upload en cours...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}