import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SearchPopover } from "@/components/SearchPopover";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InfosPopover } from "@/components/InfosPopover";
import { NotificationPopover } from "@/components/NotificationPopover";
import { LoginButton } from "@/components/auth/LoginButton";

const NAV_LINKS = [
  { to: "/", label: "Discover" },
  { to: "/demo", label: "Demo" },
  { to: "/traders", label: "Traders" },
  { to: "/pots", label: "Pots" },
  { to: "/epochs", label: "Epochs" },
  { to: "/studio", label: "Studio" },
];

function NavLinks({ mobile = false, onClick }: { mobile?: boolean; onClick?: () => void }) {
  const { pathname } = useLocation();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  if (mobile) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClick}
            className={cn(
              "text-lg transition-colors hover:text-foreground",
              isActive(link.to) ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-6">
      {NAV_LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className={cn(
            "text-sm transition-colors hover:text-foreground",
            isActive(link.to) ? "text-foreground font-medium" : "text-muted-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-lg border-b">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-1.5 font-bold text-lg shrink-0">
          <Zap className="h-5 w-5 fill-primary text-primary" />
          BetterFun
        </Link>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 justify-center max-w-md mx-4">
          <SearchPopover />
        </div>

        {/* Right: Nav links + actions */}
        <div className="flex items-center gap-4">
          <NavLinks />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <InfosPopover />
            <NotificationPopover />
            <LoginButton />
          </div>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <div className="flex flex-col gap-6 p-6">
                <Link to="/" className="flex items-center gap-1.5 font-bold text-lg">
                  <Zap className="h-5 w-5 fill-primary text-primary" />
                  BetterFun
                </Link>
                <div className="md:hidden">
                  <SearchPopover />
                </div>
                <NavLinks mobile />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
