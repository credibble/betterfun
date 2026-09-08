import { createFileRoute } from "@tanstack/react-router";
import FeaturedStreams from "@/components/discovery/FeaturedStreams";
import LiveStreamGrid from "@/components/discovery/LiveStreamGrid";
import OfflineTraders from "@/components/discovery/OfflineTraders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BetterFun — Live Trading Streams" },
      {
        name: "description",
        content:
          "Watch live traders, back their pots, and earn on DreamDEX prediction markets.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <FeaturedStreams />
        <div>
          <h2 className="text-lg font-semibold mb-3">Live Now</h2>
          <LiveStreamGrid />
        </div>
        <OfflineTraders />
      </div>
    </main>
  );
}
