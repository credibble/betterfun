import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Small "i" button that opens a popover explaining a term. */
export function InfoPopover({
  title,
  children,
  className,
  size = 14,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: number;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={title ?? "More info"}
          className={cn(
            "inline-flex text-muted-foreground/70 transition-colors hover:text-foreground",
            className,
          )}
        >
          <Info style={{ width: size, height: size }} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-64">
        {title && <div className="mb-1 text-sm font-semibold text-foreground">{title}</div>}
        <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
      </PopoverContent>
    </Popover>
  );
}
