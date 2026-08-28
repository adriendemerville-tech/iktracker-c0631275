import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀","😊","😉","😍","🤩","😎","🥳","😅","🙏","👍","👏","💪","🙌","🤝","👋",
  "✅","⭐","🔥","🚀","🎉","💡","📈","📊","💰","🧾","🚗","🛻","🔧","🏠","📅",
  "❤️","💬","📣","🎯","⏱️","🗺️","🧭","⚡","🌱","🎁","🆕","📌","🔔","✨","🇫🇷",
];

export function EmojiPickerButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insérer un emoji"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Smile className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="text-lg hover:bg-accent rounded p-0.5 leading-none"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  emoji: string,
  onChange: (v: string) => void
) {
  if (!el) {
    onChange(value + emoji);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + emoji + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + emoji.length;
    el.setSelectionRange(pos, pos);
  });
}

type InputProps = React.ComponentProps<typeof Input>;

export function EmojiInput({ value, onChange, ...props }: InputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const v = (value as string) ?? "";
  return (
    <div className="relative">
      <Input ref={ref} value={value} onChange={onChange} {...props} className={`pr-9 ${props.className ?? ""}`} />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <EmojiPickerButton
          onPick={(emoji) =>
            insertAtCursor(ref.current, v, emoji, (nv) => {
              onChange?.({ target: { value: nv } } as React.ChangeEvent<HTMLInputElement>);
            })
          }
        />
      </div>
    </div>
  );
}

type TextareaProps = React.ComponentProps<typeof Textarea>;

export function EmojiTextarea({ value, onChange, ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const v = (value as string) ?? "";
  return (
    <div className="relative">
      <Textarea ref={ref} value={value} onChange={onChange} {...props} className={`pr-9 ${props.className ?? ""}`} />
      <div className="absolute right-2 top-2">
        <EmojiPickerButton
          onPick={(emoji) =>
            insertAtCursor(ref.current, v, emoji, (nv) => {
              onChange?.({ target: { value: nv } } as React.ChangeEvent<HTMLTextAreaElement>);
            })
          }
        />
      </div>
    </div>
  );
}
