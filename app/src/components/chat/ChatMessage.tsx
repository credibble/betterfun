import { cn } from "@/lib/utils";
import { gifUrl } from "@/lib/market-comments-data";

type ChatMessageProps = {
  message: {
    id?: string;
    user: string;
    text: string;
    gif?: string;
    timestamp?: number;
    color?: string;
  };
};

function getColorFromName(name: string): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
    "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const color = message.color ?? getColorFromName(message.user);
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="flex items-start gap-2 group">
      <div
        className="h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {message.user?.charAt(0)?.toUpperCase() ?? "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium" style={{ color }}>
            {message.user}
          </span>
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {time}
          </span>
        </div>
        {message.text && (
          <p className="text-sm text-foreground break-words">{message.text}</p>
        )}
        {message.gif && (
          <img
            src={gifUrl(message.gif)}
            alt="GIF"
            className="mt-1 max-h-32 rounded-lg border border-border"
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
}
