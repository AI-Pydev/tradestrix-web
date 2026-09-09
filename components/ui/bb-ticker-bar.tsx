
export type TickerItem = {
  symbol: string;
  ltp: number | string;
  changePercent?: number | string;
  direction?: "up" | "down" | "neutral";
};

export interface BBTickerBarProps {
  items: TickerItem[];
  className?: string;
}

export function BBTickerBar({ items, className = "" }: BBTickerBarProps) {
  return (
    <div
      className={`h-10 px-4 gap-6 bg-slate-900/90 border-b border-slate-800 flex items-center overflow-x-auto whitespace-nowrap text-xs ${className}`.trim()}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
        MARKET TAPE
      </span>
      <div className="flex items-center gap-6">
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
              className="inline-flex items-center gap-2 font-mono text-xs shrink-0"
            >
              <span className="font-bold text-slate-100">{item.symbol}</span>
              <span className="text-slate-200">
                {typeof item.ltp === "number" ? item.ltp.toFixed(2) : item.ltp}
              </span>
              {item.changePercent != null ? (
                <span
                  className={`text-[10px] font-bold ${
                    isPositive
                      ? "text-emerald-400"
                      : isNegative
                      ? "text-rose-400"
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
  );
}

export default BBTickerBar;

