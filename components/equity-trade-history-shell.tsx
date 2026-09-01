"use client";

import { useEffect, useMemo, useState } from "react";

import {
    EquityTradeHistoryAnalytics,
    EquityTradeHistoryBucket,
    EquityTradeHistoryPoint,
    EquityTradeHistoryTrade,
    fetchEquityTradeHistory,
} from "@/lib/api";

type ExecutionMode = "all" | "paper" | "live";
type ScopeMode = "all" | "index_bees" | "thematic_etfs" | "top_stocks";

function marketDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDateKey(value: string, days: number) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function defaultStartDate() {
  return shiftDateKey(marketDateKey(new Date()), -30);
}

function defaultEndDate() {
  return marketDateKey(new Date());
}

function formatMoney(value: number | null | undefined) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(value: number | null | undefined, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const parsed = new Date(hasTimezone ? value : `${value}+05:30`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function pnlClass(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (amount > 0) return "positive";
  if (amount < 0) return "negative";
  return "neutral";
}

function heatmapPnlClass(value: number) {
  if (value > 2000) return "profit-dark";
  if (value > 0) return "profit-light";
  if (value < -2000) return "loss-dark";
  if (value < 0) return "loss-light";
  return "flat";
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map((part) => Number(part));
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

function buildCalendarMonths(startDate: string, endDate: string, daily: EquityTradeHistoryBucket[]) {
  const dailyMap = new Map(daily.filter((item) => item.date).map((item) => [item.date as string, item]));
  const months: { key: string; label: string; days: { date: string; day: number; pnl: number; trades: number }[] }[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) {
    return months;
  }
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 7);
    let month = months.find((item) => item.key === key);
    if (!month) {
      month = { key, label: monthLabel(key), days: [] };
      months.push(month);
    }
    const date = cursor.toISOString().slice(0, 10);
    const bucket = dailyMap.get(date);
    month.days.push({
      date,
      day: cursor.getUTCDay(),
      pnl: Number(bucket?.pnl || 0),
      trades: Number(bucket?.trade_count || 0),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return months;
}

function EquityChart({ points }: { points: EquityTradeHistoryPoint[] }) {
  const width = 760;
  const height = 260;
  const padding = 32;
  const values = points.map((point) => Number(point.pnl || 0));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const span = Math.max(maxValue - minValue, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const xFor = (index: number) =>
    padding + (points.length <= 1 ? innerWidth : (index / (points.length - 1)) * innerWidth);
  const yFor = (value: number) => padding + ((maxValue - value) / span) * innerHeight;
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(1)} ${yFor(point.pnl).toFixed(1)}`)
    .join(" ");
  const zeroY = yFor(0);

  return (
    <div className="trade-history-chart-shell">
      <svg aria-label="Cumulative PnL chart" className="trade-history-chart" viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2, 3, 4].map((index) => {
          const y = padding + (index / 4) * innerHeight;
          return <line className="trade-history-chart-grid" key={index} x1={padding} x2={width - padding} y1={y} y2={y} />;
        })}
        <line className="trade-history-chart-zero" x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} />
        {path ? <path className={`trade-history-chart-line ${values.at(-1) && values.at(-1)! < 0 ? "negative" : ""}`} d={path} /> : null}
        {points.length === 0 ? (
          <text className="trade-history-chart-empty" x={width / 2} y={height / 2}>
            No closed trades
          </text>
        ) : null}
      </svg>
      <div className="trade-history-chart-scale">
        <span>{formatMoney(maxValue)}</span>
        <span>{formatMoney(minValue)}</span>
      </div>
    </div>
  );
}

function downloadCsv(rows: EquityTradeHistoryTrade[]) {
  const headers = [
    "date",
    "mode",
    "job",
    "symbol",
    "category",
    "strategy",
    "product_type",
    "quantity",
    "entry_price",
    "exit_price",
    "status",
    "raw_pnl",
    "brokerage",
    "net_pnl",
    "opened_at",
    "closed_at",
    "exit_reason",
  ];
  const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.date,
        row.trade_mode,
        row.job_name,
        row.symbol,
        row.category,
        row.strategy_id,
        row.product_type,
        row.quantity,
        row.entry_price,
        row.exit_price ?? "",
        row.status,
        row.raw_pnl ?? "",
        row.brokerage,
        row.net_pnl ?? "",
        row.opened_at,
        row.closed_at ?? "",
        row.exit_reason ?? "",
      ]
        .map(escapeCell)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `equity_trade_history_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function EquityTradeHistoryShell() {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("all");
  const [categoryFilter, setCategoryFilter] = useState<ScopeMode>("all");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [selectedTradeDate, setSelectedTradeDate] = useState<string | null>(null);
  const [data, setData] = useState<EquityTradeHistoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchEquityTradeHistory({
          start_date: startDate,
          end_date: endDate,
          execution_mode: executionMode,
          category: categoryFilter,
          strategy_id: strategyFilter,
        });
        if (!cancelled) {
          setData(res);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load trade history");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [categoryFilter, endDate, executionMode, startDate, strategyFilter]);

  const calendarMonths = useMemo(
    () => buildCalendarMonths(startDate, endDate, data?.daily_buckets ?? []),
    [data?.daily_buckets, endDate, startDate],
  );
  const summary = data?.summary;
  const rows = data?.trades ?? [];
  const visibleRows = selectedTradeDate ? rows.filter((row) => row.date === selectedTradeDate) : rows;

  useEffect(() => {
    setSelectedTradeDate(null);
  }, [categoryFilter, endDate, executionMode, startDate, strategyFilter]);

  return (
    <main className="trade-history-shell">
      {/* Top Filter Bar */}
      <section className="trade-history-toolbar">
        <div className="trade-history-scope">
          <button
            className={categoryFilter === "all" ? "active" : ""}
            onClick={() => setCategoryFilter("all")}
            type="button"
          >
            All Universe
          </button>
          <button
            className={categoryFilter === "index_bees" ? "active" : ""}
            onClick={() => setCategoryFilter("index_bees")}
            type="button"
          >
            Index BeES
          </button>
          <button
            className={categoryFilter === "thematic_etfs" ? "active" : ""}
            onClick={() => setCategoryFilter("thematic_etfs")}
            type="button"
          >
            ETFs
          </button>
          <button
            className={categoryFilter === "top_stocks" ? "active" : ""}
            onClick={() => setCategoryFilter("top_stocks")}
            type="button"
          >
            Nifty 50 Stocks
          </button>
        </div>

        <label>
          <span>Start Date</span>
          <input
            max={endDate}
            onChange={(event) => setStartDate(event.target.value)}
            type="date"
            value={startDate}
          />
        </label>

        <label>
          <span>End Date</span>
          <input
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
            type="date"
            value={endDate}
          />
        </label>

        <label>
          <span>Mode</span>
          <select
            onChange={(event) => setExecutionMode(event.target.value as ExecutionMode)}
            value={executionMode}
          >
            <option value="all">Paper + Live</option>
            <option value="paper">Paper</option>
            <option value="live">Live</option>
          </select>
        </label>

        <label>
          <span>Strategy</span>
          <select
            onChange={(event) => setStrategyFilter(event.target.value)}
            value={strategyFilter}
          >
            <option value="all">All Strategies</option>
            <option value="bees_rsi_dip">BeES RSI Dip Buyer</option>
            <option value="equity_trend_momentum">Trend Momentum</option>
            <option value="equity_sr_breakout">S/R Breakout</option>
            <option value="equity_fibo_pullback">Fibonacci Pullback</option>
            <option value="equity_opportunity_score">Opportunity Score</option>
          </select>
        </label>

        <button
          className="trade-history-download"
          disabled={!visibleRows.length}
          onClick={() => downloadCsv(visibleRows)}
          type="button"
        >
          Download CSV
        </button>
      </section>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {/* KPI Metric Summary Strip */}
      <section className="trade-history-summary">
        {[
          { label: "PnL", value: formatMoney(summary?.total_pnl), tone: pnlClass(summary?.total_pnl) },
          { label: "Closed Trades", value: String(summary?.total_trades ?? 0), tone: "neutral" },
          { label: "Win Rate", value: `${formatNumber(summary?.win_rate)}%`, tone: "neutral" },
          { label: "Profit Factor", value: formatNumber(summary?.profit_factor), tone: "neutral" },
          { label: "Gross Profit", value: formatMoney(summary?.gross_profit), tone: "positive" },
          { label: "Gross Loss", value: formatMoney(summary?.gross_loss), tone: "negative" },
          { label: "Avg Trade PnL", value: formatMoney(summary?.average_trade_pnl), tone: pnlClass(summary?.average_trade_pnl) },
        ].map((item) => (
          <div className={`trade-history-stat ${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{loading ? "-" : item.value}</strong>
          </div>
        ))}
      </section>

      {/* Grid: Daily Heatmap Calendar & Cumulative Equity Chart */}
      <section className="trade-history-grid">
        <div className="trade-history-panel">
          <div className="trade-history-panel-head">
            <h2>Daily PnL</h2>
            <div className="trade-history-legend">
              <span className="profit-light">Profit to Rs 2k</span>
              <span className="profit-dark">Profit above Rs 2k</span>
              <span className="loss-light">Loss to Rs 2k</span>
              <span className="loss-dark">Loss above Rs 2k</span>
              <span className="flat">Breakeven</span>
            </div>
          </div>
          <div className="trade-history-calendar">
            {calendarMonths.map((month) => (
              <div className="trade-history-month" key={month.key}>
                <div className="trade-history-month-title">{month.label}</div>
                <div className="trade-history-weekdays">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <span key={`${day}-${index}`}>{day}</span>
                  ))}
                </div>
                <div className="trade-history-days">
                  {Array.from({ length: month.days[0]?.day ?? 0 }).map((_, index) => (
                    <span className="trade-history-day empty" key={`empty-${index}`} />
                  ))}
                  {month.days.map((day) => (
                    <button
                      aria-label={`${day.date}: ${formatMoney(day.pnl)}, ${day.trades} trades`}
                      className={`trade-history-day ${day.trades ? heatmapPnlClass(day.pnl) : "empty"} ${selectedTradeDate === day.date ? "selected" : ""}`}
                      disabled={!day.trades}
                      key={day.date}
                      onClick={() => setSelectedTradeDate((current) => (current === day.date ? null : day.date))}
                      title={`${day.date}: ${formatMoney(day.pnl)} (${day.trades} trades)`}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="trade-history-panel">
          <div className="trade-history-panel-head">
            <h2>Cumulative PnL</h2>
            <span>{executionMode === "all" ? "Paper + Live" : executionMode}</span>
          </div>
          <EquityChart points={data?.equity_points ?? []} />
        </div>
      </section>

      {/* Bottom Grid: Monthly Breakdown & Trade Ledger */}
      <section className="trade-history-grid bottom">
        <div className="trade-history-panel">
          <div className="trade-history-panel-head">
            <h2>Monthly</h2>
            <span>{data?.monthly_buckets.length ?? 0} months</span>
          </div>
          <div className="table-responsive">
            <table className="table table-dark-shell">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Trades</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>PnL</th>
                </tr>
              </thead>
              <tbody>
                {(data?.monthly_buckets ?? []).map((month) => (
                  <tr key={month.month}>
                    <td>{month.month ? monthLabel(month.month) : "-"}</td>
                    <td>{month.trade_count}</td>
                    <td>{month.wins}</td>
                    <td>{month.losses}</td>
                    <td className={pnlClass(month.pnl)}>{formatMoney(month.pnl)}</td>
                  </tr>
                ))}
                {!loading && !data?.monthly_buckets.length ? (
                  <tr>
                    <td className="empty-state" colSpan={5}>
                      No closed trades in this range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="trade-history-panel trade-history-trades-panel">
          <div className="trade-history-panel-head">
            <h2>Trades</h2>
            <div className="trade-history-table-filter">
              <span>{visibleRows.length} rows{selectedTradeDate ? ` on ${selectedTradeDate}` : ""}</span>
              {selectedTradeDate ? (
                <button onClick={() => setSelectedTradeDate(null)} type="button">
                  Clear day
                </button>
              ) : null}
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-dark-shell">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Symbol</th>
                  <th>Category</th>
                  <th>Strategy</th>
                  <th>Mode</th>
                  <th>Entry / Exit</th>
                  <th>Exit Reason</th>
                  <th>Net PnL</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={`${row.job_id}-${row.id}`}>
                    <td>
                      <div>{row.date}</div>
                      <div className="muted small">{formatDateTime(row.closed_at || row.opened_at)}</div>
                    </td>
                    <td>
                      <div className="fw-bold">{row.symbol}</div>
                      <div className="muted small">{row.product_type} • Qty {row.quantity}</div>
                    </td>
                    <td>{row.category}</td>
                    <td>{row.strategy_label || row.strategy_id}</td>
                    <td>{row.trade_mode.toUpperCase()}</td>
                    <td>
                      <div>{formatMoney(row.entry_price)}</div>
                      <div className="muted small">{row.exit_price ? formatMoney(row.exit_price) : "-"}</div>
                    </td>
                    <td>{row.exit_reason || row.status}</td>
                    <td className={pnlClass(row.net_pnl)}>
                      {row.net_pnl == null ? "-" : formatMoney(row.net_pnl)}
                    </td>
                  </tr>
                ))}
                {!loading && visibleRows.length === 0 ? (
                  <tr>
                    <td className="empty-state" colSpan={8}>
                      No trade rows match this scope.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
