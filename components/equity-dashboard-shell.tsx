"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

import {
    bulkDeleteEquityJobs,
    deleteAllEquityHistory,
    deleteEquityJob,
    disableEquityAutoLaunch,
    enableEquityAutoLaunch,
    EquityAutoLaunchStatus,
    EquityBotRunRequest,
    EquityCatalogResponse,
    EquityDashboardSummary,
    EquityInstrumentItem,
    EquityManagedJob,
    EquityStrategyItem,
    fetchEquityAutoLaunchStatus,
    fetchEquityCatalog,
    fetchEquityDashboardJobs,
    fetchEquityDashboardSummary,
    fetchEquityStrategies,
    launchNifty50PaperFleet,
    squareOffEquityJob,
    squareOffNifty50PaperFleet,
    startEquityBot,
    stopEquityJob,
    stopNifty50PaperFleet
} from "@/lib/api";

const REFRESH_INTERVAL_MS = 8000;

function fmtMoney(value?: number | null) {
  if (value == null) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function metricTone(label: string, value: number) {
  if ((label === "Active Jobs" || label === "Open Bot Trades") && value > 0) return "positive";
  if ((label === "Today Realized P/L" || label === "Fleet Realized P/L" || label === "Gross Profit") && value > 0) return "positive";
  if ((label === "Today Realized P/L" || label === "Fleet Realized P/L" || label === "Gross Loss") && value < 0) return "negative";
  return "";
}

function jobStatusTone(status: string) {
  if (status === "running") return "green";
  if (status === "completed") return "blue";
  if (status === "starting" || status === "stopping") return "gold";
  if (status === "failed") return "red";
  return "muted";
}

function pnlTone(value?: number | null) {
  if (value == null || value === 0) return "";
  return value > 0 ? "positive" : "negative";
}

export function EquityDashboardShell() {
  const [catalog, setCatalog] = useState<EquityCatalogResponse | null>(null);
  const [strategies, setStrategies] = useState<EquityStrategyItem[]>([]);
  const [summary, setSummary] = useState<EquityDashboardSummary | null>(null);
  const [autoStatus, setAutoStatus] = useState<EquityAutoLaunchStatus | null>(null);
  const [jobs, setJobs] = useState<EquityManagedJob[]>([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");

  // Nifty 50 Fleet Config State
  const [fleetStrategy, setFleetStrategy] = useState("equity_trend_momentum");
  const [fleetInterval, setFleetInterval] = useState("3");
  const [fleetTargetPct, setFleetTargetPct] = useState(2.0);
  const [fleetSlPct, setFleetSlPct] = useState(1.5);
  const [fleetCapital, setFleetCapital] = useState(10000);
  const [fleetActionLoading, setFleetActionLoading] = useState(false);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<"index_bees" | "thematic_etfs" | "top_stocks">("index_bees");
  const [form, setForm] = useState<EquityBotRunRequest>({
    instrument_key: "NSE_EQ|INE749A01020",
    symbol: "NIFTYBEES",
    strategy_id: "bees_rsi_dip",
    execution_mode: "paper",
    execution_broker: "kotak_neo",
    product_type: "CNC",
    sizing_mode: "capital",
    allocated_capital: 10000,
    quantity: 35,
    candle_interval: "3",
    candle_unit: "minutes",
    target_pct: 1.5,
    target_points: null,
    sl_pct: 1.5,
    trailing_sl_pct: null,
    allow_no_sl: false,
    market_data_broker: "upstox",
    poll_interval_sec: 10,
    job_name: "",
  });

  const [activeTab, setActiveTab] = useState<"all" | "active" | "history">("all");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string>("");
  const [launching, setLaunching] = useState(false);
  const [actionInProgress, setActionInProgress] = useState("");

  // Load Catalog & Initial Data
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        setLoading(true);
        const [catRes, stratRes, sumRes, autoRes, jobsRes] = await Promise.all([
          fetchEquityCatalog(),
          fetchEquityStrategies(),
          fetchEquityDashboardSummary(),
          fetchEquityAutoLaunchStatus(),
          fetchEquityDashboardJobs({ status_group: activeTab, page: 1, limit: 20 }),
        ]);
        if (!active) return;
        setCatalog(catRes);
        setStrategies(stratRes);
        setSummary(sumRes);
        setAutoStatus(autoRes);
        setJobs(jobsRes.items);
        setTotalJobsCount(jobsRes.total_count);
        setTotalPages(jobsRes.total_pages);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load equity desk");
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  // Periodic Refresh
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const [sumRes, autoRes, jobsRes] = await Promise.all([
          fetchEquityDashboardSummary(),
          fetchEquityAutoLaunchStatus(),
          fetchEquityDashboardJobs({ status_group: activeTab, page: currentPage, limit: 20 }),
        ]);
        if (!active) return;
        setSummary(sumRes);
        setAutoStatus(autoRes);
        setJobs(jobsRes.items);
        setTotalJobsCount(jobsRes.total_count);
        setTotalPages(jobsRes.total_pages);
      } catch {
        // quiet error on periodic poll
      }
    }
    const interval = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeTab, currentPage]);

  async function handleTabChange(tab: "all" | "active" | "history") {
    setActiveTab(tab);
    setCurrentPage(1);
    try {
      setJobsLoading(true);
      const res = await fetchEquityDashboardJobs({ status_group: tab, page: 1, limit: 20 });
      setJobs(res.items);
      setTotalJobsCount(res.total_count);
      setTotalPages(res.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setJobsLoading(false);
    }
  }

  function handleInstrumentSelect(item: EquityInstrumentItem) {
    setForm((prev) => ({
      ...prev,
      instrument_key: item.instrument_key,
      symbol: item.symbol,
      quantity: Math.max(1, Math.floor(prev.allocated_capital / (item.symbol.includes("BEES") ? 280 : 1500))),
    }));
  }

  async function handleLaunchBot() {
    try {
      setLaunching(true);
      setStatusMessage("");
      setError("");
      const res = await startEquityBot(form);
      setStatusMessage(`🚀 Equity bot "${res.job_name}" launched successfully in ${form.execution_mode.toUpperCase()} mode.`);
      setStatusTone("success");
      const [sumRes, jobsRes] = await Promise.all([
        fetchEquityDashboardSummary(),
        fetchEquityDashboardJobs({ status_group: activeTab, page: 1, limit: 20 }),
      ]);
      setSummary(sumRes);
      setJobs(jobsRes.items);
      setTotalJobsCount(jobsRes.total_count);
      setTotalPages(jobsRes.total_pages);
      setExpandedJobId(res.job_id);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to launch equity bot");
      setStatusTone("error");
    } finally {
      setLaunching(false);
    }
  }

  // Nifty 50 Fleet Handlers
  async function handleToggleAutoPilot() {
    try {
      setFleetActionLoading(true);
      if (autoStatus?.enabled) {
        const res = await disableEquityAutoLaunch();
        setAutoStatus(res);
        setStatusMessage("Auto-Pilot disabled.");
        setStatusTone("success");
      } else {
        const res = await enableEquityAutoLaunch();
        setAutoStatus(res);
        setStatusMessage("⚡ Nifty 50 Auto-Pilot enabled! Continuous paper trading loop active.");
        setStatusTone("success");
      }
      const [sumRes, jobsRes] = await Promise.all([
        fetchEquityDashboardSummary(),
        fetchEquityDashboardJobs({ status_group: activeTab, page: 1, limit: 20 }),
      ]);
      setSummary(sumRes);
      setJobs(jobsRes.items);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to toggle auto-pilot");
      setStatusTone("error");
    } finally {
      setFleetActionLoading(false);
    }
  }

  async function handleLaunchFullFleet() {
    try {
      setFleetActionLoading(true);
      const res = await launchNifty50PaperFleet({
        strategy_id: fleetStrategy,
        candle_interval: fleetInterval,
        target_pct: fleetTargetPct,
        sl_pct: fleetSlPct,
        allocated_capital: fleetCapital,
      });
      setStatusMessage(`⚡ Launched ${res.launched_count} Nifty 50 paper bots (${res.already_active_count} already active).`);
      setStatusTone("success");
      const [sumRes, autoRes, jobsRes] = await Promise.all([
        fetchEquityDashboardSummary(),
        fetchEquityAutoLaunchStatus(),
        fetchEquityDashboardJobs({ status_group: activeTab, page: 1, limit: 20 }),
      ]);
      setSummary(sumRes);
      setAutoStatus(autoRes);
      setJobs(jobsRes.items);
      setTotalJobsCount(jobsRes.total_count);
      setTotalPages(jobsRes.total_pages);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to launch Nifty 50 fleet");
      setStatusTone("error");
    } finally {
      setFleetActionLoading(false);
    }
  }

  async function handleStopFleet() {
    if (!window.confirm("Stop all active Nifty 50 paper bots?")) return;
    try {
      setFleetActionLoading(true);
      const res = await stopNifty50PaperFleet();
      setStatusMessage(`Stopped ${res.stopped_count} Nifty 50 bots.`);
      setStatusTone("success");
      const [sumRes, autoRes, jobsRes] = await Promise.all([
        fetchEquityDashboardSummary(),
        fetchEquityAutoLaunchStatus(),
        fetchEquityDashboardJobs({ status_group: activeTab, page: currentPage, limit: 20 }),
      ]);
      setSummary(sumRes);
      setAutoStatus(autoRes);
      setJobs(jobsRes.items);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to stop fleet");
      setStatusTone("error");
    } finally {
      setFleetActionLoading(false);
    }
  }

  async function handleSquareOffFleet() {
    if (!window.confirm("Square off all open positions across Nifty 50 bots?")) return;
    try {
      setFleetActionLoading(true);
      const res = await squareOffNifty50PaperFleet();
      setStatusMessage(`Squared off ${res.squared_off_count} open Nifty 50 positions.`);
      setStatusTone("success");
      const [sumRes, autoRes, jobsRes] = await Promise.all([
        fetchEquityDashboardSummary(),
        fetchEquityAutoLaunchStatus(),
        fetchEquityDashboardJobs({ status_group: activeTab, page: currentPage, limit: 20 }),
      ]);
      setSummary(sumRes);
      setAutoStatus(autoRes);
      setJobs(jobsRes.items);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to square off fleet");
      setStatusTone("error");
    } finally {
      setFleetActionLoading(false);
    }
  }

  async function handleSquareOff(jobId: string) {
    if (!window.confirm("Square off this open position immediately at market price?")) return;
    try {
      setActionInProgress(`square-off:${jobId}`);
      await squareOffEquityJob(jobId);
      setStatusMessage(`Position squared off successfully.`);
      setStatusTone("success");
      const [sumRes, jobsRes] = await Promise.all([
        fetchEquityDashboardSummary(),
        fetchEquityDashboardJobs({ status_group: activeTab, page: currentPage, limit: 20 }),
      ]);
      setSummary(sumRes);
      setJobs(jobsRes.items);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to square off position");
      setStatusTone("error");
    } finally {
      setActionInProgress("");
    }
  }

  async function handleStopJob(jobId: string) {
    try {
      setActionInProgress(`stop:${jobId}`);
      await stopEquityJob(jobId);
      setStatusMessage(`Bot stopped.`);
      setStatusTone("success");
      const jobsRes = await fetchEquityDashboardJobs({ status_group: activeTab, page: currentPage, limit: 20 });
      setJobs(jobsRes.items);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to stop bot");
      setStatusTone("error");
    } finally {
      setActionInProgress("");
    }
  }

  async function handleDeleteJob(jobId: string) {
    if (!window.confirm("Delete this historical job log?")) return;
    try {
      setActionInProgress(`delete:${jobId}`);
      await deleteEquityJob(jobId);
      setStatusMessage(`Job deleted.`);
      setStatusTone("success");
      const jobsRes = await fetchEquityDashboardJobs({ status_group: activeTab, page: currentPage, limit: 20 });
      setJobs(jobsRes.items);
      setSelectedJobIds((prev) => prev.filter((id) => id !== jobId));
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to delete job");
      setStatusTone("error");
    } finally {
      setActionInProgress("");
    }
  }

  async function handleBulkDelete() {
    if (!selectedJobIds.length) return;
    if (!window.confirm(`Delete ${selectedJobIds.length} selected historical job(s)?`)) return;
    try {
      setActionInProgress("bulk-delete");
      const res = await bulkDeleteEquityJobs(selectedJobIds);
      setStatusMessage(`Bulk deleted ${res.deleted_count} job(s).`);
      setStatusTone("success");
      setSelectedJobIds([]);
      const jobsRes = await fetchEquityDashboardJobs({ status_group: activeTab, page: 1, limit: 20 });
      setJobs(jobsRes.items);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to bulk delete");
      setStatusTone("error");
    } finally {
      setActionInProgress("");
    }
  }

  async function handleClearAllHistory() {
    if (!window.confirm("Clear all completed/stopped historical logs?")) return;
    try {
      setActionInProgress("clear-all");
      const res = await deleteAllEquityHistory();
      setStatusMessage(`Cleared ${res.deleted_count} historical job(s).`);
      setStatusTone("success");
      setSelectedJobIds([]);
      const jobsRes = await fetchEquityDashboardJobs({ status_group: activeTab, page: 1, limit: 20 });
      setJobs(jobsRes.items);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to clear history");
      setStatusTone("error");
    } finally {
      setActionInProgress("");
    }
  }

  const categoryInstruments = catalog ? catalog[selectedCategory] || [] : [];
  const selectedInstrument = catalog?.all_items.find((i) => i.instrument_key === form.instrument_key);

  const kpis = [
    { label: "Managed Jobs", value: summary?.managed_jobs ?? 0, display: String(summary?.managed_jobs ?? 0) },
    { label: "Active Jobs", value: summary?.active_jobs ?? 0, display: String(summary?.active_jobs ?? 0) },
    { label: "Open Bot Trades", value: summary?.open_trades ?? 0, display: String(summary?.open_trades ?? 0) },
    { label: "Total Investment", value: summary?.total_investment ?? 0, display: fmtMoney(summary?.total_investment) },
    { label: "Today Realized P/L", value: summary?.today_realized_pnl ?? 0, display: fmtMoney(summary?.today_realized_pnl) },
    { label: "Gross Profit", value: summary?.gross_profit ?? 0, display: fmtMoney(summary?.gross_profit) },
    { label: "Gross Loss", value: summary?.gross_loss ?? 0, display: fmtMoney(summary?.gross_loss) },
    { label: "Win Rate", value: summary?.win_rate ?? 0, display: `${summary?.win_rate ?? 0}%` },
  ];

  return (
    <main className="app-shell">
      <div className="app-frame">
        {/* Top Hero Section */}
        <section className="app-hero mb-4">
          <div className="hero-tabs">
            <a className="hero-tab active" href="#overview">
              Overview
            </a>
            <a className="hero-tab" href="#nifty-fleet">
              Nifty 50 Fleet
            </a>
            <a className="hero-tab" href="#launch-panel">
              Single Bot Control
            </a>
            <Link className="hero-tab" href="/equity-trade-history">
              Trade History
            </Link>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Stock, ETF & Index BeES Desk</h1>
            <p className="hero-subtitle">
              Autonomous execution desk for Cash Equities, Sector ETFs, and Index BeES. Strategies act as automated decision makers with target profit booking.
            </p>
          </div>

          <div className="p-3">
            {loading && <div className="muted">Loading equity desk telemetry...</div>}
            {error && <div className="alert alert-danger mb-0">{error}</div>}
            {!loading && (
              <div className="row g-3">
                {kpis.map((kpi) => (
                  <div className="col-12 col-sm-6 col-lg-3" key={kpi.label}>
                    <div className={`metric-card ${metricTone(kpi.label, kpi.value)} p-3`}>
                      <div className="metric-label">{kpi.label}</div>
                      <div className="metric-value mt-2">{kpi.display}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* NIFTY 50 AUTO-PILOT PAPER FLEET SUITE */}
        <section className="dashboard-panel mb-4" id="nifty-fleet" style={{ borderColor: "rgba(241, 178, 77, 0.4)" }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <h2 className="panel-title mb-0" style={{ color: "#f1b24d" }}>⚡ Nifty 50 Auto-Pilot Paper Fleet</h2>
              <span className={`badge ${autoStatus?.enabled ? "bg-success" : "bg-secondary"}`}>
                {autoStatus?.enabled ? "AUTO-PILOT ACTIVE" : "AUTO-PILOT OFF"}
              </span>
              <span className="badge bg-dark border border-warning text-warning">
                {autoStatus?.active_nifty50_bots ?? 0} / {autoStatus?.total_nifty50_universe ?? 50} Nifty Stocks Active
              </span>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <button
                className={`btn btn-sm ${autoStatus?.enabled ? "btn-outline-danger" : "btn-warning"}`}
                disabled={fleetActionLoading}
                onClick={handleToggleAutoPilot}
                type="button"
              >
                {autoStatus?.enabled ? "Disable Auto-Pilot" : "Enable Auto-Pilot Loop"}
              </button>
              <button
                className="btn btn-sm btn-warning fw-bold"
                disabled={fleetActionLoading}
                onClick={handleLaunchFullFleet}
                type="button"
              >
                {fleetActionLoading ? "Deploying..." : "🚀 Launch All 50 Nifty Paper Bots"}
              </button>
              <button
                className="btn btn-sm btn-outline-warning"
                disabled={fleetActionLoading}
                onClick={handleSquareOffFleet}
                type="button"
              >
                Square Off Fleet
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                disabled={fleetActionLoading}
                onClick={handleStopFleet}
                type="button"
              >
                Stop Fleet
              </button>
            </div>
          </div>

          <div className="p-3 bg-dark-subtle rounded">
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <label className="form-label small">Fleet Strategy Decision Maker</label>
                <select
                  className="form-select form-select-sm"
                  value={fleetStrategy}
                  onChange={(e) => setFleetStrategy(e.target.value)}
                >
                  <option value="equity_trend_momentum">Trend Momentum (HA + EMA)</option>
                  <option value="bees_rsi_dip">BeES RSI Dip Buyer</option>
                  <option value="equity_sr_breakout">S/R Breakout</option>
                  <option value="equity_fibo_pullback">Fibonacci Pullback</option>
                  <option value="equity_opportunity_score">Opportunity Score</option>
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small">Timeframe</label>
                <select
                  className="form-select form-select-sm"
                  value={fleetInterval}
                  onChange={(e) => setFleetInterval(e.target.value)}
                >
                  <option value="1">1 Minute</option>
                  <option value="3">3 Minutes</option>
                  <option value="5">5 Minutes</option>
                  <option value="15">15 Minutes</option>
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small">Capital / Stock (₹)</label>
                <input
                  className="form-control form-control-sm"
                  type="number"
                  value={fleetCapital}
                  onChange={(e) => setFleetCapital(Number(e.target.value) || 10000)}
                />
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small">Target (%)</label>
                <input
                  className="form-control form-control-sm"
                  step="0.1"
                  type="number"
                  value={fleetTargetPct}
                  onChange={(e) => setFleetTargetPct(Number(e.target.value) || 2.0)}
                />
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small">Stop Loss (%)</label>
                <input
                  className="form-control form-control-sm"
                  step="0.1"
                  type="number"
                  value={fleetSlPct}
                  onChange={(e) => setFleetSlPct(Number(e.target.value) || 1.5)}
                />
              </div>
            </div>
            <div className="small muted mt-2">
              * Automated Paper Execution evaluates candlestick signals on the entire 50 Nifty 50 universe (RELIANCE, TCS, HDFCBANK, INFY, etc.) and books profit automatically once the target is reached.
            </div>
          </div>
        </section>

        {/* Bot Launch Control Panel */}
        <section className="dashboard-panel mb-4" id="launch-panel">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="panel-title mb-0">Launch Single Custom Bot</h2>
            <div className="btn-group btn-group-sm">
              <button
                className={`btn ${selectedCategory === "index_bees" ? "btn-warning" : "btn-outline-secondary"}`}
                onClick={() => setSelectedCategory("index_bees")}
                type="button"
              >
                Index BeES
              </button>
              <button
                className={`btn ${selectedCategory === "thematic_etfs" ? "btn-warning" : "btn-outline-secondary"}`}
                onClick={() => setSelectedCategory("thematic_etfs")}
                type="button"
              >
                Thematic ETFs
              </button>
              <button
                className={`btn ${selectedCategory === "top_stocks" ? "btn-warning" : "btn-outline-secondary"}`}
                onClick={() => setSelectedCategory("top_stocks")}
                type="button"
              >
                Top Stocks
              </button>
            </div>
          </div>

          <div className="p-3">
            {statusMessage && (
              <div className={`alert ${statusTone === "success" ? "alert-success" : "alert-danger"} mb-3`}>
                {statusMessage}
              </div>
            )}

            <div className="row g-3">
              {/* Instrument Select */}
              <div className="col-12 col-md-6 col-xl-3">
                <label className="form-label">Instrument / Symbol</label>
                <select
                  className="form-select"
                  value={form.instrument_key}
                  onChange={(e) => {
                    const chosen = catalog?.all_items.find((i) => i.instrument_key === e.target.value);
                    if (chosen) handleInstrumentSelect(chosen);
                  }}
                >
                  {categoryInstruments.map((item) => (
                    <option key={item.instrument_key} value={item.instrument_key}>
                      {item.symbol} — {item.label}
                    </option>
                  ))}
                </select>
                {selectedInstrument && (
                  <div className="small muted mt-1">{selectedInstrument.description}</div>
                )}
              </div>

              {/* Strategy Select */}
              <div className="col-12 col-md-6 col-xl-3">
                <label className="form-label">Strategy Decision Maker</label>
                <select
                  className="form-select"
                  value={form.strategy_id}
                  onChange={(e) => {
                    const strat = strategies.find((s) => s.id === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      strategy_id: e.target.value,
                      target_pct: strat ? Number(strat.default_target_pct) : prev.target_pct,
                      sl_pct: strat ? Number(strat.default_sl_pct) : prev.sl_pct,
                    }));
                  }}
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <div className="small muted mt-1">
                  {strategies.find((s) => s.id === form.strategy_id)?.description || "Technical decision engine."}
                </div>
              </div>

              {/* Capital Sizing Mode */}
              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Allocated Capital (₹)</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.allocated_capital}
                  onChange={(e) => setForm((prev) => ({ ...prev, allocated_capital: Number(e.target.value) || 0 }))}
                />
                <div className="small muted mt-1">Auto-sizes shares per trade.</div>
              </div>

              {/* Target % */}
              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Profit Target (%)</label>
                <input
                  className="form-control"
                  step="0.1"
                  type="number"
                  value={form.target_pct}
                  onChange={(e) => setForm((prev) => ({ ...prev, target_pct: Number(e.target.value) || 1.5 }))}
                />
                <div className="small muted mt-1">Exit sell once target hit.</div>
              </div>

              {/* Stop Loss % */}
              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Stop Loss (%)</label>
                <input
                  className="form-control"
                  disabled={form.allow_no_sl}
                  step="0.1"
                  type="number"
                  value={form.sl_pct}
                  onChange={(e) => setForm((prev) => ({ ...prev, sl_pct: Number(e.target.value) || 1.5 }))}
                />
                <div className="form-check mt-1">
                  <input
                    checked={form.allow_no_sl}
                    className="form-check-input"
                    id="allow-no-sl"
                    onChange={(e) => setForm((prev) => ({ ...prev, allow_no_sl: e.target.checked }))}
                    type="checkbox"
                  />
                  <label className="form-check-label small" htmlFor="allow-no-sl">
                    No SL (Accumulate)
                  </label>
                </div>
              </div>

              {/* Product Code */}
              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Product Type</label>
                <select
                  className="form-select"
                  value={form.product_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, product_type: e.target.value as "CNC" | "MIS" }))}
                >
                  <option value="CNC">CNC (Delivery / Swing)</option>
                  <option value="MIS">MIS (Intraday Cash)</option>
                </select>
              </div>

              {/* Execution Mode */}
              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Execution Mode</label>
                <select
                  className="form-select"
                  value={form.execution_mode}
                  onChange={(e) => setForm((prev) => ({ ...prev, execution_mode: e.target.value as "paper" | "live" }))}
                >
                  <option value="paper">Paper Trading</option>
                  <option value="live">Live Broker</option>
                </select>
              </div>

              {/* Execution Broker */}
              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Broker</label>
                <select
                  className="form-select"
                  disabled={form.execution_mode !== "live"}
                  value={form.execution_broker}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      execution_broker: e.target.value as
                        | "kotak_neo"
                        | "shoonya"
                </select>
              </div>

              {/* Timeframe */}
              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Timeframe</label>
                <select
                  className="form-select"
                  value={form.candle_interval}
                  onChange={(e) => setForm((prev) => ({ ...prev, candle_interval: e.target.value }))}
                >
                  <option value="1">1 Minute</option>
                  <option value="3">3 Minutes</option>
                  <option value="5">5 Minutes</option>
                  <option value="15">15 Minutes</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="col-12 col-md-6 col-xl-4 d-flex align-items-end gap-2">
                <button
                  className="btn btn-warning w-100 fw-bold"
                  disabled={launching}
                  onClick={handleLaunchBot}
                  type="button"
                >
                  {launching ? "Launching..." : "🚀 Launch Equity Bot"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Managed & Active Jobs Desk */}
        <section className="dashboard-panel">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <h2 className="panel-title mb-0">Active & Historical Bots</h2>
              <span className="badge bg-secondary">{totalJobsCount}</span>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Tab Filters */}
              <div className="btn-group btn-group-sm">
                <button
                  className={`btn ${activeTab === "all" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => handleTabChange("all")}
                  type="button"
                >
                  All ({summary?.managed_jobs ?? 0})
                </button>
                <button
                  className={`btn ${activeTab === "active" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => handleTabChange("active")}
                  type="button"
                >
                  Active ({summary?.active_jobs ?? 0})
                </button>
                <button
                  className={`btn ${activeTab === "history" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => handleTabChange("history")}
                  type="button"
                >
                  History
                </button>
              </div>

              {/* Bulk Actions */}
              {selectedJobIds.length > 0 && (
                <button
                  className="btn btn-sm btn-outline-danger"
                  disabled={actionInProgress === "bulk-delete"}
                  onClick={handleBulkDelete}
                  type="button"
                >
                  Delete ({selectedJobIds.length})
                </button>
              )}

              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={actionInProgress === "clear-all"}
                onClick={handleClearAllHistory}
                type="button"
              >
                Clear History
              </button>
            </div>
          </div>

          {jobsLoading && <div className="muted p-3">Refreshing managed bots...</div>}

          {!jobsLoading && jobs.length === 0 && (
            <div className="text-center p-5 muted">
              No active or historical equity bots found. Launch one above or start the Nifty 50 fleet to begin autonomous execution.
            </div>
          )}

          {!jobsLoading && jobs.length > 0 && (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>
                      <input
                        checked={selectedJobIds.length === jobs.length && jobs.length > 0}
                        className="form-check-input"
                        onChange={(e) => {
                          if (e.target.checked) setSelectedJobIds(jobs.map((j) => j.job_id));
                          else setSelectedJobIds([]);
                        }}
                        type="checkbox"
                      />
                    </th>
                    <th>Status</th>
                    <th>Bot / Symbol</th>
                    <th>Strategy</th>
                    <th>Mode</th>
                    <th>Entry Price</th>
                    <th>Current LTP</th>
                    <th>Target / Progress</th>
                    <th>Unrealized P/L</th>
                    <th>Realized P/L</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const isExpanded = expandedJobId === job.job_id;
                    const isSelected = selectedJobIds.includes(job.job_id);
                    const progress = job.target_progress_pct ?? 0;

                    return (
                      <Fragment key={job.job_id}>
                        <tr className={isExpanded ? "table-active" : ""}>
                          <td>
                            <input
                              checked={isSelected}
                              className="form-check-input"
                              disabled={job.status === "running" || job.has_open_trade}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedJobIds((prev) => [...prev, job.job_id]);
                                else setSelectedJobIds((prev) => prev.filter((id) => id !== job.job_id));
                              }}
                              type="checkbox"
                            />
                          </td>
                          <td>
                            <span className={`badge-soft ${jobStatusTone(job.status)}`}>
                              <span className="dot" />
                              {job.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <div className="fw-bold">{job.job_name}</div>
                            <div className="small muted">
                              {job.config.product_type} • {job.quantity} shares
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{job.config.strategy_id}</span>
                          </td>
                          <td>
                            <span className={`badge ${job.config.execution_mode === "live" ? "bg-warning text-dark" : "bg-info text-dark"}`}>
                              {job.config.execution_mode.toUpperCase()}
                            </span>
                          </td>
                          <td>{job.entry_price ? fmtMoney(job.entry_price) : "-"}</td>
                          <td className="fw-bold">{job.current_ltp ? fmtMoney(job.current_ltp) : "-"}</td>
                          <td>
                            {job.target_price ? (
                              <div>
                                <div className="small d-flex justify-content-between">
                                  <span>{fmtMoney(job.target_price)}</span>
                                  <span className="muted">{progress}%</span>
                                </div>
                                <div className="progress" style={{ height: "4px" }}>
                                  <div
                                    className="progress-bar bg-success"
                                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className={`fw-bold ${pnlTone(job.unrealized_pnl)}`}>
                            {job.has_open_trade ? (
                              <>
                                <div>{fmtMoney(job.unrealized_pnl)}</div>
                                <div className="small">({job.unrealized_pnl_pct ?? 0}%)</div>
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className={`fw-bold ${pnlTone(job.total_realized_pnl)}`}>
                            {fmtMoney(job.total_realized_pnl)}
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              {job.has_open_trade && (
                                <button
                                  className="btn btn-danger btn-sm"
                                  disabled={actionInProgress === `square-off:${job.job_id}`}
                                  onClick={() => handleSquareOff(job.job_id)}
                                  title="Square off position immediately"
                                  type="button"
                                >
                                  Square Off
                                </button>
                              )}
                              {job.status === "running" && (
                                <button
                                  className="btn btn-outline-warning btn-sm"
                                  disabled={actionInProgress === `stop:${job.job_id}`}
                                  onClick={() => handleStopJob(job.job_id)}
                                  title="Stop bot"
                                  type="button"
                                >
                                  Stop
                                </button>
                              )}
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => setExpandedJobId(isExpanded ? "" : job.job_id)}
                                title="Toggle live logs"
                                type="button"
                              >
                                {isExpanded ? "Hide Logs" : "Logs"}
                              </button>
                              {job.status !== "running" && !job.has_open_trade && (
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  disabled={actionInProgress === `delete:${job.job_id}`}
                                  onClick={() => handleDeleteJob(job.job_id)}
                                  title="Delete historical job"
                                  type="button"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Log Viewer */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={11} className="p-0">
                              <div className="bg-dark p-3 font-monospace small" style={{ maxHeight: "240px", overflowY: "auto" }}>
                                <div className="text-muted mb-2">// Real-time Bot Execution Logs for {job.job_id}</div>
                                {(!job.logs || job.logs.length === 0) && (
                                  <div className="text-muted">No log events recorded yet.</div>
                                )}
                                {job.logs?.map((line, idx) => (
                                  <div key={idx} className={line.includes("ERROR") ? "text-danger" : line.includes("TARGET") || line.includes("ENTRY") ? "text-success" : "text-light"}>
                                    {line}
                                  </div>
                                ))}
                              </div>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top border-secondary">
              <span className="small muted">
                Page {currentPage} of {totalPages} ({totalJobsCount} total jobs)
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
