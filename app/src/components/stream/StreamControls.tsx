import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, StopCircle, Settings, Monitor } from "lucide-react";

type StreamControlsProps = {
  isLive?: boolean;
  onStartStream?: () => void;
  onStopStream?: () => void;
  streamKey?: string;
  className?: string;
};

export default function StreamControls({
  isLive = false,
  onStartStream,
  onStopStream,
  streamKey,
  className,
}: StreamControlsProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isLive ? (
        <>
          <Badge className="bg-red-500 hover:bg-red-600 text-white">
            <Radio className="h-3 w-3 mr-1 animate-pulse" />
            Live
          </Badge>
          <Button variant="destructive" size="sm" onClick={onStopStream}>
            <StopCircle className="h-4 w-4 mr-1" />
            End Stream
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={onStartStream}>
          <Radio className="h-4 w-4 mr-1" />
          Go Live
        </Button>
      )}
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowSettings(!showSettings)}>
        <Settings className="h-4 w-4" />
      </Button>

      {showSettings && streamKey && (
        <div className="absolute top-full mt-2 right-0 p-3 bg-background border rounded-lg shadow-lg z-50 w-72">
          <p className="text-xs font-medium mb-2">Stream Key</p>
          <code className="text-xs bg-muted p-2 rounded block break-all">{streamKey}</code>
          <p className="text-xs text-muted-foreground mt-2">
            Use this key in OBS or your streaming software.
          </p>
        </div>
      )}
    </div>
  );
}
