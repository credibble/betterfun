import { useEffect, useState } from "react";
import { Check, Copy, Radio, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLiveKitStreamSetup } from "@/lib/queries";
import { copyToClipboard, selectText } from "@/lib/clipboard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user confirms go-live after reviewing stream credentials. */
  onConfirm: () => void;
  traderHandle: string;
};

function CopyField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error("Could not copy — select the text and press Ctrl+C");
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-up" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div
        onClick={(e) => selectText(e.currentTarget)}
        className={cn(
          "rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm break-all cursor-text select-all",
          mono && "font-mono text-xs sm:text-sm",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Shown when starting a studio stream — fetches real RTMP credentials from the backend.
 */
export function StreamSetupDialog({ open, onOpenChange, onConfirm, traderHandle }: Props) {
  const streamSetup = useLiveKitStreamSetup();
  const roomName = `stream-${traderHandle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;

  // Fetch credentials whenever the dialog opens (covers programmatic opens where
  // Radix doesn't call onOpenChange).
  useEffect(() => {
    if (open && !streamSetup.data && !streamSetup.isPending && !streamSetup.isError) {
      streamSetup.mutate(roomName, {
        onError: () => toast.error("Failed to get stream credentials"),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roomName]);

  const serverUrl = streamSetup.data?.serverUrl ?? "";
  const streamKey = streamSetup.data?.streamKey ?? "";
  const configured = streamSetup.data?.configured ?? true;
  const isLoading = streamSetup.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="space-y-1 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            Stream setup
          </DialogTitle>
          <DialogDescription>
            Connect OBS (or any RTMP encoder), then go live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching stream credentials...
            </div>
          ) : streamSetup.isError ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-destructive/10 px-3 py-3 text-xs text-destructive">
                Failed to fetch stream credentials. Make sure LiveKit is configured on the server
                (LIVEKIT_API_URL / KEY / SECRET).
              </div>
              <button
                type="button"
                onClick={() => streamSetup.mutate(roomName)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary/60"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          ) : (
            <>
              <CopyField label="Stream server (RTMP)" value={serverUrl} mono />
              <CopyField label="Stream key" value={streamKey} mono />

              {!configured && (
                <div className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-3 text-xs text-foreground">
                  LiveKit isn't fully configured on the server yet — the stream key is empty.
                  Set <code className="font-mono">LIVEKIT_API_KEY</code> and{" "}
                  <code className="font-mono">LIVEKIT_API_SECRET</code> in the backend env to
                  enable broadcasting.
                </div>
              )}

              <div className="rounded-lg border border-border bg-secondary/20 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground">In OBS</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                  <li>Open Settings → Stream</li>
                  <li>Service: Custom</li>
                  <li>Paste the server URL and stream key above</li>
                  <li>Apply, then Start Streaming — then confirm Go live here</li>
                </ol>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-border px-6 py-4 sm:space-x-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
            disabled={isLoading || !!streamSetup.isError}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50"
          >
            Go live
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
