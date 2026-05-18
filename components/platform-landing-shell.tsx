import Link from "next/link";

type LandingCard = {
  title: string;
  href: string;
  description: string;
  cta: string;
  external?: boolean;
};

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

const landingCards: LandingCard[] = [
  {
    title: "Execution Desk",
    href: "/dashboard",
    description: "Launch bots, review jobs, and manage execution.",
    cta: "Open",
  },
  {
    title: "Profit / Loss",
    href: "/multi-stock-monitor",
    description: "Review multi-stock trades, open positions, and realized P/L.",
    cta: "Open",
  },
  {
    title: "Brokers",
    href: "/brokers",
    description: "Manage broker connections and auth flows.",
    cta: "Open",
  },
  {
    title: "TradingView Alerts",
    href: "/tradingview-alerts",
    description: "Generate copy-paste webhook templates and rotate tokens.",
    cta: "Open",
  },
  {
    title: "3M S/R Scanner",
    href: "/support-resistance-scanner",
    description: "Scan intraday support and resistance setups.",
    cta: "Open",
  },
  {
    title: "Opportunity Scanner",
    href: "/opportunity-scanner",
    description: "Review ranked stock and index opportunities.",
    cta: "Open",
  },
  {
    title: "Multi-Bot Launcher",
    href: "/multi-bot-launcher",
    description: "Batch launch CALL and PUT bots from one surface.",
    cta: "Open",
  },
  {
    title: "Index Auto Launch",
    href: "/index-auto-launch",
    description: "Manage the verified-index auto-launch basket.",
    cta: "Open",
  },
  {
    title: "Upstox Backtest",
    href: "/upstox-backtest",
    description: "Run focused option-chain backtests and review results.",
    cta: "Open",
  },
  {
    title: "Custom Candle Lab",
    href: "/custom-candle-lab",
    description: "Preview custom candle modes and replay behavior.",
    cta: "Open",
  },
  {
    title: "MCX Market",
    href: "/mcx-market",
    description: "Open the commodity market workflow.",
    cta: "Open",
  },
  {
    title: "Crypto Market",
    href: "/crypto-market",
    description: "Use the delta and demo-order crypto tools.",
    cta: "Open",
  },
  {
    title: "Crypto TV Templates",
    href: "/crypto-tradingview-templates",
    description: "Create Delta crypto TradingView templates on a dedicated page.",
    cta: "Open",
  },
  {
    title: "API Docs",
    href: `${BACKEND_BASE_URL}/docs`,
    description: "Open the backend docs and inspect the HTTP surface.",
    cta: "Open",
    external: true,
  },
];

function DirectoryCard({ card }: { card: LandingCard }) {
  const content = (
    <>
      <h2 className="directory-card-title">{card.title}</h2>
      <p className="directory-card-copy">{card.description}</p>
      <div className="directory-card-footer">
        <span className="directory-card-cta">{card.cta}</span>
      </div>
    </>
  );

  if (card.external) {
    return (
      <a className="directory-card landing-nav-card" href={card.href} rel="noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link className="directory-card landing-nav-card" href={card.href}>
      {content}
    </Link>
  );
}

export function PlatformLandingShell() {
  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="landing-nav-only">
          <div className="directory-grid landing-nav-grid">
            {landingCards.map((card) => (
              <DirectoryCard card={card} key={card.href} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
