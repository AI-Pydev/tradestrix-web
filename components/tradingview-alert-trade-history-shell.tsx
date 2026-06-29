"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchTradingViewTradeHistoryAnalytics,
  type TradingViewPnlMode,
  type TradingViewTradeHistoryAnalytics,
  type TradingViewTradeHistoryTrade,
  type UpstoxTradeHistoryBucket,
  type UpstoxTradeHistoryPoint,
} from "@/lib/api";

type ExecutionMode = "all" | TradingViewPnlMode;

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
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatNumber(value: number | null | undefined, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}+05:30`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function pnlClass(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (amount > 0) return "positive";
  if (amount < 0) return "negative";
  return "neutral";
}

function heatmapPnlClass(value: number) {
  if (value > 3000) return "profit-dark";
  if (value > 0) return "profit-light";
  if (value < -3000) return "loss-dark";
  if (value < 0) return "loss-light";
  return "neutral";
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map((part) => Number(part));
  if (!year || !month) {
    return value;
  }
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

function modeLabel(value: string) {
  if (value === "forward_test") return "Forward test";
  if (value === "live") return "Live";
  if (value === "paper") return "Paper";
  return value;
}

function buildCalendarMonths(startDate: string, endDate: string, daily: UpstoxTradeHistoryBucket[]) {
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

function EquityChart({ points }: { points: UpstoxTradeHistoryPoint[] }) {
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
      <svg aria-label="Cumulative TradingView PnL chart" className="trade-history-chart" viewBox={`0 0 ${width} ${height}`}>
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

function downloadCsv(rows: TradingViewTradeHistoryTrade[]) {
  const headers = [
    "date",
    "mode",
    "template",
    "index",
    "side",
    "trade_id",
    "entry_ltp",
    "exit_ltp",
    "status",
    "raw_pnl",
    "brokerage",
    "pnl",
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
        row.execution_mode,
        row.template_name,
        row.instrument_label,
        row.side,
        row.trade_id ?? "",
        row.entry_ltp ?? "",
        row.exit_ltp ?? "",
        row.status,
        row.raw_pnl_amount ?? "",
        row.brokerage_amount,
        row.pnl_amount ?? "",
        row.opened_at,
        row.closed_at ?? "",
        row.exit_reason ?? "",
      ]
        .map(escapeCell)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tradingview-trade-history-${marketDateKey(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function TradingViewAlertTradeHistoryShell() {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("all");
  const [instrumentKey, setInstrumentKey] = useState("all");
  const [templateId, setTemplateId] = useState("all");
  const [includeBrokerage, setIncludeBrokerage] = useState(false);
  const [brokeragePerTrade, setBrokeragePerTrade] = useState("11");
  const [selectedTradeDate, setSelectedTradeDate] = useState<string | null>(null);
  const [data, setData] = useState<TradingViewTradeHistoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchTradingViewTradeHistoryAnalytics({
          start_date: startDate,
          end_date: endDate,
          execution_mode: executionMode,
          instrument_key: instrumentKey,
          template_id: templateId,
          include_brokerage: includeBrokerage,
          brokerage_per_trade: Number(brokeragePerTrade || 0),
        });
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load TradingView trade history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [brokeragePerTrade, endDate, executionMode, includeBrokerage, instrumentKey, startDate, templateId]);

  const calendarMonths = useMemo(
    () => buildCalendarMonths(startDate, endDate, data?.daily ?? []),
    [data?.daily, endDate, startDate],
  );
  const summary = data?.summary;
  const rows = data?.trades ?? [];
  const visibleRows = selectedTradeDate ? rows.filter((row) => row.date === selectedTradeDate) : rows;

  useEffect(() => {
    setSelectedTradeDate(null);
  }, [endDate, executionMode, instrumentKey, startDate, templateId]);

  return (
    <div className="trade-history-shell">
      <section className="trade-history-toolbar">
        <label>
          <span>Start Date</span>
          <input max={endDate} onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
        </label>
        <label>
          <span>End Date</span>
          <input min={startDate} onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
        </label>
        <label>
          <span>Mode</span>
          <select onChange={(event) => setExecutionMode(event.target.value as ExecutionMode)} value={executionMode}>
            <option value="all">All Modes</option>
            <option value="paper">Paper</option>
            <option value="forward_test">Forward test</option>
            <option value="live">Live</option>
          </select>
        </label>
        <label>
          <span>Index</span>
          <select onChange={(event) => setInstrumentKey(event.target.value)} value={instrumentKey}>
            <option value="all">All Selected</option>
            {(data?.options.instruments ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Template</span>
          <select onChange={(event) => setTemplateId(event.target.value)} value={templateId}>
            <option value="all">All Selected</option>
            {(data?.options.templates ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Brokerage / Trade</span>
          <input
            min="0"
            onChange={(event) => setBrokeragePerTrade(event.target.value)}
            step="0.01"
            type="number"
            value={brokeragePerTrade}
          />
        </label>
        <button className="trade-history-download" disabled={!visibleRows.length} onClick={() => downloadCsv(visibleRows)} type="button">
          Download CSV
        </button>
      </section>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <section className="trade-history-summary">
        {[
          { label: "PnL", value: formatMoney(summary?.total_pnl), tone: pnlClass(summary?.total_pnl) },
          { label: "Brokerage", value: formatMoney(summary?.brokerage_total), tone: "neutral" },
          { label: "Closed Trades", value: String(summary?.closed_trade_count ?? 0), tone: "neutral" },
          { label: "Win Rate", value: `${formatNumber(summary?.win_rate)}%`, tone: "neutral" },
          { label: "Profit Factor", value: formatNumber(summary?.profit_factor), tone: "neutral" },
          { label: "Gross Profit", value: formatMoney(summary?.gross_profit), tone: "positive" },
          { label: "Gross Loss", value: formatMoney(summary?.gross_loss), tone: "negative" },
          { label: "Max Drawdown", value: formatMoney(summary?.max_drawdown), tone: "negative" },
        ].map((item) => (
          <div className={`trade-history-stat ${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{loading ? "-" : item.value}</strong>
          </div>
        ))}
        <label className="trade-history-toggle" title="Subtract the configured brokerage from every closed trade.">
          <input checked={includeBrokerage} onChange={(event) => setIncludeBrokerage(event.target.checked)} type="checkbox" />
          <span>Include Brokerage</span>
        </label>
      </section>

      <section className="trade-history-grid">
        <div className="trade-history-panel">
          <div className="trade-history-panel-head">
            <h2>Daily PnL</h2>
            <div className="trade-history-legend">
              <span className="profit-light">Profit to Rs 3k</span>
              <span className="profit-dark">Profit above Rs 3k</span>
              <span className="loss-light">Loss to Rs 3k</span>
              <span className="loss-dark">Loss above Rs 3k</span>
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
            <span>{executionMode === "all" ? "All modes" : modeLabel(executionMode)}</span>
          </div>
          <EquityChart points={data?.equity_curve ?? []} />
        </div>
      </section>

      <section className="trade-history-grid bottom">
        <div className="trade-history-panel">
          <div className="trade-history-panel-head">
            <h2>Monthly</h2>
            <span>{data?.monthly.length ?? 0} months</span>
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
                {(data?.monthly ?? []).map((month) => (
                  <tr key={month.month}>
                    <td>{month.month ? monthLabel(month.month) : "-"}</td>
                    <td>{month.trade_count}</td>
                    <td>{month.wins}</td>
                    <td>{month.losses}</td>
                    <td className={pnlClass(month.pnl)}>{formatMoney(month.pnl)}</td>
                  </tr>
                ))}
                {!loading && !data?.monthly.length ? (
                  <tr>
                    <td className="empty-state" colSpan={5}>
                      No closed webhook trades in this range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="trade-history-panel trade-history-trades-panel">
          <div className="trade-history-panel-head">
            <h2>Webhook Trades</h2>
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
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Index</th>
                  <th>Template</th>
                  <th>Trade</th>
                  <th>Status</th>
                  <th>PnL</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={`${row.template_id}-${row.trade_id ?? row.closed_at}`}>
                    <td>
                      <div>{row.date}</div>
                      <div className="muted small">{formatDateTime(row.closed_at || row.opened_at)}</div>
                    </td>
                    <td>{modeLabel(row.execution_mode)}</td>
                    <td>{row.instrument_label || "-"}</td>
                    <td>
                      <div>{row.template_name}</div>
                      <div className="muted small">{row.side.toUpperCase()}</div>
                    </td>
                    <td>
                      <div>{row.trade_id ?? "-"}</div>
                      <div className="muted small">
                        {row.entry_ltp == null ? "-" : row.entry_ltp.toFixed(2)}
                        {" -> "}
                        {row.exit_ltp == null ? "-" : row.exit_ltp.toFixed(2)}
                      </div>
                    </td>
                    <td>{row.status}</td>
                    <td className={pnlClass(row.pnl_amount)}>{row.pnl_amount == null ? "-" : formatMoney(row.pnl_amount)}</td>
                  </tr>
                ))}
                {!loading && visibleRows.length === 0 ? (
                  <tr>
                    <td className="empty-state" colSpan={7}>
                      No webhook trades in this range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
