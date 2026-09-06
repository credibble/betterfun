import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Users, Heart, Radio } from "lucide-react";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { ReputationBadge } from "@/components/traders/ReputationBadge";
import { LiveChat } from "@/components/traders/LiveChat";
import { LiveVideoPlayer } from "@/components/traders/LiveVideoPlayer";
import { StakePanel } from "@/components/traders/StakePanel";
import { Bell, BellOff } from "lucide-react";
import { useTrader } from "@/lib/queries";

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const Route = createFileRoute("/live/$id")({
  head: () => ({
    meta: [
      { title: "Live | BetterFun" },
      { name: "description", content: "Live trading stream on BetterFun." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { id } = Route.useParams();
  const { data: t, isLoading, error } = useTrader(id);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [notify, setNotify] = useState(false);
  const room = t?.handle ? `stream-${t.handle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}` : "";

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="mx-auto flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading stream...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !t) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="mx-auto flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-xl font-semibold">Stream not found</h1>
          <Link to="/traders" className="text-link hover:underline">
            Back to traders
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1200px] flex-1 px-4 py-6">
        <Link
          to="/traders/$id"
          params={{ id: t.id }}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t.name}'s profile
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            {/* Stream stage — real RTMP ingress video */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <LiveVideoPlayer room={room} className="h-[360px]" />
              <div className="flex flex-wrap items-center gap-3 p-4">
                <TraderAvatar name={t.name} avatarUrl={t.avatarUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold">{t.name}</span>
                    <ReputationBadge score={t.reputation ?? 0} showScore={false} />
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    Live trading stream · {t.followers} followers
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="num">{fmtFollowers(t.followers)}</span>
                </span>
                <button
                  onClick={() => {
                    setLiked((v) => !v);
                    setLikes((n) => n + (liked ? -1 : 1));
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    liked
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
                  <span className="num">{likes.toLocaleString()}</span>
                </button>
              </div>
            </div>

            {/* About the stream */}
            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Radio className="h-4 w-4 text-down" />
                <h2 className="text-sm font-semibold">About this stream</h2>
              </div>
              <p className="text-sm text-foreground/90">{t.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(t.tags ?? []).map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary/70 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setNotify((v) => !v)}
                className={`mt-4 flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold shadow-block-outline transition-all duration-150 hover:bg-secondary/60 active:translate-y-[3px] active:shadow-none ${
                  notify ? "bg-primary/10 text-primary" : "text-foreground"
                }`}
              >
                {notify ? (
                  <>
                    <BellOff className="h-4 w-4" /> Notifications on
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" /> Notify me when live
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right rail: chat + stake */}
          <div className="flex flex-col gap-4">
            <LiveChat className="h-[440px]" />
            <StakePanel trader={t} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
