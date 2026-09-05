import { useMemo, useState, type ElementType } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { gifCategories, gifs, gifUrl, type GifItem } from "@/lib/market-comments-data";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (gif: GifItem) => void;
};

function GifPickerBody({
  query,
  setQuery,
  category,
  setCategory,
  onClose,
  onPick,
  Title,
}: {
  query: string;
  setQuery: (q: string) => void;
  category: string | null;
  setCategory: (c: string | null) => void;
  onClose: () => void;
  onPick: (gif: GifItem) => void;
  Title: ElementType<{ className?: string; children: React.ReactNode }>;
}) {
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = gifs;
    if (category) list = list.filter((g) => g.category === category);
    if (q) {
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.tags.some((t) => t.includes(q)) ||
          g.category.includes(q),
      );
    }
    return list;
  }, [query, category]);

  const showCategories = !category && !query.trim();

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {category && (
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Back to categories"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <Title className="text-base font-semibold">
            {category ? (gifCategories.find((c) => c.id === category)?.label ?? "GIFs") : "GIFs"}
          </Title>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setCategory(null);
            }}
            placeholder={category ? "Search in category" : "Search Giphy"}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <ScrollArea className="h-[calc(92dvh-9rem)] sm:h-[360px]">
        {showCategories ? (
          <div className="grid grid-cols-2 gap-2 p-3">
            {gifCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className="group relative aspect-4/3 overflow-hidden rounded-lg"
              >
                <img
                  src={gifUrl(cat.preview)}
                  alt=""
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/25" />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white drop-shadow">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No GIFs found</p>
        ) : (
          <div className="columns-2 gap-2 p-3">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onPick(gif)}
                className={cn(
                  "mb-2 w-full break-inside-avoid overflow-hidden rounded-lg border border-transparent",
                  "transition-colors hover:border-primary/40",
                )}
              >
                <img
                  src={gifUrl(gif.url)}
                  alt={gif.title}
                  className="w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );
}

export function GifPickerDialog({ open, onOpenChange, onSelect }: Props) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const close = () => {
    onOpenChange(false);
    setQuery("");
    setCategory(null);
  };

  const pick = (gif: GifItem) => {
    onSelect(gif);
    close();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) close();
    else onOpenChange(v);
  };

  const bodyProps = {
    query,
    setQuery,
    category,
    setCategory,
    onClose: close,
    onPick: pick,
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[92dvh] gap-0 overflow-hidden p-0 pb-[env(safe-area-inset-bottom)]">
          <GifPickerBody {...bodyProps} Title={DrawerTitle} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-xl [&>button:last-child]:hidden">
        <GifPickerBody {...bodyProps} Title={DialogTitle} />
      </DialogContent>
    </Dialog>
  );
}
