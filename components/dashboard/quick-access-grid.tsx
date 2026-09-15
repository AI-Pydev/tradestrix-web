"use client";

import Link from "next/link";
import React, { useState } from "react";
import {
    ArrowRightIcon,
    BellRingIcon,
    BoxIcon,
    ChartCandlestickIcon,
    CoinsIcon,
    FlaskConicalIcon,
    HistoryIcon,
    Layers3Icon,
    LayoutGridIcon,
    PlayCircleIcon,
    PlugZapIcon,
    RadarIcon,
    RocketIcon,
    ScanSearchIcon,
    StarIcon,
    TrendingUpIcon,
} from "./icons";

interface QuickAccessItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
}

const quickAccessItems: QuickAccessItem[] = [
  {
    id: "execution-desk",
    title: "Execution Desk",
    description: "Launch bots, review jobs, and manage execution.",
    href: "/dashboard",
    icon: PlayCircleIcon,
    iconBg: "bg-[#6EA8FE]/10",
    iconBorder: "border-[#6EA8FE]/25",
    iconColor: "text-[#6EA8FE]",
  },
  {
    id: "profit-loss",
    title: "Profit / Loss",
    description: "Review multi-stock trades, open positions, and realized P/L.",
    href: "/multi-stock-monitor",
    icon: ChartCandlestickIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
  },
  {
    id: "brokers",
    title: "Brokers",
    description: "Manage broker connections and authentication flows.",
    href: "/brokers",
    icon: PlugZapIcon,
    iconBg: "bg-[#B08AF5]/10",
    iconBorder: "border-[#B08AF5]/25",
    iconColor: "text-[#B08AF5]",
  },
  {
    id: "tradingview-alerts",
    title: "TradingView Alerts",
    description: "Generate copy-paste webhook templates and rotate tokens.",
    href: "/tradingview-alerts",
    icon: BellRingIcon,
    iconBg: "bg-[#E8BC55]/10",
    iconBorder: "border-[#E8BC55]/25",
    iconColor: "text-[#E8BC55]",
  },
  {
    id: "sr-scanner",
    title: "3M S/R Scanner",
    description: "Scan intraday support and resistance setups.",
    href: "/support-resistance-scanner",
    icon: RadarIcon,
    iconBg: "bg-[#F17884]/10",
    iconBorder: "border-[#F17884]/25",
    iconColor: "text-[#F17884]",
  },
  {
    id: "opportunity-scanner",
    title: "Opportunity Scanner",
    description: "Review ranked stock and index opportunities.",
    href: "/opportunity-scanner",
    icon: ScanSearchIcon,
    iconBg: "bg-[#6EA8FE]/10",
    iconBorder: "border-[#6EA8FE]/25",
    iconColor: "text-[#6EA8FE]",
  },
  {
    id: "multi-bot-launcher",
    title: "Multi-Bot Launcher",
    description: "Batch launch CALL and PUT bots from one surface.",
    href: "/multi-bot-launcher",
    icon: Layers3Icon,
    iconBg: "bg-[#B08AF5]/10",
    iconBorder: "border-[#B08AF5]/25",
    iconColor: "text-[#B08AF5]",
  },
  {
    id: "index-auto-launch",
    title: "Index Auto Launch",
    description: "Manage the verified-index auto-launch basket.",
    href: "/index-auto-launch",
    icon: RocketIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
  },
  {
    id: "upstox-backtest",
    title: "Upstox Backtest",
    description: "Run focused option-chain backtests and review results.",
    href: "/upstox-backtest",
    icon: HistoryIcon,
    iconBg: "bg-[#F17884]/10",
    iconBorder: "border-[#F17884]/25",
    iconColor: "text-[#F17884]",
  },
  {
    id: "custom-candle-lab",
    title: "Custom Candle Lab",
    description: "Preview custom candle modes and replay behavior.",
    href: "/custom-candle-lab",
    icon: FlaskConicalIcon,
    iconBg: "bg-[#E8BC55]/10",
    iconBorder: "border-[#E8BC55]/25",
    iconColor: "text-[#E8BC55]",
  },
  {
    id: "trade-history",
    title: "Trade History",
    description: "Review daily and monthly realized options and equity P/L.",
    href: "/trade-history",
    icon: HistoryIcon,
    iconBg: "bg-[#55D6A0]/10",
    iconBorder: "border-[#55D6A0]/25",
    iconColor: "text-[#55D6A0]",
  },
  {
    id: "trendlines",
    title: "Trendlines",
    description: "Automated trendline detection, breakout zones & headroom gate.",
    href: "/trendline-intelligence",
    icon: TrendingUpIcon,
    iconBg: "bg-[#6EA8FE]/10",
    iconBorder: "border-[#6EA8FE]/25",
    iconColor: "text-[#6EA8FE]",
  },
  {
    id: "harmonic-patterns",
    title: "Harmonic Patterns",
    description: "Fibonacci geometric ratios, PRZ zones & predictive scanner.",
    href: "/harmonic-patterns",
    icon: RadarIcon,
    iconBg: "bg-[#B08AF5]/10",
    iconBorder: "border-[#B08AF5]/25",
    iconColor: "text-[#B08AF5]",
  },
  {
    id: "mcx-market",
    title: "MCX Market",
    description: "Open the commodity market workflow.",
    href: "/mcx-market",
    icon: BoxIcon,
    iconBg: "bg-[#62C7D8]/10",
    iconBorder: "border-[#62C7D8]/25",
    iconColor: "text-[#62C7D8]",
  },
  {
    id: "crypto-market",
    title: "Crypto Market",
    description: "Use the delta and demo-order crypto tools.",
    href: "/crypto-market",
    icon: CoinsIcon,
    iconBg: "bg-[#E6B94B]/10",
    iconBorder: "border-[#E6B94B]/25",
    iconColor: "text-[#E6B94B]",
  },
];

export function DashboardQuickAccessGrid() {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    "execution-desk": true,
  });

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section aria-label="Quick Access" className="space-y-3.5">
      {/* Section Header matching reference */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[#E6B94B] text-lg leading-none select-none">⚡</span>
          <div>
            <h2 className="text-sm font-bold text-[#E4E9F2] font-mono tracking-tight leading-none">
              Quick Access
            </h2>
            <p className="text-[11px] text-[#A7B1C3] mt-0.5">
              Launch tools, analyze markets, and manage your trading workflow.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 ts-btn hover:text-white"
        >
          <LayoutGridIcon className="w-3.5 h-3.5 text-slate-400" />
          Customize Layout
        </button>
      </div>

      {/* 12 Workstations in 4 Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {quickAccessItems.map((item) => {
          const Icon = item.icon;
          const isFav = !!favorites[item.id];

          return (
            <Link
              key={item.id}
              href={item.href}
              className="group relative flex flex-col justify-between p-4 rounded-xl ts-card-soft overflow-hidden"
            >
              {/* Top Right Favorite Star (Borderless, muted gray -> gold filled) */}
              <button
                type="button"
                onClick={(e) => toggleFavorite(e, item.id)}
                className={`absolute top-3.5 right-3.5 card-favorite ${isFav ? "active" : ""}`}
                aria-label={isFav ? "Unpin favorite" : "Pin favorite"}
                title={isFav ? "Pinned to favorites" : "Click to pin"}
              >
                <StarIcon
                  className={`w-4 h-4 transition-all ${
                    isFav
                      ? "fill-[#E6B94B] text-[#E6B94B]"
                      : "fill-none text-slate-600 hover:text-slate-400"
                  }`}
                  strokeWidth={1.5}
                />
              </button>

              {/* Card Body: 52px Icon Container on Left + Title & Description */}
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-13 h-13 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg} ${item.iconBorder} ${item.iconColor} group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div className="min-w-0 pr-6">
                  <h3 className="text-sm font-bold text-[#E4E9F2] group-hover:text-[#E6B94B] transition-colors leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#A7B1C3] mt-1.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Bottom Right: Open Pill with Circle Arrow Button */}
              <div className="mt-4 flex items-center justify-end">
                <span className="inline-flex items-center gap-1.5 pl-3 pr-1 py-0.5 rounded-full text-xs font-semibold text-slate-300 bg-[#0B1322] border border-[rgba(148,163,184,0.14)] group-hover:border-[rgba(96,165,250,0.4)] group-hover:text-white transition-all shadow-sm">
                  Open
                  <span className="w-5 h-5 rounded-full bg-blue-500/15 text-[#6EA8FE] flex items-center justify-center group-hover:bg-[#6EA8FE] group-hover:text-slate-950 transition-colors">
                    <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
