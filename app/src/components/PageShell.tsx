import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";

/**
 * Shared page chrome: navbar + main (min 80vh) + footer.
 * Keeps short pages from looking stubby without per-route hacks.
 */
export function PageShell({
  children,
  mainClassName,
  maxWidth = "max-w-[1200px]",
  showFooter = true,
}: {
  children: ReactNode;
  mainClassName?: string;
  /** Tailwind max-width class for the main content column. */
  maxWidth?: string;
  showFooter?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 py-6",
          "min-h-[80vh]",
          maxWidth,
          mainClassName,
        )}
      >
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
