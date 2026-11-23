"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

import {
  analyzeOptionDeskChain,
  emergencyStopOptionDesk,
  fetchOptionDeskJobs,
  fetchOptionDeskSummary,
  fetchOptionDeskUniverse,
  OptionDeskChainAnalyzeResponse,
  OptionDeskJob,
  OptionDeskRankedCandidate,
  OptionDeskScenarioResponse,
  OptionDeskSummary,
  OptionDeskUniverseResponse,
  runOptionDeskJob,
  simulateOptionDeskScenarios,
  squareOffOptionDeskJob,
} from "@/lib/api";

function fmtMoney(value?: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function decisionTone(decision?: string) {
  if (decision === "BUY_CE") return "green";
  if (decision === "BUY_PE") return "red";
  if (decision === "WAIT") return "gold";
  return "muted";
}

export function OptionBuyingDeskShell() {
  const [universe, setUniverse] = useState<OptionDeskUniverseResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"index" | "stock">("index");
  const [instrumentKey, setInstrumentKey] = useState("NSE_INDEX|Nifty 50");
  const [sideOverride, setSideOverride] = useState<"AUTO" | "CE" | "PE">("AUTO");
  const [budgetInr, setBudgetInr] = useState(14000);
  const [candleInterval, setCandleInterval] = useState("3");
  const [broker, setBroker] = useState<"upstox" | "kite" | "shoonya">("upstox");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");

  const [analysis, setAnalysis] = useState<OptionDeskChainAnalyzeResponse | null>(null);
  const [scenarios, setScenarios] = useState<OptionDeskScenarioResponse | null>(null);
  const [summary, setSummary] = useState<OptionDeskSummary | null>(null);
  const [jobs, setJobs] = useState<OptionDeskJob[]>([]);
  const [jobsTab, setJobsTab] = useState<"all" | "active" | "history">("all");
  const [expandedJobId, setExpandedJobId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function refreshExecutionDesk(tab: "all" | "active" | "history" = jobsTab) {
    const [sumRes, jobsRes] = await Promise.all([
      fetchOptionDeskSummary(),
      fetchOptionDeskJobs({ status_group: tab, page: 1, limit: 20 }),
    ]);
    setSummary(sumRes);
    setJobs(jobsRes.items);
  }

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        setLoading(true);
        const [uni, sumRes, jobsRes] = await Promise.all([
          fetchOptionDeskUniverse(),
          fetchOptionDeskSummary(),
          fetchOptionDeskJobs({ status_group: "all", page: 1, limit: 20 }),
        ]);
        if (!active) return;
        setUniverse(uni);
        setSummary(sumRes);
        setJobs(jobsRes.items);
        if (uni.default_budget_inr) setBudgetInr(uni.default_budget_inr);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load option universe");
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  async function handleAnalyze(overrideExpiry?: string) {
    try {
      setAnalyzing(true);
      setError("");
      const res = await analyzeOptionDeskChain({
        instrument_key: instrumentKey,
        expiry: overrideExpiry !== undefined ? overrideExpiry || null : selectedExpiry || null,
        side_override: sideOverride,
        max_premium_budget: budgetInr,
        market_data_broker: broker,
        candle_interval: candleInterval,
      });
      setAnalysis(res);
      if (res.selected_expiry) setSelectedExpiry(res.selected_expiry);

      if (res.selected_candidate && res.spot_price) {
        const sc = await simulateOptionDeskScenarios({
          spot: res.spot_price,
          strike: res.selected_candidate.strike,
          expiry: res.selected_candidate.expiry,
          option_type: res.selected_candidate.option_type,
          entry_ask: res.selected_candidate.ask_price || res.selected_candidate.ltp || 100,
          iv_pct: res.selected_candidate.iv || 15,
          lots: 1,
          lot_size: res.underlying.lot_size,
        });
        setScenarios(sc);
      } else {
        setScenarios(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Option chain analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  const availableUnderlyings =
    selectedCategory === "index" ? universe?.indices ?? [] : universe?.stocks ?? [];

  const kpis = [
    {
      label: "Directional Verdict",
      display: analysis?.decision ?? "READY",
      tone: analysis?.decision === "BUY_CE" ? "positive" : analysis?.decision === "BUY_PE" ? "negative" : "",
    },
    {
      label: "Spot Price",
      display: analysis?.spot_price ? fmtMoney(analysis.spot_price) : "—",
      tone: "",
    },
    {
      label: "Expiry Regime",
      display: analysis ? `${analysis.expiry_regime} (${analysis.dte} DTE)` : "—",
      tone: "",
    },
    {
      label: "Premium Budget Cap",
      display: fmtMoney(budgetInr),
      tone: "",
    },
    {
      label: "Selected Lot Cost",
      display: analysis?.selected_candidate ? fmtMoney(analysis.selected_candidate.lot_cost) : "—",
      tone: "",
    },
    {
      label: "Selection Score",
      display: analysis?.selected_candidate ? `${analysis.selected_candidate.selection_score}/100` : "—",
      tone: "positive",
    },
    {
      label: "Active / Open Positions",
      display: `${summary?.active_jobs ?? 0} / ${summary?.open_positions ?? 0}`,
      tone: (summary?.active_jobs ?? 0) > 0 ? "positive" : "",
    },
    {
      label: "Today Realized P/L",
      display: fmtMoney(summary?.today_realized_pnl ?? 0),
      tone: (summary?.today_realized_pnl ?? 0) > 0 ? "positive" : (summary?.today_realized_pnl ?? 0) < 0 ? "negative" : "",
    },
  ];

  async function handleExecutePaper(candidate: OptionDeskRankedCandidate) {
    if (!analysis) return;
    try {
      setError("");
      setStatusMessage("");
      const job = await runOptionDeskJob({
        instrument_key: analysis.instrument_key,
        underlying_symbol: analysis.underlying.symbol,
        option_type: candidate.option_type,
        strike: candidate.strike,
        expiry: candidate.expiry,
        moneyness: candidate.moneyness,
        entry_ask: candidate.ask_price || candidate.ltp || 100,
        lots: 1,
        lot_size: analysis.underlying.lot_size,
        target_pct: 0.35,
        sl_pct: 0.20,
        trailing_sl_pct: 0.10,
        max_premium_budget: budgetInr,
        execution_mode: "paper",
        selection_score: candidate.selection_score,
        why_selected: candidate.why_selected,
      });
      setStatusMessage(`Paper trade launched: ${job.option_symbol} @ ${fmtMoney(job.entry_price)}`);
      await refreshExecutionDesk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch paper option trade");
    }
  }

  async function handleSquareOff(jobId: string) {
    if (!window.confirm("Square off this option position?")) return;
    try {
      await squareOffOptionDeskJob(jobId);
      setStatusMessage("Option position squared off.");
      await refreshExecutionDesk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to square off position");
    }
  }

  async function handleEmergencyStop() {
    if (!window.confirm("EMERGENCY STOP: Square off ALL active option positions?")) return;
    try {
      const res = await emergencyStopOptionDesk();
      setStatusMessage(`Emergency stop executed: closed ${res.closed_count} position(s).`);
      await refreshExecutionDesk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Emergency stop failed");
    }
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div className="hero-tabs">
            <a className="hero-tab active" href="#overview">
              Overview
            </a>
            <a className="hero-tab" href="#scanner-controls">
              Intelligence &amp; Controls
            </a>
            <a className="hero-tab" href="#ranked-candidates">
              Ranked Candidates
            </a>
            <a className="hero-tab" href="#option-chain">
              Option Chain &amp; Greeks
            </a>
            <a className="hero-tab" href="#scenarios">
              Payoff &amp; Scenarios
            </a>
            <Link className="hero-tab" href="/option-buying-desk/history">
              Trade History
            </Link>
          </div>
          <div className="hero-header d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h1 className="hero-title">Intelligent Option Buying Desk</h1>
              <p className="hero-subtitle">
                Multi-factor CE/PE intelligence, Greeks &amp; IV valuation, expiry-aware strike ranking, and cost-aware risk preview.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge-soft gold">PAPER DEFAULT • LIVE GATED</span>
              <button
                className="btn btn-sm btn-danger fw-semibold"
                onClick={() => void handleEmergencyStop()}
                type="button"
              >
                Emergency Stop All
              </button>
            </div>
          </div>

          <div className="p-3" id="overview">
            {loading && <div className="muted">Loading F&amp;O universe...</div>}
            {statusMessage && <div className="alert alert-success mb-3">{statusMessage}</div>}
            {error && <div className="alert alert-danger mb-3">{error}</div>}
            {!loading && (
              <div className="row g-3">
                {kpis.map((kpi) => (
                  <div className="col-12 col-sm-6 col-lg-3" key={kpi.label}>
                    <div className={`metric-card ${kpi.tone} p-3`}>
                      <div className="metric-label">{kpi.label}</div>
                      <div className="metric-value mt-2">{kpi.display}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Controls Panel */}
        <section className="dashboard-panel mb-4" id="scanner-controls">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 className="panel-title mb-0">Market Intelligence &amp; Option Chain Analyzer</h2>
            <div className="btn-group btn-group-sm">
              <button
                className={`btn ${selectedCategory === "index" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => {
                  setSelectedCategory("index");
                  if (universe?.indices[0]) setInstrumentKey(universe.indices[0].instrument_key);
                }}
                type="button"
              >
                Indices (NIFTY / BANKNIFTY / SENSEX)
              </button>
              <button
                className={`btn ${selectedCategory === "stock" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => {
                  setSelectedCategory("stock");
                  if (universe?.stocks[0]) setInstrumentKey(universe.stocks[0].instrument_key);
                }}
                type="button"
              >
                Eligible F&amp;O Stocks
              </button>
            </div>
          </div>

          <div className="row g-3 p-2">
            <div className="col-12 col-md-4 col-xl-3">
              <label className="form-label small">Underlying</label>
              <select
                className="form-select form-select-sm"
                value={instrumentKey}
                onChange={(e) => {
                  setInstrumentKey(e.target.value);
                  setSelectedExpiry("");
                }}
              >
                {availableUnderlyings.map((item) => (
                  <option key={item.instrument_key} value={item.instrument_key}>
                    {item.symbol} — {item.label} (Lot {item.lot_size})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label small">Direction</label>
              <select
                className="form-select form-select-sm"
                value={sideOverride}
                onChange={(e) => setSideOverride(e.target.value as "AUTO" | "CE" | "PE")}
              >
                <option value="AUTO">AUTO (Confluence)</option>
                <option value="CE">Force CE</option>
                <option value="PE">Force PE</option>
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label small">Budget Cap (₹)</label>
              <input
                className="form-control form-control-sm"
                type="number"
                value={budgetInr}
                onChange={(e) => setBudgetInr(Number(e.target.value) || 14000)}
              />
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label small">Timeframe</label>
              <select
                className="form-select form-select-sm"
                value={candleInterval}
                onChange={(e) => setCandleInterval(e.target.value)}
              >
                <option value="1">1 Minute</option>
                <option value="3">3 Minutes</option>
                <option value="5">5 Minutes</option>
                <option value="15">15 Minutes</option>
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label small">Market Data</label>
              <select
                className="form-select form-select-sm"
                value={broker}
                onChange={(e) => setBroker(e.target.value as "upstox" | "kite" | "shoonya")}
              >
                <option value="upstox">Upstox</option>
                <option value="kite">Kite</option>
                <option value="shoonya">Shoonya</option>
              </select>
            </div>

            <div className="col-12 col-xl-1 d-flex align-items-end">
              <button
                className="btn btn-warning btn-sm w-100 fw-bold"
                disabled={analyzing}
                onClick={() => void handleAnalyze("")}
                type="button"
              >
                {analyzing ? "..." : "Analyze"}
              </button>
            </div>
          </div>

          {analysis && (
            <div className="mt-3 p-3 scanner-recommendation-panel rounded">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className={`badge-soft ${decisionTone(analysis.decision)}`}>
                  {analysis.decision}
                </span>
                <span className="small muted">
                  Expiry: <strong>{analysis.selected_expiry || "None"}</strong> •{" "}
                  Confidence: <strong>{Math.round((analysis.confidence ?? 0) * 100)}%</strong>
                </span>
              </div>
              <ul className="mb-0 small">
                {analysis.verdict_reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Ranked Candidates */}
        {analysis && (
          <section className="dashboard-panel mb-4" id="ranked-candidates">
            <h2 className="panel-title mb-3">Ranked Option Candidates (Best vs Rejected)</h2>
            {analysis.ranked_candidates.length === 0 ? (
              <div className="muted p-3">
                No eligible candidates passed all budget, delta, liquidity, and expiry gates.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Contract</th>
                      <th>Moneyness</th>
                      <th>Ask / LTP</th>
                      <th>Lot Cost</th>
                      <th>Delta / Theta / IV</th>
                      <th>Grade</th>
                      <th>Score</th>
                      <th>Explanation</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.ranked_candidates.map((c, idx) => (
                      <tr key={`${c.strike}-${c.option_type}`}>
                        <td className="fw-bold">#{idx + 1}</td>
                        <td className="fw-semibold">
                          {c.strike} {c.option_type} ({c.expiry})
                        </td>
                        <td>
                          <span className="badge-soft cyan">{c.moneyness}</span>
                        </td>
                        <td className="font-mono">
                          {fmtMoney(c.ask_price ?? c.ltp)}
                        </td>
                        <td className="font-mono">{fmtMoney(c.lot_cost)}</td>
                        <td className="font-mono small">
                          Δ {c.delta ?? "—"} | Θ {c.theta ?? "—"} | IV {c.iv ?? "—"}%
                        </td>
                        <td>
                          <span className="badge-soft green">{c.liquidity_grade}</span>
                        </td>
                        <td className="fw-bold text-success">{c.selection_score}</td>
                        <td className="small">{c.why_selected}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-warning fw-semibold"
                            onClick={() => void handleExecutePaper(c)}
                            type="button"
                          >
                            Paper Buy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Option Chain */}
        {analysis && analysis.chain_rows.length > 0 && (
          <section className="dashboard-panel mb-4" id="option-chain">
            <h2 className="panel-title mb-3">Intelligent Option Chain (Provenance-Tagged)</h2>
            <div className="table-responsive">
              <table className="table table-dark table-sm table-hover align-middle mb-0 font-mono small">
                <thead>
                  <tr>
                    <th>CE OI</th>
                    <th>CE IV</th>
                    <th>CE Δ</th>
                    <th>CE Ask</th>
                    <th className="text-center">STRIKE</th>
                    <th>PE Ask</th>
                    <th>PE Δ</th>
                    <th>PE IV</th>
                    <th>PE OI</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.chain_rows.slice(0, 21).map((row) => (
                    <tr key={row.strike}>
                      <td>{row.call?.oi?.toLocaleString("en-IN") ?? "—"}</td>
                      <td>{row.call?.iv ?? "—"}</td>
                      <td>{row.call?.delta ?? "—"}</td>
                      <td>{row.call?.ask_price ?? row.call?.ltp ?? "—"}</td>
                      <td className="text-center fw-bold text-warning">{row.strike}</td>
                      <td>{row.put?.ask_price ?? row.put?.ltp ?? "—"}</td>
                      <td>{row.put?.delta ?? "—"}</td>
                      <td>{row.put?.iv ?? "—"}</td>
                      <td>{row.put?.oi?.toLocaleString("en-IN") ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Scenario Payoff Preview */}
        {scenarios && (
          <section className="dashboard-panel mb-4" id="scenarios">
            <h2 className="panel-title mb-3">
              Payoff &amp; Scenario Matrix (Breakeven: {fmtMoney(scenarios.breakeven)} | Max Loss: {fmtMoney(scenarios.max_loss)})
            </h2>
            <div className="table-responsive">
              <table className="table table-dark table-sm align-middle mb-0 font-mono small">
                <thead>
                  <tr>
                    <th>Time / IV Shock</th>
                    {scenarios.payoff_curve.map((p) => (
                      <th key={p.spot_shock_pct}>
                        {p.spot_shock_pct >= 0 ? `+${p.spot_shock_pct}%` : `${p.spot_shock_pct}%`} ({p.spot_price})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scenarios.scenarios.map((s, idx) => (
                    <tr key={idx}>
                      <td>
                        +{s.hours_elapsed}h | IV {s.iv_shock_pct >= 0 ? `+${s.iv_shock_pct}%` : `${s.iv_shock_pct}%`}
                      </td>
                      {s.cells.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={cell.net_pnl >= 0 ? "text-success" : "text-danger"}
                        >
                          {fmtMoney(cell.net_pnl)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Active & Historical Option Bots */}
        <section className="dashboard-panel" id="active-bots">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 className="panel-title mb-0">Active &amp; Historical Option Trades</h2>
            <div className="btn-group btn-group-sm">
              {(["all", "active", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`btn ${jobsTab === tab ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => {
                    setJobsTab(tab);
                    void refreshExecutionDesk(tab);
                  }}
                  type="button"
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center p-4 muted">
              No option trades recorded yet. Analyze a symbol and click Paper Buy on a ranked candidate.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Contract</th>
                    <th>Mode</th>
                    <th>Entry</th>
                    <th>LTP</th>
                    <th>Target / SL</th>
                    <th>Realized P/L</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const isExpanded = expandedJobId === job.job_id;
                    return (
                      <Fragment key={job.job_id}>
                        <tr>
                          <td>
                            <span className={`badge-soft ${job.status === "running" ? "green" : "blue"}`}>
                              {job.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="fw-bold">{job.option_symbol}</div>
                            <div className="small muted">{job.moneyness} • {job.quantity} qty</div>
                          </td>
                          <td>
                            <span className="badge-soft gold">{job.execution_mode.toUpperCase()}</span>
                          </td>
                          <td className="font-mono">{fmtMoney(job.entry_price)}</td>
                          <td className="font-mono">{fmtMoney(job.current_ltp)}</td>
                          <td className="font-mono small">
                            T: {fmtMoney(job.target_price)} / SL: {fmtMoney(job.sl_price)}
                          </td>
                          <td className={`fw-bold ${job.realized_pnl >= 0 ? "text-success" : "text-danger"}`}>
                            {fmtMoney(job.realized_pnl)}
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              {job.status === "running" && (
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => void handleSquareOff(job.job_id)}
                                  type="button"
                                >
                                  Square Off
                                </button>
                              )}
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => setExpandedJobId(isExpanded ? "" : job.job_id)}
                                type="button"
                              >
                                {isExpanded ? "Hide" : "Audit"}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="bg-dark p-3 font-monospace small">
                              {job.logs.map((line, i) => (
                                <div key={i}>{line}</div>
                              ))}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
