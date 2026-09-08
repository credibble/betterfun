import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image } from "lucide-react";
import { GifPickerDialog } from "@/components/market/GifPickerDialog";
import { gifUrl, type GifItem } from "@/lib/market-comments-data";

type ChatInputProps = {
  onSend: (text: string, gifUrl?: string) => void;
  disabled?: boolean;
  className?: string;
};

export default function ChatInput({ onSend, disabled, className }: ChatInputProps) {
  const [text, setText] = useState("");
  const [gifOpen, setGifOpen] = useState(false);
  const [pendingGif, setPendingGif] = useState<GifItem | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed && !pendingGif) return;
      if (pendingGif) {
        onSend(trimmed || pendingGif.title, gifUrl(pendingGif.url));
        setPendingGif(null);
      } else {
        onSend(trimmed);
      }
      setText("");
    },
    [text, pendingGif, onSend]
  );

  return (
    <>
      <form onSubmit={handleSubmit} className={cn("flex items-center gap-2 p-3 border-t", className)}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          disabled={disabled}
          onClick={() => setGifOpen(true)}
        >
          <Image className="h-4 w-4" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={pendingGif ? `Send with ${pendingGif.title}...` : "Send a message..."}
          disabled={disabled}
          className="flex-1"
          maxLength={500}
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          disabled={disabled || (!text.trim() && !pendingGif)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {pendingGif && (
        <div className="px-3 pb-2">
          <div className="relative inline-block">
            <img
              src={gifUrl(pendingGif.url)}
              alt={pendingGif.title}
              className="h-16 rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={() => setPendingGif(null)}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <GifPickerDialog
        open={gifOpen}
        onOpenChange={setGifOpen}
        onSelect={(gif) => {
          setPendingGif(gif);
          setGifOpen(false);
        }}
      />
    </>
  );
}
