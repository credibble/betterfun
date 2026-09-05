import { Link } from "@tanstack/react-router";
import { HowItWorks } from "@/components/HowItWorks";

const supportLinks: { label: string; to?: string; href?: string }[] = [
  { label: "Contact us", href: "mailto:support@betterfun.app" },
  { label: "Terms of Use", to: "/terms" },
];

const brandLinks: { label: string; to: string }[] = [
  { label: "Portfolio", to: "/portfolio" },
  { label: "Earn", to: "/earn" },
  { label: "Trader pots", to: "/pots" },
  { label: "Discover traders", to: "/traders" },
  { label: "Rounds", to: "/epochs" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Become a trader", to: "/become-a-trader" },
  { label: "Trader Studio", to: "/studio" },
  { label: "Privacy", to: "/privacy" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
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
      <span className="text-xl font-bold tracking-tight text-foreground">BetterFun</span>
    </div>
  );
}

function FooterLink({
  label,
  to,
  href,
}: {
  label: string;
  to?: string;
  href?: string;
}) {
  const className = "text-sm text-muted-foreground hover:text-foreground";
  if (to) {
    return (
      <Link to={to} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-nav">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
        <Brand />
        <p className="mt-2 text-sm text-muted-foreground">
          Asset &amp; event prediction markets — personal leverage, vault LP, and epoch trader pots.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-2">
          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">Support</div>
            <ul className="space-y-2.5">
              <li>
                <HowItWorks>
                  <button className="text-sm text-muted-foreground hover:text-foreground">
                    How it works
                  </button>
                </HowItWorks>
              </li>
              {supportLinks.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">BetterFun</div>
            <ul className="space-y-2.5">
              {brandLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>BetterFun © 2026</span>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms of Use
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          BetterFun operates globally through separate legal entities. This platform involves
          substantial risk of loss. Trading prediction markets is not suitable for everyone.
        </p>
      </div>
    </footer>
  );
}
