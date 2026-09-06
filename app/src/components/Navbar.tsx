import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  Flame,
  Layers,
  Menu,
  Radio,
  Rocket,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SearchPopover } from "@/components/SearchPopover";
import { LoginButton } from "@/components/auth/LoginButton";
import { NotificationPopover } from "@/components/NotificationPopover";
import { InfosPopover } from "@/components/InfosPopover";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type NavLink = {
  label: string;
  desc?: string;
  to: string;
  icon?: LucideIcon;
};

type NavSection = {
  heading: string;
  items: NavLink[];
};

type NavGroup = {
  label: string;
  sections: NavSection[];
};

const navGroups: NavGroup[] = [
  {
    label: "Home",
    sections: [
      {
        heading: "Browse",
        items: [
          { label: "Discover", desc: "Pots, traders & epochs", to: "/", icon: Flame },
        ],
      },
    ],
  },
  {
    label: "Earn & pots",
    sections: [
      {
        heading: "Earn",
        items: [
          { label: "Trader pots", desc: "Back a trader for a round", to: "/pots", icon: Layers },
          {
            label: "Round calendar",
            desc: "When pots open & settle",
            to: "/epochs",
            icon: CalendarDays,
          },
        ],
      },
    ],
  },
  {
    label: "Traders & studio",
    sections: [
      {
        heading: "Discover",
        items: [
          { label: "Discover traders", desc: "Profiles, PnL & streams", to: "/traders", icon: Users },
          { label: "Leaderboard", desc: "Top performers", to: "/leaderboard", icon: Trophy },
        ],
      },
      {
        heading: "Create",
        items: [
          {
            label: "Become a trader",
            desc: "Apply to run pots",
            to: "/become-a-trader",
            icon: Rocket,
          },
          { label: "Trader Studio", desc: "Pots, go live & followers", to: "/studio", icon: Radio },
        ],
      },
    ],
  },
];

function isNavActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function isGroupActive(pathname: string, group: NavGroup) {
  return group.sections.some((s) => s.items.some((item) => isNavActive(pathname, item.to)));
}

function Logo({ showLabel = true }: { showLabel?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 14l4-4 4 3 6-8"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="5" r="2" fill="#fff" />
        </svg>
      </div>
      {showLabel && (
        <span className="hidden text-lg font-bold tracking-tight text-foreground min-[420px]:inline">
          BetterFun
        </span>
      )}
    </div>
  );
}

function navLinkClass(active: boolean, className?: string) {
  return cn(
    "flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "bg-accent font-medium" : "hover:bg-accent/70",
    className,
  );
}

function NavLinkInner({ item, pathname }: { item: NavLink; pathname: string }) {
  const active = isNavActive(pathname, item.to);
  const Icon = item.icon;
  return (
    <>
      {Icon && (
        <span
          className={cn(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md",
            active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-foreground">{item.label}</span>
        {item.desc && (
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {item.desc}
          </span>
        )}
      </span>
    </>
  );
}

function NavDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const active = isGroupActive(pathname, group);
  const wide = group.sections.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {group.label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("p-2", wide ? "w-[min(28rem,calc(100vw-2rem))]" : "w-[min(18rem,calc(100vw-2rem))]")}
      >
        <div className={cn(wide && "grid gap-1 sm:grid-cols-2")}>
          {group.sections.map((section) => (
            <div key={section.heading} className="min-w-0">
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                {section.heading}
              </DropdownMenuLabel>
              {section.items.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="p-0 focus:bg-transparent">
                  <Link to={item.to} className={navLinkClass(isNavActive(pathname, item.to))}>
                    <NavLinkInner item={item} pathname={pathname} />
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-nav/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-none items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:gap-4 lg:px-6 xl:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <MobileNav pathname={pathname} />

          <Link to="/" className="shrink-0">
            <Logo />
          </Link>

          <div className="min-w-0 w-full max-w-[400px]">
            <SearchPopover />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 lg:gap-4">
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {navGroups.map((group) => (
              <NavDropdown key={group.label} group={group} pathname={pathname} />
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <ThemeToggle className="hidden md:flex" />
            <InfosPopover className="hidden md:flex" />
            <NotificationPopover />
            <LoginButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileAccordion({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80 hover:bg-secondary/40"
        aria-expanded={open}
      >
        {title}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-80 flex-col border-border bg-nav p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex h-16 items-center border-b border-border px-4">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto p-3" aria-label="Mobile">
          {navGroups.map((group) => (
            <MobileAccordion
              key={group.label}
              title={group.label}
              defaultOpen={isGroupActive(pathname, group)}
            >
              {group.sections.map((section) => (
                <div key={section.heading} className="mb-2">
                  <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                    {section.heading}
                  </p>
                  {section.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={navLinkClass(isNavActive(pathname, item.to))}
                    >
                      <NavLinkInner item={item} pathname={pathname} />
                    </Link>
                  ))}
                </div>
              ))}
            </MobileAccordion>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Help & info</span>
            <InfosPopover />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
