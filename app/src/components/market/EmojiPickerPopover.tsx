import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { emojiCategories } from "@/lib/market-comments-data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
  children: React.ReactNode;
};

export function EmojiPickerPopover({ open, onOpenChange, onSelect, children }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return emojiCategories;
    return emojiCategories
      .map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter((e) => e.includes(q) || cat.label.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.emojis.length > 0);
  }, [query]);

  const pick = (emoji: string) => {
    onSelect(emoji);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[min(320px,calc(100vw-2rem))] rounded-xl border-border bg-card p-0 shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ScrollArea className="h-[280px]">
          <div className="p-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No emojis found</p>
            ) : (
              filtered.map((cat) => (
                <div key={cat.id} className="mb-3">
                  <p className="mb-1.5 px-1 text-xs font-semibold text-muted-foreground">
                    {cat.label}
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {cat.emojis.map((emoji) => (
                      <button
                        key={`${cat.id}-${emoji}`}
                        type="button"
                        onClick={() => pick(emoji)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-secondary"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
