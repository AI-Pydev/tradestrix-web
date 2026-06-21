"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  getStrategyAnalysis,
  listStrategyAnalyses,
  runStrategyAnalysis,
  StrategyAnalysis,
  StrategyAnalysisRequest,
} from "@/lib/api";

const STRATEGIES = [
  { id: "fibo_nk_call", label: "FIBO-NK CALL", side: "call" },
  { id: "fibo_nk_put", label: "FIBO-NK PUT", side: "put" },
  { id: "tv_ha_call_v2", label: "TV-HA CALL v2", side: "call" },
  { id: "tv_ha_put_v2", label: "TV-HA PUT v2", side: "put" },
  { id: "advanced_index_call", label: "Advanced Index CALL", side: "call" },
] as const;

const PROVIDERS = ["upstox", "kite", "dhan"] as const;

// label → underlying_interval (minutes). The backend derives "3m" etc. from this.
const TIMEFRAMES = [
  { label: "1m", interval: "1" },
  { label: "3m", interval: "3" },
  { label: "5m", interval: "5" },
  { label: "15m", interval: "15" },
] as const;

function defaultRequest(): StrategyAnalysisRequest {
  return {
    strategy_id: "fibo_nk_call",
    side: "call",
    instrument_key: "NSE_INDEX|Nifty 50",
    from_date: "2026-06-01",
    to_date: "2026-06-18",
    underlying_unit: "minutes",
    underlying_interval: "3",
    market_data_broker: "upstox",
    fallback_broker: "kite",
  };
}

function fmtMoney(value?: number | null) {
  if (value === undefined || value === null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

export function ResearchAgentShell() {
  const [form, setForm] = useState<StrategyAnalysisRequest>(defaultRequest);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<StrategyAnalysis | null>(null);
  const [history, setHistory] = useState<StrategyAnalysis[]>([]);

  async function refreshHistory() {
    try {
      setHistory(await listStrategyAnalyses());
    } catch {
      // history is best-effort; ignore load errors
    }
  }

  useEffect(() => {
    void refreshHistory();
  }, []);

  function update<K extends keyof StrategyAnalysisRequest>(
    key: K,
    value: StrategyAnalysisRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onStrategyChange(strategyId: string) {
    const meta = STRATEGIES.find((s) => s.id === strategyId);
    setForm((prev) => ({
      ...prev,
      strategy_id: strategyId,
      side: (meta?.side as "call" | "put") ?? prev.side,
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await runStrategyAnalysis(form);
      setResult(res);
      void refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setRunning(false);
    }
  }

  async function onOpenHistory(id?: number) {
    if (!id) return;
    setError("");
    try {
      setResult(await getStrategyAnalysis(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analysis.");
    }
  }

  const m = result?.metrics;

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero platform-hero mb-4">
          <div className="hero-header">
            <h1 className="hero-title">AI Research Agent</h1>
            <p className="hero-subtitle">
              Run a live backtest for a strategy and have the AI analyst diagnose
              its losing trades and recommend measurable improvements. Analysis
              only — nothing is applied to live trading.
            </p>
          </div>
        </section>

        {/* ── Run form ───────────────────────────────────────────── */}
        <section className="card" style={{ padding: 20, marginBottom: 20 }}>
          <form
            onSubmit={onSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 14,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 4 }}>
              <span>Strategy</span>
              <select
                value={form.strategy_id}
                onChange={(e) => onStrategyChange(e.target.value)}
              >
                {STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Side</span>
              <select
                value={form.side}
                onChange={(e) =>
                  update("side", e.target.value as "call" | "put")
                }
              >
                <option value="call">CALL</option>
                <option value="put">PUT</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Timeframe</span>
              <select
                value={form.underlying_interval ?? "3"}
                onChange={(e) =>
                  update("underlying_interval", e.target.value)
                }
              >
                {TIMEFRAMES.map((t) => (
                  <option key={t.interval} value={t.interval}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>From date</span>
              <input
                type="date"
                value={form.from_date}
                onChange={(e) => update("from_date", e.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>To date</span>
              <input
                type="date"
                value={form.to_date}
                onChange={(e) => update("to_date", e.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Data provider</span>
              <select
                value={form.market_data_broker}
                onChange={(e) =>
                  update(
                    "market_data_broker",
                    e.target.value as "dhan" | "kite" | "upstox",
                  )
                }
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Fallback provider</span>
              <select
                value={form.fallback_broker ?? ""}
                onChange={(e) =>
                  update(
                    "fallback_broker",
                    (e.target.value || null) as
                      | "dhan"
                      | "kite"
                      | "upstox"
                      | null,
                  )
                }
              >
                <option value="">none</option>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={running} className="btn-primary">
              {running ? "Analyzing…" : "Run Analysis"}
            </button>
          </form>
          <p style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
            Note: NIFTY option data serves from ~May 2026 — earlier windows may
            return zero trades. A run executes a full backtest, so it can take a
            minute.
          </p>
          {error ? (
            <p style={{ color: "#e5484d", marginTop: 10 }}>{error}</p>
          ) : null}
        </section>

        {/* ── Result ─────────────────────────────────────────────── */}
        {result ? (
          <section className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 14,
              }}
            >
              <Metric label="Strategy" value={`${result.strategy_id} / ${result.side}`} />
              <Metric label="Timeframe" value={result.timeframe ?? "—"} />
              <Metric label="Trades" value={String(m?.total_trades ?? "—")} />
              <Metric label="Net PnL" value={fmtMoney(m?.net_pnl)} />
              <Metric label="Win rate" value={m?.win_rate != null ? `${m.win_rate}%` : "—"} />
              <Metric label="Profit factor" value={String(m?.profit_factor ?? "—")} />
              <Metric label="Max DD" value={fmtMoney(m?.drawdown)} />
              <Metric
                label="Provider"
                value={`${result.provider ?? "?"} (${result.model ?? "?"})`}
              />
            </div>
            {result.usage?.truncated ? (
              <p
                style={{
                  color: "#f5a623",
                  marginTop: 0,
                  marginBottom: 12,
                  fontSize: 13,
                }}
              >
                ⚠ Output was truncated (hit the token limit). Raise the model
                token budget or narrow the analysis.
              </p>
            ) : null}
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "rgba(0,0,0,0.25)",
                padding: 16,
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {result.analysis}
            </pre>
          </section>
        ) : null}

        {/* ── History ────────────────────────────────────────────── */}
        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Analysis History</h2>
          {history.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No analyses yet. Run one above.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.7 }}>
                  <th style={{ padding: "6px 8px" }}>When</th>
                  <th style={{ padding: "6px 8px" }}>Strategy</th>
                  <th style={{ padding: "6px 8px" }}>TF</th>
                  <th style={{ padding: "6px 8px" }}>Window</th>
                  <th style={{ padding: "6px 8px" }}>Provider</th>
                  <th style={{ padding: "6px 8px" }}>Trades</th>
                  <th style={{ padding: "6px 8px" }}>Net PnL</th>
                  <th style={{ padding: "6px 8px" }} />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <td style={{ padding: "6px 8px" }}>
                      {h.created_at?.slice(0, 16).replace("T", " ") ?? "—"}
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      {h.strategy_id} / {h.side}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{h.timeframe ?? "—"}</td>
                    <td style={{ padding: "6px 8px" }}>
                      {h.from_date} → {h.to_date}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{h.market_data_broker}</td>
                    <td style={{ padding: "6px 8px" }}>{h.trade_count}</td>
                    <td style={{ padding: "6px 8px" }}>
                      {fmtMoney(h.metrics?.net_pnl)}
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <button
                        type="button"
                        onClick={() => onOpenHistory(h.id)}
                        className="btn-secondary"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
