"use client";

import { useEffect, useState } from "react";
import { ActivityIcon } from "../dashboard/icons";

export type TickerItem = {
  symbol: string;
  ltp: number | string;
  changePercent?: number | string;
  direction?: "up" | "down" | "neutral";
};

export interface BBTickerBarProps {
  items?: TickerItem[];
  className?: string;
}

const defaultItems: TickerItem[] = [
  { symbol: "NIFTY 50", ltp: 24090.85, changePercent: 0.42, direction: "up" },
  { symbol: "BANKNIFTY", ltp: 51240.30, changePercent: -0.18, direction: "down" },
  { symbol: "FINNIFTY", ltp: 23680.15, changePercent: 0.31, direction: "up" },
  { symbol: "SENSEX", ltp: 79120.40, changePercent: 0.38, direction: "up" },
];

function Sparkline({ isPositive }: { isPositive: boolean }) {
  if (isPositive) {
    return (
      <svg width="46" height="18" viewBox="0 0 46 18" fill="none" className="shrink-0 overflow-visible">
        <path
          d="M 1 14 Q 8 10 16 13 T 28 8 T 38 4 L 45 2"
          stroke="#55D6A0"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="45" cy="2" r="2" fill="#55D6A0" />
      </svg>
    );
  }
  return (
    <svg width="46" height="18" viewBox="0 0 46 18" fill="none" className="shrink-0 overflow-visible">
      <path
        d="M 1 4 Q 8 6 16 5 T 28 10 T 38 14 L 45 16"
        stroke="#F17884"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="45" cy="16" r="2" fill="#F17884" />
    </svg>
  );
}

export function BBTickerBar({ items = defaultItems, className = "" }: BBTickerBarProps) {
  const [timeString, setTimeString] = useState<string>("10:24:36 AM");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("en-US", {
          hour12: true,
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`h-11 px-4 md:px-6 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between overflow-x-auto whitespace-nowrap text-xs backdrop-blur-md ${className}`.trim()}
    >
      <div className="flex items-center gap-5 sm:gap-7 shrink-0">
        {/* Market Live indicator */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full ts-card-soft text-[11px] font-bold uppercase tracking-wider text-slate-200 shrink-0 shadow-inner">
          <ActivityIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>MARKET LIVE</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
        </div>

        {/* Index list with Sparklines */}
        <div className="flex items-center gap-6 sm:gap-8">
          {items.map((item, idx) => {
            const isPositive =
              item.direction === "up" ||
              (typeof item.changePercent === "number" && item.changePercent > 0);
            const isNegative =
              item.direction === "down" ||
              (typeof item.changePercent === "number" && item.changePercent < 0);

            return (
              <div
                key={`${item.symbol}-${idx}`}
                className="inline-flex items-center gap-2.5 font-mono text-xs shrink-0"
              >
                <span className="font-bold text-slate-100">{item.symbol}</span>
                <span className="text-slate-200 font-semibold">
                  {typeof item.ltp === "number"
                    ? item.ltp.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : item.ltp}
                </span>

                {item.changePercent != null ? (
                  <span
                    className={`text-[11px] font-bold ${
                      isPositive
                        ? "text-[#55D6A0]"
                        : isNegative
                        ? "text-[#F17884]"
                        : "text-slate-400"
                    }`}
                  >
                    {typeof item.changePercent === "number"
                      ? `${item.changePercent > 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`
                      : item.changePercent}
                  </span>
                ) : null}

                <Sparkline isPositive={isPositive} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right live timestamp */}
      <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0 pl-4 border-l border-slate-800">
        <span>Live market data</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-200 font-semibold">{timeString}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    </div>
  );
}

export default BBTickerBar;
