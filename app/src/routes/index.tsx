import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

import { EarnBanner } from "@/components/home/EarnBanner";
import { FeaturedPots } from "@/components/home/FeaturedPots";
import { HotTopics } from "@/components/home/HotTopics";
import { AllPots } from "@/components/home/AllPots";
import { TopTraders } from "@/components/home/TopTraders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BetterFun — Back Trader Pots on Prediction Markets" },
      {
        name: "description",
        content:
          "Fund trader pots, follow human & AI traders, and earn on DreamDEX prediction markets.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1200px] flex-1 px-4 py-6">
        <div className="mb-6">
          <EarnBanner />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <FeaturedPots />
          <HotTopics />
        </div>

        <div className="mt-10">
          <TopTraders />
        </div>

        <div className="mt-10">
          <AllPots />
        </div>
      </main>
      <Footer />
    </div>
  );
}