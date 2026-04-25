"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchDashboardData, TradeRecord } from "@/lib/api";

type MonitorState = {
  trades: TradeRecord[];
};

function fmtDate(value: string) {
  return new Date(value).toLocaleString();
}

function fmtNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function parseIsoDate(value?: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pnlTone(value?: number | null) {
  if (value == null || value === 0) {
    return "blue";
  }
  return value > 0 ? "green" : "red";
}

export function MultiStockMonitorShell() {
  const [data, setData] = useState<MonitorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"today" | "all">("today");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const result = await fetchDashboardData();
        if (!active) {
          return;
        }
        setData({ trades: result.trades });
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load multi-stock monitor");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    const intervalId = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const todayKey = localDateKey(new Date());
  const trades = data?.trades ?? [];
  const visibleTrades = useMemo(() => {
    const rows = view === "today"
      ? trades.filter((trade) => {
          const openedAt = parseIsoDate(trade.opened_at);
          return openedAt ? localDateKey(openedAt) === todayKey : false;
        })
      : trades;
    return [...rows].sort((a, b) => {
      const left = parseIsoDate(a.opened_at)?.getTime() ?? 0;
      const right = parseIsoDate(b.opened_at)?.getTime() ?? 0;
      return right - left;
    });
  }, [todayKey, trades, view]);

  const openTrades = trades.filter((trade) => trade.status === "OPEN").length;
  const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
  const realizedPnl = closedTrades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const winTrades = closedTrades.filter((trade) => Number(trade.pnl || 0) > 0).length;
  const winRate = closedTrades.length ? (winTrades / closedTrades.length) * 100 : 0;

  const metrics = [
    { label: "Total Trades", value: fmtNumber(trades.length), tone: "" },
    { label: "Open Trades", value: fmtNumber(openTrades), tone: openTrades > 0 ? "positive" : "" },
    { label: "Closed Trades", value: fmtNumber(closedTrades.length), tone: "" },
    { label: "Realized P/L", value: fmtMoney(realizedPnl), tone: realizedPnl > 0 ? "positive" : realizedPnl < 0 ? "negative" : "" },
    { label: "Win Rate", value: `${fmtNumber(winRate)}%`, tone: winRate >= 60 ? "positive" : "" },
  ];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div className="hero-tabs">
            <Link className="hero-tab" href="/dashboard">
              Execution Desk
            </Link>
            <button
              className={`hero-tab ${view === "today" ? "active" : ""}`}
              onClick={() => setView("today")}
              type="button"
            >
              Today
            </button>
            <button
              className={`hero-tab ${view === "all" ? "active" : ""}`}
              onClick={() => setView("all")}
              type="button"
            >
              All Trades
            </button>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Multi-Stock Trade Monitor</h1>
            <p className="hero-subtitle">
              Dedicated view for trades created by the legacy multi-stock service via signal ingestion or manual trade entry.
            </p>
          </div>
          <div className="p-3">
            {loading && <div className="muted">Loading trade monitor...</div>}
            {error && <div className="alert alert-danger mb-0">{error}</div>}
            {!error && !loading && (
              <div className="row g-3">
                {metrics.map((metric) => (
                  <div className="col-12 col-sm-6 col-lg-4 col-xl" key={metric.label}>
                    <div className={`metric-card ${metric.tone} p-3`}>
                      <div className="metric-label">{metric.label}</div>
                      <div className="metric-value mt-2">{metric.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-panel">
          <h2 className="panel-title">{view === "today" ? "Today's Trades" : "All Multi-Stock Trades"}</h2>
          <div className="p-3 pb-0 small muted">
            Data comes from `/api/v1/multi-stock/trades`. Rows appear here only when the backend receives `/api/v1/multi-stock/signals` or `/api/v1/multi-stock/trades/manual` requests. This page is separate from Multi-Bot launcher jobs.
          </div>
          <div className="table-responsive">
            <table className="table table-dark-shell align-middle">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Direction</th>
                  <th>Qty</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>P/L</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                {visibleTrades.length ? (
                  visibleTrades.map((trade) => (
                    <tr key={trade.trade_id}>
                      <td>{trade.symbol}</td>
                      <td>
                        <span className={`badge-soft ${trade.direction === "LONG" ? "green" : "red"}`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td>{fmtNumber(trade.quantity)}</td>
                      <td>{fmtMoney(trade.entry_price)}</td>
                      <td>{trade.exit_price == null ? "-" : fmtMoney(trade.exit_price)}</td>
                      <td>
                        <span className={`badge-soft ${pnlTone(trade.pnl)}`}>
                          {trade.pnl == null ? "-" : fmtMoney(trade.pnl)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-soft ${trade.status === "OPEN" ? "blue" : "gold"}`}>
                          {trade.status}
                        </span>
                      </td>
                      <td>{trade.mode}</td>
                      <td>{fmtDate(trade.opened_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="empty-state">
                      {view === "today" ? "No multi-stock trades recorded for today yet." : "No multi-stock trades recorded yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
