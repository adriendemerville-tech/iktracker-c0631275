import { useRef, useState } from 'react';
import { Mic, MicOff, Sparkles, Loader2 } from 'lucide-react';
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
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
      toast.error("Micro inaccessible", { description: "Autorise le micro pour dicter ton trajet." });
    }
  };

  const stopRecording = async () => {
    const r = recRef.current;
    if (!r) return;
    setRecording(false);
    r.stream.getTracks().forEach((t) => t.stop());
    r.node.disconnect(); r.src.disconnect();
    const blob = encodeWav(r.chunks, r.ctx.sampleRate);
    await r.ctx.close();
    recRef.current = null;

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
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex : « Je pars du bureau, je passe chez Dupont à Cavaillon puis chez Martin à Noves et je rentre à la maison »"
          className="flex-1 min-h-[64px] max-h-32 text-sm resize-none"
          disabled={busy || recording || transcribing}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="icon"
            variant={recording ? "destructive" : "outline"}
            onClick={recording ? stopRecording : startRecording}
            disabled={busy || transcribing}
            title={recording ? "Arrêter" : "Dicter"}
          >
            {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={handleParse}
            disabled={!text.trim() || busy || recording || transcribing}
            title="Extraire le trajet"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Décris ton trajet en langage naturel — l'IA extrait les adresses et déduit l'ordre logique. Le domicile est utilisé par défaut si le départ ou l'arrivée n'est pas précisé.
      </p>
    </div>
  );
}
