"use client";

import Link from "next/link";
import { ArrowUpRightIcon, RadarIcon, ZapIcon } from "./icons";

interface OpportunityItem {
  id: string;
  symbol: string;
  bias: "CALL" | "PUT" | "WAIT";
  confidence: number;
  drivers: string[];
  setup: string;
  expectedMove: string;
  actionText: string;
  actionHref: string;
}

const opportunities: OpportunityItem[] = [
  {
    id: "nifty",
    symbol: "NIFTY 50",
    bias: "CALL",
    confidence: 82,
    drivers: ["Momentum ↑", "Order Flow ↑", "Liquidity Clear"],
    setup: "Breakout of 24,080 S/R Zone",
    expectedMove: "+18–24 pts (3m)",
    actionText: "Launch Bot",
    actionHref: "/dashboard",
  },
  {
    id: "banknifty",
    symbol: "BANKNIFTY",
    bias: "WAIT",
    confidence: 45,
    drivers: ["Consolidation 51,240", "Chop Index 62"],
    setup: "Trapped inside 3M Value Area",
    expectedMove: "Compression (±15 pts)",
    actionText: "Open S/R",
    actionHref: "/support-resistance-scanner",
  },
  {
    id: "finnifty",
    symbol: "FINNIFTY",
    bias: "CALL",
    confidence: 76,
    drivers: ["Bullish Pinbar 23,650", "Delta Divergence"],
    setup: "Institutional Re-test of VWAP",
    expectedMove: "+30–38 pts (3m)",
    actionText: "Deploy Scanner",
    actionHref: "/opportunity-scanner",
  },
  {
    id: "reliance",
    symbol: "RELIANCE",
    bias: "CALL",
    confidence: 71,
    drivers: ["Volume +3.4x", "Option Chain Bullish"],
    setup: "Headroom Gate Clear to R1",
    expectedMove: "+0.9% Target",
    actionText: "Open Monitor",
    actionHref: "/multi-stock-monitor",
  },
];

export function BestOpportunitiesPanel() {
  return (
    <div className="h-full flex flex-col justify-between p-4 ts-radar-panel backdrop-blur-md">
      {/* Panel Header */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/70">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400">
              <ZapIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100 leading-none font-mono">
                Best Opportunities Now
              </h2>
              <span className="text-[10px] text-slate-400">Live Quantitative Edge</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE SCAN
          </div>
        </div>

        {/* Opportunity List */}
        <div className="mt-3 space-y-2.5">
          {opportunities.map((item) => {
            const isCall = item.bias === "CALL";
            const isPut = item.bias === "PUT";

            const badgeBg = isCall
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : isPut
              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
              : "bg-amber-500/15 text-amber-300 border-amber-500/30";

            return (
              <div
                key={item.id}
                className="group p-2.5 rounded-lg ts-card-soft hover:border-[#60a5fa]/60 transition-all duration-150 shadow-sm"
              >
                {/* Symbol + Bias Pill + Confidence */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-100 font-mono">
                      {item.symbol}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border tracking-wider font-mono ${badgeBg}`}
                    >
                      {item.bias}
                    </span>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-200">
                    {item.confidence}%{" "}
                    <span className="text-[9px] font-normal text-slate-400">conf</span>
                  </span>
                </div>

                {/* Signal Drivers */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {item.drivers.map((driver, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-slate-900/90 text-[10px] font-mono text-slate-300 border border-slate-800/80"
                    >
                      {driver}
                    </span>
                  ))}
                </div>

                {/* Expected Move & Action */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-300 font-semibold truncate max-w-[55%]">
                    {item.expectedMove}
                  </span>

                  <Link
                    href={item.actionHref}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ts-btn text-[10px] font-bold text-amber-300 hover:text-white transition-colors"
                  >
                    <span>{item.actionText}</span>
                    <ArrowUpRightIcon className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <RadarIcon className="w-3 h-3 text-slate-400" />
          182 instruments scanned
        </span>
        <span className="text-emerald-400 font-semibold">Next: 4s</span>
      </div>
    </div>
  );
}
