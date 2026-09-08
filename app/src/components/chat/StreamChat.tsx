import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ChatMessage from "./ChatMessage";
import TradeSignalMessage from "./TradeSignalMessage";
import SystemMessage from "./SystemMessage";
import ChatInput from "./ChatInput";
import { useChat } from "@/hooks/use-chat";

type StreamChatProps = {
  traderId: string;
  potId?: string;
  traderName: string;
  className?: string;
};

export default function StreamChat({
  traderId,
  potId,
  traderName,
  className,
}: StreamChatProps) {
  const { messages, send, connected } = useChat(traderId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Live Chat</h3>
          <Badge variant={connected ? "default" : "destructive"} className="text-[10px] h-4">
            {connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">
                No messages yet. Say hello!
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              if (msg.type === "trade_signal") {
                return <TradeSignalMessage key={msg.id ?? i} signal={msg as any} />;
              }
              if (msg.type === "system") {
                return <SystemMessage key={msg.id ?? i} message={msg} />;
              }
              return <ChatMessage key={msg.id ?? i} message={msg as any} />;
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput onSend={send} disabled={!connected} />
    </div>
  );
}
