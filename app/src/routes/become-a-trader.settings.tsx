import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ArrowLeft, Bot, Save, UserCircle2, Camera, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateTrader, useUpdateTrader, useMyTrader, useUploadImage } from "@/lib/queries";

const COUNTRIES = [
  "Argentina",
  "Hong Kong",
  "Portugal",
  "Singapore",
  "South Korea",
  "Switzerland",
  "United Kingdom",
  "United States",
  "Global",
];

const AI_MODELS = [
  "GPT-4 Turbo",
  "GPT-4o",
  "Claude 3.5 Sonnet",
  "Claude 3 Opus",
  "Gemini Pro",
  "Custom / Fine-tuned",
];

const AI_SKILLS = [
  "Technical Analysis",
  "Sentiment Analysis",
  "On-chain Data",
  "Pattern Recognition",
  "Macro Analysis",
  "Volatility Forecasting",
  "Event Detection",
  "Risk Management",
  "News Analysis",
  "Social Media Analysis",
];

function traderProfileHue(handle: string): number {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h + handle.charCodeAt(i) * 17) % 360;
  return h;
}

export const Route = createFileRoute("/become-a-trader/settings")({
  head: () => ({
    meta: [
      { title: "Trader Profile Settings | BetterFun" },
      {
        name: "description",
        content:
          "Create or update your trader display name, handle, bio, and strategy tags on BetterFun.",
      },
    ],
  }),
  component: TraderSettingsPage,
});

function TraderSettingsPage() {
  const navigate = useNavigate();
  const { data: myTrader, isLoading: meLoading } = useMyTrader();
  const createTrader = useCreateTrader();
  const updateTrader = useUpdateTrader();
  const uploadImage = useUploadImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [traderType, setTraderType] = useState<"human" | "ai">("human");
  const [aiModel, setAiModel] = useState("");
  const [aiSkillsText, setAiSkillsText] = useState("");
  const [aiDescription, setAiDescription] = useState("");

  const editing = !!myTrader;

  // Prefill from an existing profile (edit mode)
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && myTrader) {
    setName(myTrader.name);
    setHandle(myTrader.handle);
    setAvatarUrl(myTrader.avatarUrl ?? "");
    setBio(myTrader.bio ?? "");
    setCountry(myTrader.country ?? "");
    setTagsText((myTrader.tags ?? []).join(", "));
    setTraderType(myTrader.traderType);
    setAiModel(myTrader.aiConfig?.model ?? "");
    setAiSkillsText((myTrader.aiConfig?.skills ?? []).join(", "));
    setAiDescription(myTrader.aiConfig?.description ?? "");
    setPrefilled(true);
  }

  const cleanHandle = handle.trim().replace(/^@/, "").toLowerCase();
  const previewHue = traderProfileHue(cleanHandle || "trader");
  const previewTags = tagsText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const previewAiSkills = aiSkillsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    uploadImage.mutate(file, {
      onSuccess: (data) => {
        setAvatarUrl(data.url);
        toast.success("Image uploaded");
      },
      onError: (err: any) => toast.error(err?.message ?? "Upload failed"),
    });
  };

  const save = () => {
    if (!name.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (!cleanHandle) {
      toast.error("Handle is required");
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(cleanHandle)) {
      toast.error("Handle can only contain lowercase letters, numbers, dashes, and underscores");
      return;
    }
    if (!bio.trim()) {
      toast.error("Bio is required");
      return;
    }

    const base = {
      name: name.trim(),
      avatarUrl: avatarUrl || undefined,
      bio: bio.trim(),
      country,
      tags: previewTags.slice(0, 5),
    };

    const finish = (message: string) => {
      toast.success(message, {
        description: editing ? "Your trader profile was updated." : "Welcome to the trader program.",
      });
      navigate({ to: "/studio" });
    };

    if (editing) {
      updateTrader.mutate(base, {
        onSuccess: () => finish("Profile updated"),
        onError: (err: any) => toast.error(err?.message ?? "Update failed"),
      });
      return;
    }

    createTrader.mutate(
      {
        ...base,
        handle: cleanHandle,
        traderType,
        aiConfig:
          traderType === "ai"
            ? {
                model: aiModel || "GPT-4o",
                skills: previewAiSkills.slice(0, 8),
                description: aiDescription || bio.trim(),
              }
            : undefined,
      },
      {
        onSuccess: () => finish("Profile created"),
        onError: (err: any) => toast.error(err?.message ?? "Create failed"),
      },
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[900px] flex-1 px-4 py-6">
        <Link
          to="/become-a-trader"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to trader program
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trader profile settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up your public trader profile before you go live.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary">
            {traderType === "ai" ? (
              <Bot className="h-3.5 w-3.5" />
            ) : (
              <UserCircle2 className="h-3.5 w-3.5" />
            )}
            {editing ? "Edit profile" : "New profile"}
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <form
            className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="space-y-3">
              <Label>Trader type</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTraderType("human")}
                  className={cn(
                    "flex-1 rounded-lg border p-4 text-left transition-colors",
                    traderType === "human"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Human Trader</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Trade manually with your own strategies
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setTraderType("ai")}
                  className={cn(
                    "flex-1 rounded-lg border p-4 text-left transition-colors",
                    traderType === "ai"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <span className="font-semibold">AI Agent</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Automated trading with AI models
                  </p>
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trader-name">Display name</Label>
                <Input
                  id="trader-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={traderType === "ai" ? "AI Oracle" : "Nova Quant"}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trader-handle">Handle</Label>
                <div className="flex items-center rounded-md border border-input bg-transparent focus-within:ring-1 focus-within:ring-ring">
                  <span className="pl-3 text-muted-foreground">@</span>
                  <Input
                    id="trader-handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/^@/, "").toLowerCase())}
                    placeholder={traderType === "ai" ? "aioracle" : "novaquant"}
                    className="border-0 shadow-none focus-visible:ring-0"
                    autoComplete="username"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Profile image</Label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadImage.isPending}
                  className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                >
                  {uploadImage.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadImage.isPending}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {avatarUrl ? "Change image" : "Upload image"}
                  </button>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    JPG, PNG or GIF · max 5MB
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trader-bio">Bio</Label>
              <Textarea
                id="trader-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={
                  traderType === "ai"
                    ? "Describe your AI trading agent, its capabilities, and what markets it focuses on..."
                    : "What you trade, your edge, and how you stream to followers..."
                }
                className="min-h-[120px] resize-y"
              />
              <p className="text-xs text-muted-foreground">
                {bio.trim().length} characters · shown on your public profile
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trader-country">Country / region</Label>
              <select
                id="trader-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trader-tags">Strategy tags</Label>
              <Input
                id="trader-tags"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder={traderType === "ai" ? "AI, Quantitative, Systematic" : "Crypto, Momentum, Low risk"}
              />
              <p className="text-xs text-muted-foreground">Comma-separated · up to 5 tags</p>
            </div>

            {traderType === "ai" && (
              <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Bot className="h-4 w-4" />
                  AI Configuration
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="ai-model">AI Model</Label>
                  <select
                    id="ai-model"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select model</option>
                    {AI_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-skills">Skills / Capabilities</Label>
                  <Input
                    id="ai-skills"
                    value={aiSkillsText}
                    onChange={(e) => setAiSkillsText(e.target.value)}
                    placeholder="Technical Analysis, Sentiment Analysis, On-chain Data"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated · select from common skills or add custom</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_SKILLS.slice(0, 6).map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          const current = aiSkillsText
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          if (!current.includes(skill)) {
                            setAiSkillsText([...current, skill].join(", "));
                          }
                        }}
                        className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        + {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-description">Model Description</Label>
                  <Textarea
                    id="ai-description"
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder="Describe how your AI model works, what data it analyzes, and its trading strategy..."
                    className="min-h-[80px] resize-y"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={createTrader.isPending || updateTrader.isPending || meLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50 sm:w-auto sm:px-8"
            >
              <Save className="h-4 w-4" />
              {createTrader.isPending || updateTrader.isPending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Create profile"}
            </button>
          </form>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <div className="mt-4 flex items-start gap-3">
                <TraderAvatar name={name || "Trader"} hue={previewHue} avatarUrl={avatarUrl} size={52} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold">{name || "Display name"}</p>
                    {traderType === "ai" && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    @{cleanHandle || "handle"}
                  </p>
                  {country && (
                    <p className="mt-1 text-xs text-muted-foreground">{country}</p>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {bio.trim() || "Your bio appears here — tell followers what you trade and why they should stake with you."}
              </p>
              {previewTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {previewTags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium text-foreground",
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {traderType === "ai" && aiModel && (
                <div className="mt-3 rounded-md bg-primary/10 px-3 py-2">
                  <p className="text-xs font-semibold text-primary">{aiModel}</p>
                  {previewAiSkills.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {previewAiSkills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              to="/studio"
              className="block rounded-lg border border-border bg-secondary/30 px-4 py-3 text-center text-sm font-medium text-foreground hover:bg-secondary/50"
            >
              Open Live Studio →
            </Link>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
