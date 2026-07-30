import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Car, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

export interface ParsedTrip {
  departure: string | null;
  arrival: string | null;
  stops: string[];
  roundTrip: boolean;
  purpose: string | null;
}

interface Props {
  homeAddress?: string;
  onApply: (parsed: ParsedTrip) => Promise<void> | void;
  className?: string;
}

// Encode float32 PCM to a mono 16-bit WAV Blob
function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((s, c) => s + c.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) { merged.set(c, offset); offset += c.length; }

  // downsample to 16kHz
  const targetRate = 16000;
  const ratio = sampleRate / targetRate;
  const outLen = Math.floor(merged.length / ratio);
  const down = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) down[i] = merged[Math.floor(i * ratio)];

  const buffer = new ArrayBuffer(44 + down.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + down.length * 2, true);
  writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeStr(36, 'data'); view.setUint32(40, down.length * 2, true);
  let p = 44;
  for (let i = 0; i < down.length; i++) {
    const s = Math.max(-1, Math.min(1, down[i]));
    view.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    p += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export function TripPromptBar({ homeAddress, onApply, className }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recRef = useRef<{ stream: MediaStream; ctx: AudioContext; node: ScriptProcessorNode; src: MediaStreamAudioSourceNode; chunks: Float32Array[] } | null>(null);

  // Libère micro + AudioContext quoi qu'il arrive
  const teardownRecording = () => {
    const r = recRef.current;
    recRef.current = null;
    if (!r) return null;
    try { r.stream.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { r.node.disconnect(); } catch { /* noop */ }
    try { r.src.disconnect(); } catch { /* noop */ }
    r.node.onaudioprocess = null;
    return r;
  };

  useEffect(() => () => {
    const r = teardownRecording();
    if (r) void r.ctx.close().catch(() => {});
  }, []);

  const startRecording = async () => {
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      src.connect(node);
      node.connect(ctx.destination);
      recRef.current = { stream, ctx, node, src, chunks };
      setRecording(true);
    } catch (e) {
      console.error(e);
      stream?.getTracks().forEach((t) => t.stop());
      if (ctx) await ctx.close().catch(() => {});
      toast.error("Micro inaccessible", { description: "Autorise le micro pour dicter ton trajet." });
    }
  };

  const stopRecording = async () => {
    const r = recRef.current;
    if (!r) return;
    setRecording(false);
    teardownRecording();

    let blob: Blob;
    try {
      blob = encodeWav(r.chunks, r.ctx.sampleRate);
    } catch (e) {
      console.error(e);
      await r.ctx.close().catch(() => {});
      toast.error("Enregistrement illisible", { description: "Réessaie la dictée." });
      return;
    } finally {
      // l'AudioContext n'est plus nécessaire dès que le WAV est encodé
    }
    await r.ctx.close().catch(() => {});

    if (blob.size < 2048) {
      toast.error("Enregistrement vide", { description: "Réessaie en parlant plus près du micro." });
      return;
    }

    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'recording.wav');
      const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: fd });
      if (error || !data?.text) throw new Error(error?.message || 'Transcription vide');
      setText((prev) => (prev ? prev + ' ' : '') + data.text);
    } catch (e: any) {
      console.error(e);
      toast.error("Transcription impossible", { description: e.message });
    } finally {
      setTranscribing(false);
    }
  };


  const handleParse = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-trip-prompt', {
        body: { prompt: text.trim(), homeAddress: homeAddress || null },
      });
      if (error) throw error;
      await onApply(data as ParsedTrip);
      setText('');
    } catch (e: any) {
      console.error(e);
      toast.error("Extraction impossible", { description: e.message || 'Réessaie autrement.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("border-t bg-background/95 backdrop-blur px-3 sm:px-4 py-3 space-y-2", className)}>
      <div className="flex items-start gap-2">
        <div className="relative flex-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex : « Je pars du bureau, je passe chez Dupont à Cavaillon puis chez Martin à Noves et je rentre à la maison »"
            className="min-h-[64px] max-h-32 text-sm resize-none pr-12"
            disabled={busy || recording || transcribing}
          />
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={busy || transcribing}
            title={recording ? "Arrêter" : "Dicter"}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
              "bg-muted text-muted-foreground hover:bg-muted/70 disabled:opacity-50",
              recording && "bg-destructive/15 text-destructive",
            )}
          >
            {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
        <Button
          type="button"
          size="icon"
          onClick={handleParse}
          disabled={!text.trim() || busy || recording || transcribing}
          title="Extraire le trajet"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4 fill-transparent" strokeWidth={1.5} />}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Décris ton trajet en langage naturel — l'IA extrait les adresses et déduit l'ordre logique. Le domicile est utilisé par défaut si le départ ou l'arrivée n'est pas précisé.
      </p>
    </div>
  );
}
