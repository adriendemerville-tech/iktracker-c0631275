import { useState, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { convertToWebP } from '@/lib/image-utils';
import { Image as ImageIcon, Link as LinkIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function ContentEditor({ value, onChange, placeholder, rows = 16 }: ContentEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [cursorPosition, setCursorPosition] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      // Convert to WebP with 80% quality
      const webpFile = await convertToWebP(file, 0.8);
      
      // Generate unique filename
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
      // Fallback: append at end
      const markdownImage = `\n![Image](${url})\n`;
      onChange(value + markdownImage);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const markdownImage = `![Image](${url})`;
    
    const newValue = value.substring(0, start) + markdownImage + value.substring(end);
    onChange(newValue);

    // Set cursor after inserted image
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + markdownImage.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const openLinkDialog = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      setCursorPosition({ start, end });
      setLinkText(selectedText);
      setLinkUrl('');
    } else {
      setCursorPosition(null);
      setLinkText('');
      setLinkUrl('');
    }
    setLinkDialogOpen(true);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) {
      toast.error("L'URL est requise");
      return;
    }

    const displayText = linkText.trim() || linkUrl;
    const markdownLink = `[${displayText}](${linkUrl})`;

    if (cursorPosition) {
      const newValue = value.substring(0, cursorPosition.start) + markdownLink + value.substring(cursorPosition.end);
      onChange(newValue);

      // Set cursor after inserted link
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
    toast.success('Lien inséré');
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
    // Reset input to allow uploading same file again
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
                type="url"
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
          onClick={openLinkDialog}
          disabled={uploading}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Insérer lien
        </Button>
        <span className="text-xs text-muted-foreground">
          Glissez-déposez ou collez des images (conversion WebP auto)
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
