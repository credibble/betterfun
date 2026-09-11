import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Keyboard, RotateCcw } from "lucide-react";
import { DEMO_SLIDES } from "@/components/demo/slides";
import { cn } from "@/lib/utils";

export default function DemoDeck() {
  const total = DEMO_SLIDES.length;
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const frameRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      setDir(clamped >= index ? 1 : -1);
      setIndex(clamped);
      frameRef.current?.scrollTo({ top: 0 });
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Project demo · Somnia × DreamDEX
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            BetterFun — 12-slide tour
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            How creator-economy prediction pots work on DreamDEX Event Contracts — from funding to payout.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 sm:inline-flex">
            <Keyboard className="h-3.5 w-3.5" /> ← → keys
          </span>
          <Link
            to="/"
            className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 font-semibold hover:bg-secondary/60"
          >
            Back to app
          </Link>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="num font-semibold">
          {String(index + 1).padStart(2, "0")} / {total}
        </span>
        <span className="font-semibold">{slide.label}</span>
      </div>

      {/* Slide frame */}
      <div
        ref={frameRef}
        className="mt-4 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-elevated sm:p-7"
        style={{ maxHeight: "min(68vh, 760px)" }}
      >
        <div
          key={index}
          className={cn(
            "min-h-[420px]",
            dir === 1
              ? "animate-in fade-in slide-in-from-right-6 duration-300"
              : "animate-in fade-in slide-in-from-left-6 duration-300",
          )}
        >
          <Current />
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          onClick={() => goTo(index - 1)}
          disabled={isFirst}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition-all duration-150 hover:bg-secondary/60 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>

        <span className="hidden text-xs text-muted-foreground md:block">
          Slide {index + 1} of {total} — {slide.label}
        </span>

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
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Jump to a slide
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 scroll-thin">
          {DEMO_SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                i === index
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary/60",
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
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}