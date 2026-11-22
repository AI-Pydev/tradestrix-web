import React from "react";

import {
  ActivityIcon,
  BellRingIcon,
  BotIcon,
  BoxIcon,
  BrainCircuitIcon,
  ChartCandlestickIcon,
  CoinsIcon,
  FileTextIcon,
  FlaskConicalIcon,
  HistoryIcon,
  Layers3Icon,
  NetworkIcon,
  PlayCircleIcon,
  PlugZapIcon,
  RadarIcon,
  RocketIcon,
  ScanSearchIcon,
  ShieldCheckIcon,
  TargetIcon,
  TrendingUpIcon,
} from "./dashboard/icons";

export type ModuleCategoryId =
  | "trade-execute"
  | "markets"
  | "research-signals"
  | "strategy-lab"
  | "performance-history"
  | "alerts-automation"
  | "connections-admin";

export interface ModuleCategory {
  id: ModuleCategoryId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
}

export interface PlatformModule {
  id: string;
  href: string;
  label: string;
  caption: string;
  description: string;
  categoryId: ModuleCategoryId;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  external?: boolean;
  adminOnly?: boolean;
  badge?: string;
}

export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

export const DEFAULT_PINNED_MODULE_IDS = [
  "execution-desk",
  "multi-stock-monitor",
  "brokers",
  "tradingview-alerts",
];

export const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    id: "trade-execute",
    title: "Trade & Execute",
    description: "Launch, run and monitor live bots",
    icon: PlayCircleIcon,
    iconBg: "bg-[#6EA8FE]/10",
    iconBorder: "border-[#6EA8FE]/25",
    iconColor: "text-[#6EA8FE]",
  },
  {
    id: "markets",
    title: "Markets",
    description: "Asset-class workflows",
    icon: BoxIcon,
    iconBg: "bg-[#62C7D8]/10",
    iconBorder: "border-[#62C7D8]/25",
    iconColor: "text-[#62C7D8]",
  },
  {
    id: "research-signals",
    title: "Research & Signals",
    description: "Scanners and pattern intelligence",
    icon: ScanSearchIcon,
    iconBg: "bg-[#B08AF5]/10",
    iconBorder: "border-[#B08AF5]/25",
    iconColor: "text-[#B08AF5]",
  },
  {
    id: "strategy-lab",
    title: "Strategy Lab",
    description: "Test, score and qualify strategies",
    icon: FlaskConicalIcon,
    iconBg: "bg-[#E8BC55]/10",
    iconBorder: "border-[#E8BC55]/25",
    iconColor: "text-[#E8BC55]",
  },
  {
    id: "performance-history",
    title: "Performance & History",
    description: "Realized P/L and trade records",
    icon: HistoryIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
  },
  {
    id: "alerts-automation",
    title: "Alerts & Automation",
    description: "Webhooks and alert templates",
    icon: BellRingIcon,
    iconBg: "bg-[#F17884]/10",
    iconBorder: "border-[#F17884]/25",
    iconColor: "text-[#F17884]",
  },
  {
    id: "connections-admin",
    title: "Connections & Admin",
    description: "Brokers, data maps and access",
    icon: PlugZapIcon,
    iconBg: "bg-[#94A3B8]/10",
    iconBorder: "border-[#94A3B8]/25",
    iconColor: "text-[#94A3B8]",
  },
];

export const PLATFORM_MODULES: PlatformModule[] = [
  // 1. Trade & Execute (5)
  {
    id: "execution-desk",
    href: "/dashboard",
    label: "Execution Desk",
    caption: "Bot control center",
    description: "Launch bots, review jobs, and manage execution.",
    categoryId: "trade-execute",
    icon: PlayCircleIcon,
    iconBg: "bg-[#6EA8FE]/10",
    iconBorder: "border-[#6EA8FE]/25",
    iconColor: "text-[#6EA8FE]",
  },
  {
    id: "execution-accordion",
    href: "/execution-dashboard",
    label: "Execution Mode",
    caption: "Paper/Real mode & gatekeeper",
    description: "Paper/real trading mode, IP whitelist & signal gatekeeper.",
    categoryId: "trade-execute",
    icon: Layers3Icon,
    iconBg: "bg-[#62C7D8]/10",
    iconBorder: "border-[#62C7D8]/25",
    iconColor: "text-[#62C7D8]",
  },
  {
    id: "stock-etf-desk",
    href: "/equity-desk",
    label: "Stock & ETF Desk",
    caption: "Stock, ETF & BeeS bots",
    description: "Stock, ETF and BeeS bots.",
    categoryId: "trade-execute",
    icon: ChartCandlestickIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
  },
  {
    id: "multi-bot-launcher",
    href: "/multi-bot-launcher",
    label: "Multi-Bot Launcher",
    caption: "Batch launch bots",
    description: "Batch launch CALL and PUT bots from one surface.",
    categoryId: "trade-execute",
    icon: Layers3Icon,
    iconBg: "bg-[#B08AF5]/10",
    iconBorder: "border-[#B08AF5]/25",
    iconColor: "text-[#B08AF5]",
  },
  {
    id: "multi-stock-monitor",
    href: "/multi-stock-monitor",
    label: "Multi-Stock Monitor",
    caption: "Live quote & trade monitor",
    description: "Live quotes, open positions and realized P/L.",
    categoryId: "trade-execute",
    icon: ActivityIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
  },

  // 2. Markets (5)
  {
    id: "index-auto-launch",
    href: "/index-auto-launch",
    label: "Index Auto Launch",
    caption: "Auto-launch basket",
    description: "Manage the verified-index auto-launch basket.",
    categoryId: "markets",
    icon: RocketIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
  },
  {
    id: "stock-auto-launch",
    href: "/stock-auto-launch",
    label: "Stock Auto Launch",
    caption: "Qualified stock universe",
    description: "Automated assignment for the qualified stock universe.",
    categoryId: "markets",
    icon: RocketIcon,
    iconBg: "bg-[#6EA8FE]/10",
    iconBorder: "border-[#6EA8FE]/25",
    iconColor: "text-[#6EA8FE]",
  },
  {
    id: "mcx-market",
    href: "/mcx-market",
    label: "MCX Market",
    caption: "Commodity market tools",
    description: "Open the commodity market workflow.",
    categoryId: "markets",
    icon: BoxIcon,
    iconBg: "bg-[#62C7D8]/10",
    iconBorder: "border-[#62C7D8]/25",
    iconColor: "text-[#62C7D8]",
  },
  {
    id: "crypto-market",
    href: "/crypto-market",
    label: "Crypto Market",
    caption: "Delta & demo trading tools",
    description: "Use the Delta and demo-order crypto tools.",
    categoryId: "markets",
    icon: CoinsIcon,
    iconBg: "bg-[#E6B94B]/10",
    iconBorder: "border-[#E6B94B]/25",
    iconColor: "text-[#E6B94B]",
  },
  {
    id: "crypto-jobs",
    href: "/crypto-jobs",
    label: "Crypto Jobs",
    caption: "Continuous paper runtime",
    description: "Continuous paper runtime for crypto.",
    categoryId: "markets",
    icon: BotIcon,
    iconBg: "bg-[#B08AF5]/10",
    iconBorder: "border-[#B08AF5]/25",
    iconColor: "text-[#B08AF5]",
  },

  // 3. Research & Signals (6)
  {
    id: "opportunity-scanner",
    href: "/opportunity-scanner",
    label: "Opportunity Scanner",
    caption: "Stock and index setups",
    description: "Review ranked stock and index opportunities.",
    categoryId: "research-signals",
    icon: ScanSearchIcon,
    iconBg: "bg-[#6EA8FE]/10",
    iconBorder: "border-[#6EA8FE]/25",
    iconColor: "text-[#6EA8FE]",
  },
  {
    id: "sr-scanner",
    href: "/support-resistance-scanner",
    label: "3M S/R Scanner",
    caption: "Intraday S/R analysis",
    description: "Scan intraday support and resistance setups.",
    categoryId: "research-signals",
    icon: RadarIcon,
    iconBg: "bg-[#F17884]/10",
    iconBorder: "border-[#F17884]/25",
    iconColor: "text-[#F17884]",
  },
  {
    id: "trendlines",
    href: "/trendline-intelligence",
    label: "Trendlines",
    caption: "Breakouts & headroom gate",
    description: "Automated trendline detection, breakout zones and headroom.",
    categoryId: "research-signals",
    icon: TrendingUpIcon,
    iconBg: "bg-[#6EA8FE]/10",
    iconBorder: "border-[#6EA8FE]/25",
    iconColor: "text-[#6EA8FE]",
  },
  {
    id: "harmonics",
    href: "/harmonic-patterns",
    label: "Harmonics",
    caption: "Pattern scanner & PRZ chart",
    description: "Fibonacci geometric ratios, PRZ zones and predictive scanner.",
    categoryId: "research-signals",
    icon: ActivityIcon,
    iconBg: "bg-[#B08AF5]/10",
    iconBorder: "border-[#B08AF5]/25",
    iconColor: "text-[#B08AF5]",
  },
  {
    id: "ai-research-agent",
    href: "/research-agent",
    label: "AI Research Agent",
    caption: "AI strategy diagnosis + fixes",
    description: "AI strategy diagnosis and fixes.",
    categoryId: "research-signals",
    icon: BrainCircuitIcon,
    iconBg: "bg-[#62C7D8]/10",
    iconBorder: "border-[#62C7D8]/25",
    iconColor: "text-[#62C7D8]",
  },
  {
    id: "crypto-research",
    href: "/crypto-research",
    label: "Crypto Research",
    caption: "Strategy optimizer & backtest",
    description: "Delta historical candle backtests.",
    categoryId: "research-signals",
    icon: ScanSearchIcon,
    iconBg: "bg-[#E6B94B]/10",
    iconBorder: "border-[#E6B94B]/25",
    iconColor: "text-[#E6B94B]",
  },

  // 4. Strategy Lab (3)
  {
    id: "strategy-qualification",
    href: "/strategy-qualification",
    label: "Strategy Qualification",
    caption: "Auto backtest & scoring",
    description: "Auto-backtest cycle, scoring and buckets.",
    categoryId: "strategy-lab",
    icon: TargetIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
  },
  {
    id: "upstox-backtest",
    href: "/upstox-backtest",
    label: "Upstox Backtest",
    caption: "Options backtest engine",
    description: "Run focused option-chain backtests and review results.",
    categoryId: "strategy-lab",
    icon: HistoryIcon,
    iconBg: "bg-[#F17884]/10",
    iconBorder: "border-[#F17884]/25",
    iconColor: "text-[#F17884]",
  },
  {
    id: "custom-candle-lab",
    href: "/custom-candle-lab",
    label: "Custom Candle Lab",
    caption: "Custom modes & replay",
    description: "Preview custom candle modes and replay behavior.",
    categoryId: "strategy-lab",
    icon: FlaskConicalIcon,
    iconBg: "bg-[#E8BC55]/10",
    iconBorder: "border-[#E8BC55]/25",
    iconColor: "text-[#E8BC55]",
  },

  // 5. Performance & History (3)
  {
    id: "options-trade-history",
    href: "/trade-history",
    label: "Options Trade History",
    caption: "Daily and monthly options PnL",
    description: "Daily and monthly options P/L.",
    categoryId: "performance-history",
    icon: HistoryIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
  },
  {
    id: "stock-etf-history",
    href: "/equity-trade-history",
    label: "Stock & ETF History",
    caption: "Stock, ETF & BeeS PnL",
    description: "Stock, ETF and BeeS P/L breakdown.",
    categoryId: "performance-history",
    icon: HistoryIcon,
    iconBg: "bg-[#6EA8FE]/10",
    iconBorder: "border-[#6EA8FE]/25",
    iconColor: "text-[#6EA8FE]",
  },
  {
    id: "tv-alert-history",
    href: "/tradingview-alerts/trade-history",
    label: "TV Alert History",
    caption: "Webhook execution PnL",
    description: "Webhook execution P/L.",
    categoryId: "performance-history",
    icon: HistoryIcon,
    iconBg: "bg-[#E8BC55]/10",
    iconBorder: "border-[#E8BC55]/25",
    iconColor: "text-[#E8BC55]",
  },

  // 6. Alerts & Automation (2)
  {
    id: "tradingview-alerts",
    href: "/tradingview-alerts",
    label: "TradingView Alerts",
    caption: "Webhook templates",
    description: "Generate copy-paste webhook templates and rotate tokens.",
    categoryId: "alerts-automation",
    icon: BellRingIcon,
    iconBg: "bg-[#E8BC55]/10",
    iconBorder: "border-[#E8BC55]/25",
    iconColor: "text-[#E8BC55]",
  },
  {
    id: "crypto-tv-templates",
    href: "/crypto-tradingview-templates",
    label: "Crypto TV Templates",
    caption: "Delta webhook templates",
    description: "Dedicated template desk for Delta alert payloads.",
    categoryId: "alerts-automation",
    icon: BellRingIcon,
    iconBg: "bg-[#B08AF5]/10",
    iconBorder: "border-[#B08AF5]/25",
    iconColor: "text-[#B08AF5]",
  },

  // 7. Connections & Admin (3 base + 1 admin)
  {
    id: "brokers",
    href: "/brokers",
    label: "Brokers",
    caption: "Connections & auth",
    description: "Manage broker connections and authentication flows.",
    categoryId: "connections-admin",
    icon: PlugZapIcon,
    iconBg: "bg-[#B08AF5]/10",
    iconBorder: "border-[#B08AF5]/25",
    iconColor: "text-[#B08AF5]",
  },
  {
    id: "symbol-map",
    href: "/symbol-map",
    label: "Symbol Map",
    caption: "Broker symbol mappings",
    description: "Instrument and symbol mapping.",
    categoryId: "connections-admin",
    icon: NetworkIcon,
    iconBg: "bg-[#62C7D8]/10",
    iconBorder: "border-[#62C7D8]/25",
    iconColor: "text-[#62C7D8]",
  },
  {
    id: "api-docs",
    href: `${BACKEND_BASE_URL}/docs`,
    label: "API Docs",
    caption: "FastAPI Swagger docs",
    description: "Backend API reference.",
    categoryId: "connections-admin",
    icon: FileTextIcon,
    iconBg: "bg-[#94A3B8]/10",
    iconBorder: "border-[#94A3B8]/25",
    iconColor: "text-[#94A3B8]",
    external: true,
  },
  {
    id: "approvals",
    href: "/admin",
    label: "Approvals",
    caption: "Gmail access control",
    description: "Review and approve user access requests.",
    categoryId: "connections-admin",
    icon: ShieldCheckIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
    adminOnly: true,
    badge: "Admin",
  },
];

export function getVisibleModules(isAdmin: boolean): PlatformModule[] {
  return PLATFORM_MODULES.filter((mod) => !mod.adminOnly || isAdmin);
}

export function getCategoryGroups(isAdmin: boolean) {
  const visible = getVisibleModules(isAdmin);
  return MODULE_CATEGORIES.map((category) => ({
    ...category,
    items: visible.filter((mod) => mod.categoryId === category.id),
  })).filter((group) => group.items.length > 0);
}
