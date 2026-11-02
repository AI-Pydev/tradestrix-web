"use client";

import { ActivityIcon } from "../dashboard/icons";

export type TickerItem = {
  symbol: string;
  ltp: number | string | null;
  changePercent?: number | string;
  direction?: "up" | "down" | "neutral";
};

export interface BBTickerBarProps {
  items?: TickerItem[];
  className?: string;
}

const defaultItems: TickerItem[] = [
  { symbol: "NIFTY 50", ltp: null },
  { symbol: "BANKNIFTY", ltp: null },
  { symbol: "FINNIFTY", ltp: null },
  { symbol: "SENSEX", ltp: null },
];

export function BBTickerBar({ items = defaultItems, className = "" }: BBTickerBarProps) {
  const hasQuotes = items.some((item) =>
    typeof item.ltp === "number" ? Number.isFinite(item.ltp) : Boolean(item.ltp?.trim())
  );

  return (
    <div
      className={`h-11 px-4 md:px-6 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between overflow-x-auto whitespace-nowrap text-xs backdrop-blur-md ${className}`.trim()}
    >
      <div className="flex items-center gap-5 sm:gap-7 shrink-0">
        {/* Quote availability does not imply the market is open. */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full ts-card-soft text-[11px] font-bold uppercase tracking-wider text-slate-200 shrink-0 shadow-inner">
          <ActivityIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>MARKET INDICES</span>
        </div>

        {/* Only display supplied quotes; never substitute sample market values. */}
        <div className="flex items-center gap-6 sm:gap-8">
          {items.map((item, idx) => {
            const hasPrice = typeof item.ltp === "number"
              ? Number.isFinite(item.ltp)
              : Boolean(item.ltp?.trim());
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
                <span className="font-bold text-slate-100">{item.symbol}</span>{" "}
                <span className="text-slate-200 font-semibold">
                  {!hasPrice ? "?" : typeof item.ltp === "number"
                    ? item.ltp.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : item.ltp}
                </span>

                {hasPrice && item.changePercent != null && (typeof item.changePercent !== "number" || Number.isFinite(item.changePercent)) ? (
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

              </div>
            );
          })}
        </div>
      </div>

      <div role="status" className="hidden lg:flex items-center text-[11px] font-mono text-slate-400 shrink-0 pl-4 border-l border-slate-800">
        <span>{hasQuotes ? "Latest available quotes" : "Market data unavailable"}</span>
      </div>
    </div>
  );
}

export default BBTickerBar;
