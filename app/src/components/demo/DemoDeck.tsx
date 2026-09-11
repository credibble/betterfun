import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Keyboard, RotateCcw, X, Zap } from "lucide-react";
import { DEMO_SLIDES } from "@/components/demo/slides";
import { cn } from "@/lib/utils";

export default function DemoDeck() {
  const total = DEMO_SLIDES.length;
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const mainRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      setDir(clamped >= index ? 1 : -1);
      setIndex(clamped);
      mainRef.current?.scrollTo({ top: 0 });
    },
    [index, total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(total - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index, total]);

  const Current = DEMO_SLIDES[index].Component;
  const slide = DEMO_SLIDES[index];
  const progress = ((index + 1) / total) * 100;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Slim in-deck header */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Zap className="h-4 w-4 shrink-0 fill-primary text-primary" />
          <span className="truncate text-sm font-bold">
            BetterFun <span className="hidden text-muted-foreground sm:inline">· demo</span>
          </span>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <span className="num hidden text-[11px] font-semibold text-muted-foreground sm:inline">
            {String(index + 1).padStart(2, "0")} / {total}
          </span>
          <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="hidden text-[11px] font-semibold text-muted-foreground sm:inline">
            {slide.label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground md:inline-flex">
            <Keyboard className="h-3 w-3" /> ← →
          </span>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary/60"
            title="Exit the demo"
          >
            <X className="h-3.5 w-3.5" /> Exit
          </Link>
        </div>
      </header>

      {/* Slide area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto flex min-h-full w-full max-w-6xl items-stretch px-4 py-6 sm:px-6">
          <div
            key={index}
            className={cn(
              "flex w-full items-center",
              dir === 1
                ? "animate-in fade-in slide-in-from-right-6 duration-300"
                : "animate-in fade-in slide-in-from-left-6 duration-300",
            )}
          >
            <Current />
          </div>
        </div>
      </main>

      {/* Bottom controls */}
      <footer className="shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => goTo(index - 1)}
              disabled={isFirst}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-all duration-150 hover:bg-secondary/60 disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>

            {isLast ? (
              <button
                onClick={() => goTo(0)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
              >
                <RotateCcw className="h-4 w-4" /> Restart tour
              </button>
            ) : (
              <button
                onClick={() => goTo(index + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Slide picker */}
          <div className="flex gap-2 overflow-x-auto pb-1 scroll-thin">
            {DEMO_SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                  i === index
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary/60",
                )}
              >
                <span
                  className={cn(
                    "num grid h-5 w-5 place-items-center rounded-md text-[10px] font-bold",
                    i === index ? "bg-primary text-primary-foreground" : "bg-secondary",
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn(i === index ? "inline" : "hidden sm:inline")}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
