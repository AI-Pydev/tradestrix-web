
export function DashboardFooter() {
  return (
    <footer className="w-full pt-6 pb-4 border-t border-slate-800/80 mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
      {/* Left motto */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Markets Move. So Do You.</span>
        <span className="text-slate-600">|</span>
        <span className="text-amber-400 font-semibold">TradeStrix</span>
      </div>

      {/* Center status */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        All systems operational
      </div>

      {/* Right motto */}
      <div className="text-slate-400 tracking-wide text-center sm:text-right">
        Build. Backtest. Automate. Trade Fearlessly.
      </div>
    </footer>
  );
}

