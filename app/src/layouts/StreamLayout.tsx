import { useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeft } from "lucide-react";

type StreamLayoutContextType = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

const StreamLayoutContext = createContext<StreamLayoutContextType>({
  sidebarOpen: true,
  setSidebarOpen: () => {},
});

export const useStreamLayout = () => useContext(StreamLayoutContext);

type StreamLayoutProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  rightRail?: React.ReactNode;
  defaultSidebarOpen?: boolean;
};

export default function StreamLayout({
  sidebar,
  children,
  rightRail,
  defaultSidebarOpen = true,
}: StreamLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);

  return (
    <StreamLayoutContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left Sidebar */}
        <div
          className={cn(
            "flex-shrink-0 border-r bg-background transition-all duration-300",
            sidebarOpen ? "w-60" : "w-0"
          )}
        >
          <div className="h-full w-60 overflow-y-auto">{sidebar}</div>
        </div>

        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-6 rounded-l-none border border-l-0"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Right Rail */}
        {rightRail && (
          <div className="hidden w-80 flex-shrink-0 border-l bg-background overflow-y-auto xl:block">
            {rightRail}
          </div>
        )}
      </div>
    </StreamLayoutContext.Provider>
  );
}
