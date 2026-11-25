"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchOptionDeskTradeHistory, OptionDeskTradeHistoryResponse } from "@/lib/api";

function fmtMoney(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function OptionBuyingDeskHistoryPage() {
  const [data, setData] = useState<OptionDeskTradeHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetchOptionDeskTradeHistory();
        if (active) setData(res);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div className="hero-tabs">
            <Link className="hero-tab" href="/option-buying-desk">
              ← Back to Option Buying Desk
            </Link>
            <span className="hero-tab active">Trade History</span>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Option Buying Desk — Trade History &amp; Audit</h1>
            <p className="hero-subtitle">
              Net P&amp;L after transaction charges, moneyness breakdown, and exit reasons.
            </p>
          </div>
          {data && (
            <div className="p-3">
              <div className="row g-3">
                <div className="col-6 col-md-3">
                  <div className="metric-card p-3">
                    <div className="metric-label">Closed Trades</div>
                    <div className="metric-value mt-2">{data.summary.total_trades}</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="metric-card p-3">
                    <div className="metric-label">Wins / Losses</div>
                    <div className="metric-value mt-2">
                      {data.summary.wins} / {data.summary.losses}
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="metric-card p-3">
                    <div className="metric-label">Win Rate</div>
                    <div className="metric-value mt-2">{data.summary.win_rate}%</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className={`metric-card ${data.summary.net_pnl >= 0 ? "positive" : "negative"} p-3`}>
                    <div className="metric-label">Net Realized P/L</div>
                    <div className="metric-value mt-2">{fmtMoney(data.summary.net_pnl)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-panel">
          {loading && <div className="p-3 muted">Loading option trade history...</div>}
          {error && <div className="alert alert-danger m-3">{error}</div>}
          {!loading && data && (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Contract</th>
                    <th>Moneyness</th>
                    <th>Mode</th>
                    <th>Qty</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Charges</th>
                    <th>Net P/L</th>
                    <th>Exit Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trades.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.option_symbol}</td>
                      <td><span className="badge-soft cyan">{t.moneyness}</span></td>
                      <td><span className="badge-soft gold">{t.execution_mode.toUpperCase()}</span></td>
                      <td className="font-mono">{t.quantity}</td>
                      <td className="font-mono">{fmtMoney(t.entry_price)}</td>
                      <td className="font-mono">{t.exit_price ? fmtMoney(t.exit_price) : "—"}</td>
                      <td className="font-mono">{fmtMoney(t.charges)}</td>
                      <td className={`fw-bold ${t.net_pnl >= 0 ? "text-success" : "text-danger"}`}>
                        {fmtMoney(t.net_pnl)}
                      </td>
                      <td className="small">{t.exit_reason || t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
