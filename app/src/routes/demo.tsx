import { createFileRoute } from "@tanstack/react-router";
import DemoDeck from "@/components/demo/DemoDeck";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo — BetterFun" },
      {
        name: "description",
        content:
          "A 12-slide tour of BetterFun — creator-economy prediction pots on DreamDEX Event Contracts. Fund, trade, settle, claim.",
      },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return <DemoDeck />;
}