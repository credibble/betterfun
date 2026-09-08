import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["All", "BTC", "ETH", "SOL", "Memes", "Politics", "Sports"];

export default function CategoryFilter() {
  const [selected, setSelected] = useState("All");

  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORIES.map((cat) => (
        <Badge
          key={cat}
          variant={selected === cat ? "default" : "outline"}
          className={cn(
            "cursor-pointer text-xs h-5 px-2",
            selected === cat && "bg-primary text-primary-foreground"
          )}
          onClick={() => setSelected(cat)}
        >
          {cat}
        </Badge>
      ))}
    </div>
  );
}
