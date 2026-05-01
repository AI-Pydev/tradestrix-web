"use client";

import { Fragment, startTransition, useEffect, useRef, useState } from "react";

import { TodayHistoryToolbar } from "@/components/today-history-toolbar";
import {
    closeScannerPaperTrade,
    createScannerPaperTrade,
    fetchInstrumentCatalog,
    fetchScannerPaperLabDashboard,
    InstrumentCatalogResponse,
    OpportunityScannerResponse,
    runScannerPaperAutoEntryNow,
    runOpportunityScanner,
    ScannerPaperAutoEntryStatus,
    ScannerPaperLabDashboard,
    updateScannerPaperAutoEntrySettings,
} from "@/lib/api";
import { HistoryPreset, HistoryView, localDateKey, matchesHistoryWindow, parseIsoDate } from "@/lib/history-window";

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

function fmtDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function statusTone(status: string) {
  if (status === "ACTIONABLE") {
    return "green";
  }
  if (status === "WATCHLIST") {
    return "gold";
  }
  if (status === "ERROR") {
    return "red";
  }
  return "blue";
}

function qualityTone(quality?: string | null) {
  if (quality === "A") {
    return "green";
  }
  if (quality === "B") {
    return "gold";
  }
  if (quality === "C") {
    return "blue";
  }
  return "blue";
}

function dailyTrendTone(trend?: string | null) {
  if (trend === "bullish") {
    return "green";
  }
  if (trend === "bearish") {
    return "red";
  }
  if (trend === "neutral") {
    return "gold";
  }
  return "blue";
}

function emaBiasTone(bias?: string | null) {
  if (bias === "bullish") {
    return "green";
  }
  if (bias === "bearish") {
    return "red";
  }
  if (bias === "mixed") {
    return "gold";
  }
  return "blue";
}

function metricTone(label: string) {
  if (label === "Actionable" || label === "Actionable Indices" || label === "Actionable Stocks") {
    return "positive";
  }
  if (label === "Errors") {
    return "negative";
  }
  return "";
}

type ScannerFormState = {
  broker_id: "upstox" | "kite";
  include_indices: boolean;
  include_stocks: boolean;
  max_indices: number;
  max_stocks: number;
  scan_basis: "daily";
  daily_history_days: number;
  trade_mode: "buy-only" | "mixed";
  use_greek_filters: boolean;
  ema_bias_mode: "off" | "score" | "strict";
  min_quality: "A" | "B" | "C";
  min_option_ltp: string;
  max_option_ltp: string;
  workers: number;
  entry_lots: number;
  auto_scan_interval_seconds: number;
};

const PAPER_LAB_REFRESH_MS = 15000;

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function OpportunityScannerShell() {
  const [catalog, setCatalog] = useState<InstrumentCatalogResponse | null>(null);
  const [paperLab, setPaperLab] = useState<ScannerPaperLabDashboard | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingPaperLab, setLoadingPaperLab] = useState(true);
  const [scanRunning, setScanRunning] = useState(false);
  const [error, setError] = useState("");
  const [paperLabError, setPaperLabError] = useState("");
  const [result, setResult] = useState<OpportunityScannerResponse | null>(null);
  const [trackActionKey, setTrackActionKey] = useState("");
  const [closeActionKey, setCloseActionKey] = useState("");
  const [exitInputs, setExitInputs] = useState<Record<string, string>>({});
  const [paperRiskCapInput, setPaperRiskCapInput] = useState("1500");
  const [autoEntrySaving, setAutoEntrySaving] = useState(false);
  const [autoEntryRunning, setAutoEntryRunning] = useState(false);
  const [autoEntryEnabled, setAutoEntryEnabled] = useState(false);
  const [autoEntryCooldownMinutes, setAutoEntryCooldownMinutes] = useState(12);
  const [autoEntryStatus, setAutoEntryStatus] = useState<ScannerPaperAutoEntryStatus | null>(null);
  const autoEntryHydrated = useRef(false);
  const [paperView, setPaperView] = useState<HistoryView>("today");
  const [paperHistoryPreset, setPaperHistoryPreset] = useState<HistoryPreset>("last7");
  const [paperHistoryFrom, setPaperHistoryFrom] = useState("");
  const [paperHistoryTo, setPaperHistoryTo] = useState("");
  const [form, setForm] = useState<ScannerFormState>({
    broker_id: "upstox",
    include_indices: true,
    include_stocks: true,
    max_indices: 6,
    max_stocks: 24,
    scan_basis: "daily",
    daily_history_days: 120,
    trade_mode: "buy-only",
    use_greek_filters: true,
    ema_bias_mode: "score",
    min_quality: "B",
    min_option_ltp: "",
    max_option_ltp: "",
    workers: 6,
    entry_lots: 1,
    auto_scan_interval_seconds: 60,
  });

  useEffect(() => {
    if (form.broker_id !== "kite") {
      return;
    }
    setForm((prev) => {
      const next = { ...prev };
      if (next.max_indices > 4) {
        next.max_indices = 4;
      }
      if (next.max_stocks > 8) {
        next.max_stocks = 8;
      }
      if (next.workers > 2) {
        next.workers = 2;
      }
      return next;
    });
  }, [form.broker_id]);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        const response = await fetchInstrumentCatalog();
        if (!active) {
          return;
        }
        setCatalog(response);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load instrument catalog");
      } finally {
        if (active) {
          setLoadingCatalog(false);
        }
      }
    }

    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPaperLab() {
      try {
        if (!autoEntryHydrated.current) {
          setLoadingPaperLab(true);
        }
        const response = await fetchScannerPaperLabDashboard();
        if (!active) {
          return;
        }
        setPaperLab(response);
        setAutoEntryStatus(response.auto_entry_status);
        if (!autoEntryHydrated.current) {
          const settings = response.auto_entry_settings;
          setForm((prev) => ({
            ...prev,
            broker_id: settings.broker_id,
            include_indices: settings.include_indices,
            include_stocks: settings.include_stocks,
            max_indices: settings.max_indices,
            max_stocks: settings.max_stocks,
            daily_history_days: settings.daily_history_days,
            trade_mode: settings.trade_mode,
            use_greek_filters: settings.use_greek_filters,
            ema_bias_mode: settings.ema_bias_mode,
            min_quality: settings.min_quality,
            min_option_ltp: settings.min_option_ltp != null ? String(settings.min_option_ltp) : "",
            max_option_ltp: settings.max_option_ltp != null ? String(settings.max_option_ltp) : "",
            workers: settings.workers,
            entry_lots: settings.lots,
            auto_scan_interval_seconds: settings.scan_interval_seconds,
          }));
          setPaperRiskCapInput(String(settings.risk_cap_amount));
          setAutoEntryEnabled(settings.enabled);
          setAutoEntryCooldownMinutes(settings.cooldown_minutes);
          autoEntryHydrated.current = true;
        }
        setPaperLabError("");
      } catch (err) {
        if (!active) {
          return;
        }
        setPaperLabError(err instanceof Error ? err.message : "Failed to load scanner paper lab");
      } finally {
        if (active) {
          setLoadingPaperLab(false);
        }
      }
    }

    loadPaperLab();
    const interval = window.setInterval(() => {
      loadPaperLab().catch(() => undefined);
    }, PAPER_LAB_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function handleRunScan() {
    try {
      setScanRunning(true);
      setError("");
      const response = await runOpportunityScanner({
        broker_id: form.broker_id,
        include_indices: form.include_indices,
        include_stocks: form.include_stocks,
        max_indices: form.max_indices,
        max_stocks: form.max_stocks,
        scan_basis: form.scan_basis,
        daily_history_days: form.daily_history_days,
        trade_mode: form.trade_mode,
        use_greek_filters: form.use_greek_filters,
        ema_bias_mode: form.ema_bias_mode,
        min_quality: form.min_quality,
        min_option_ltp: parseOptionalNumber(form.min_option_ltp),
        max_option_ltp: parseOptionalNumber(form.max_option_ltp),
        workers: form.workers,
      });
      startTransition(() => {
        setResult(response);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run opportunity scanner");
    } finally {
      setScanRunning(false);
    }
  }

  async function refreshPaperLab() {
    const response = await fetchScannerPaperLabDashboard();
    setPaperLab(response);
    setAutoEntryStatus(response.auto_entry_status);
  }

  async function handleSaveAutoEntrySettings() {
    try {
      setAutoEntrySaving(true);
      setPaperLabError("");
      const response = await updateScannerPaperAutoEntrySettings({
        enabled: autoEntryEnabled,
        broker_id: form.broker_id,
        include_indices: form.include_indices,
        include_stocks: form.include_stocks,
        max_indices: form.max_indices,
        max_stocks: form.max_stocks,
        daily_history_days: form.daily_history_days,
        trade_mode: form.trade_mode,
        use_greek_filters: form.use_greek_filters,
        ema_bias_mode: form.ema_bias_mode,
        min_quality: form.min_quality,
        min_option_ltp: parseOptionalNumber(form.min_option_ltp),
        max_option_ltp: parseOptionalNumber(form.max_option_ltp),
        workers: form.workers,
        lots: form.entry_lots,
        risk_cap_amount: Math.min(Math.max(parseOptionalNumber(paperRiskCapInput) ?? 1500, 1), 2000),
        cooldown_minutes: autoEntryCooldownMinutes,
        scan_interval_seconds: Math.max(15, form.auto_scan_interval_seconds),
      });
      setAutoEntryEnabled(response.enabled);
      setAutoEntryCooldownMinutes(response.cooldown_minutes);
      setPaperRiskCapInput(String(response.risk_cap_amount));
      setForm((prev) => ({
        ...prev,
        entry_lots: response.lots,
        auto_scan_interval_seconds: response.scan_interval_seconds,
      }));
      await refreshPaperLab();
    } catch (err) {
      setPaperLabError(err instanceof Error ? err.message : "Failed to save scanner auto-run settings");
    } finally {
      setAutoEntrySaving(false);
    }
  }

  async function handleRunAutoEntryNow() {
    try {
      setAutoEntryRunning(true);
      setPaperLabError("");
      const response = await runScannerPaperAutoEntryNow();
      setAutoEntryStatus(response);
      await refreshPaperLab();
    } catch (err) {
      setPaperLabError(err instanceof Error ? err.message : "Failed to run scanner auto-check");
    } finally {
      setAutoEntryRunning(false);
    }
  }

  async function handleTrackRow(row: OpportunityScannerResponse["rows"][number]) {
    try {
      setTrackActionKey(row.instrument_key);
      setPaperLabError("");
      const resolvedRiskCap = Math.min(Math.max(parseOptionalNumber(paperRiskCapInput) ?? 1500, 1), 2000);
      await createScannerPaperTrade({
        row,
        lots: 1,
        entry_price: row.option_ltp ?? null,
        risk_cap_amount: resolvedRiskCap,
        notes: `Tracked from scanner as ${row.status}`,
      });
      await refreshPaperLab();
    } catch (err) {
      setPaperLabError(err instanceof Error ? err.message : "Failed to track scanner setup");
    } finally {
      setTrackActionKey("");
    }
  }

  async function handleCloseTrade(tradeId: string) {
    const exitPrice = parseOptionalNumber(exitInputs[tradeId] ?? "");
    if (exitPrice == null || exitPrice <= 0) {
      setPaperLabError("Enter a valid exit price before closing the paper trade.");
      return;
    }

    try {
      setCloseActionKey(tradeId);
      setPaperLabError("");
      await closeScannerPaperTrade(tradeId, {
        exit_price: exitPrice,
        reason: "manual_close",
      });
      setExitInputs((prev) => {
        const next = { ...prev };
        delete next[tradeId];
        return next;
      });
      await refreshPaperLab();
    } catch (err) {
      setPaperLabError(err instanceof Error ? err.message : "Failed to close paper trade");
    } finally {
      setCloseActionKey("");
    }
  }

  const summaryCards = result
    ? [
        { label: "Broker", value: result.summary.broker_id.toUpperCase() },
        { label: "Snapshot Date", value: result.summary.snapshot_date },
        { label: "Scanned", value: result.summary.scanned_instruments },
        { label: "Actionable", value: result.summary.actionable_count },
        { label: "Watchlist", value: result.summary.watchlist_count },
        { label: "Rejected", value: result.summary.rejected_count },
        { label: "Errors", value: result.summary.error_count },
        { label: "Actionable Indices", value: result.summary.actionable_indices },
        { label: "Actionable Stocks", value: result.summary.actionable_stocks },
        { label: "Duration (s)", value: result.summary.duration_seconds },
      ]
    : [];

  const recommendedRow = result
    ? result.rows.find((row) => row.status === "ACTIONABLE") ??
      result.rows.find((row) => row.status === "WATCHLIST") ??
      result.rows.find((row) => row.status === "REJECTED") ??
      null
    : null;

  const paperRows = paperLab?.trades ?? [];
  const paperTodayKey = localDateKey(new Date());
  const paperTradesToday = paperRows.filter((trade) => {
    if (trade.status === "OPEN") {
      return true;
    }
    const openedAt = parseIsoDate(trade.opened_at);
    if (!openedAt) {
      return false;
    }
    return localDateKey(openedAt) === paperTodayKey;
  });
  const paperTradesHistoryAll = paperRows.filter((trade) => {
    const openedAt = parseIsoDate(trade.opened_at);
    if (!openedAt) {
      return false;
    }
    return localDateKey(openedAt) < paperTodayKey;
  });
  const paperTradesHistory = paperTradesHistoryAll.filter((trade) => {
    const openedAt = parseIsoDate(trade.opened_at);
    if (!openedAt) {
      return false;
    }
    return matchesHistoryWindow(localDateKey(openedAt), paperHistoryPreset, paperHistoryFrom, paperHistoryTo);
  });
  const visiblePaperTrades = paperView === "today" ? paperTradesToday : paperTradesHistory;

  const visibleOpenTrades = visiblePaperTrades.filter((t) => t.status === "OPEN");
  const visibleClosedTrades = visiblePaperTrades.filter((t) => t.status === "CLOSED");
  const visibleWins = visibleClosedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const visibleLosses = visibleClosedTrades.filter((t) => (t.pnl ?? 0) < 0);
  const visibleRealizedPnl = visibleClosedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const visibleTotalLoss = visibleLosses.reduce((sum, t) => sum + Math.abs(t.pnl ?? 0), 0);
  const visibleWinRate =
    visibleClosedTrades.length > 0 ? (visibleWins.length / visibleClosedTrades.length) * 100 : 0;
  const visibleAvgScore =
    visiblePaperTrades.length > 0
      ? visiblePaperTrades.reduce((sum, t) => sum + t.selection_score, 0) / visiblePaperTrades.length
      : 0;
  const visibleTrackedSymbols = new Set(visiblePaperTrades.map((t) => t.instrument_key)).size;

  const paperSummaryCards = [
    { label: "Tracked", value: visiblePaperTrades.length },
    { label: "Open Paper Trades", value: visibleOpenTrades.length },
    { label: "Closed Paper Trades", value: visibleClosedTrades.length },
    { label: "Wins", value: visibleWins.length },
    { label: "Losses", value: visibleLosses.length },
    { label: "Win Rate", value: `${visibleWinRate.toFixed(1)}%` },
    { label: "Realized PnL", value: fmtMoney(visibleRealizedPnl) },
    { label: "Total Loss", value: fmtMoney(visibleTotalLoss) },
    { label: "Avg Entry Score", value: fmtNumber(visibleAvgScore) },
    { label: "Tracked Symbols", value: visibleTrackedSymbols },
  ];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="scanner-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#scanner-top">
              Overview
            </a>
            <a className="hero-tab" href="#scanner-controls">
              Controls
            </a>
            <a className="hero-tab" href="#scanner-results">
              Ranked Table
            </a>
            <a className="hero-tab" href="#scanner-paper-lab">
              Paper Lab
            </a>
            <a className="hero-tab" href="#scanner-notes">
              Notes
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Stock And Index Opportunity Scanner</h1>
            <p className="hero-subtitle">
              Separate page for broad market scanning, so the current dashboard stays unchanged.
            </p>
          </div>
          <div className="p-3">
            <div className="row g-3">
              <div className="col-lg-8">
                <div className="dashboard-panel h-100" id="scanner-controls">
                  <h2 className="panel-title">Scanner Controls</h2>
                  <div className="p-3">
                    <div className="row g-3">
                      <div className="col-md-3">
                        <div className="form-check mt-2">
                          <input
                            checked={form.include_indices}
                            className="form-check-input"
                            id="include-indices"
                            onChange={(e) => setForm((prev) => ({ ...prev, include_indices: e.target.checked }))}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="include-indices">
                            Include Indices
                          </label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-check mt-2">
                          <input
                            checked={form.include_stocks}
                            className="form-check-input"
                            id="include-stocks"
                            onChange={(e) => setForm((prev) => ({ ...prev, include_stocks: e.target.checked }))}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="include-stocks">
                            Include Stocks
                          </label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Max Indices</label>
                        <input
                          className="form-control"
                          min={0}
                          onChange={(e) => setForm((prev) => ({ ...prev, max_indices: Number(e.target.value) || 0 }))}
                          type="number"
                          value={form.max_indices}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Max Stocks</label>
                        <input
                          className="form-control"
                          min={0}
                          onChange={(e) => setForm((prev) => ({ ...prev, max_stocks: Number(e.target.value) || 0 }))}
                          type="number"
                          value={form.max_stocks}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Broker</label>
                        <select
                          className="form-select"
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, broker_id: e.target.value as ScannerFormState["broker_id"] }))
                          }
                          value={form.broker_id}
                        >
                          <option value="upstox">Upstox</option>
                          <option value="kite">Kite</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Scan Basis</label>
                        <input className="form-control" disabled readOnly type="text" value="Daily" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Daily Lookback</label>
                        <input
                          className="form-control"
                          max={365}
                          min={30}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, daily_history_days: Number(e.target.value) || 30 }))
                          }
                          type="number"
                          value={form.daily_history_days}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Trade Mode</label>
                        <select
                          className="form-select"
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, trade_mode: e.target.value as ScannerFormState["trade_mode"] }))
                          }
                          value={form.trade_mode}
                        >
                          <option value="buy-only">Long Premium Only (BUY CE / BUY PE)</option>
                          <option value="mixed">Mixed (Include SELL CE / SELL PE)</option>
                        </select>
                        <div className="muted mt-2">
                          Use buy-only if you want bearish ideas as `BUY PE` instead of option writing.
                        </div>
                      </div>
                      <div className="col-md-2">
                        <div className="form-check mt-4">
                          <input
                            checked={form.use_greek_filters}
                            className="form-check-input"
                            id="scanner-use-greek-filters"
                            onChange={(e) => setForm((prev) => ({ ...prev, use_greek_filters: e.target.checked }))}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="scanner-use-greek-filters">
                            Use Greek Filters
                          </label>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">EMA Bias</label>
                        <select
                          className="form-select"
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, ema_bias_mode: e.target.value as ScannerFormState["ema_bias_mode"] }))
                          }
                          value={form.ema_bias_mode}
                        >
                          <option value="off">Off</option>
                          <option value="score">Score Boost</option>
                          <option value="strict">Strict Filter</option>
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Min Quality</label>
                        <select
                          className="form-select"
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, min_quality: e.target.value as ScannerFormState["min_quality"] }))
                          }
                          value={form.min_quality}
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Min LTP</label>
                        <input
                          className="form-control"
                          onChange={(e) => setForm((prev) => ({ ...prev, min_option_ltp: e.target.value }))}
                          placeholder="Optional"
                          type="number"
                          value={form.min_option_ltp}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Max LTP</label>
                        <input
                          className="form-control"
                          onChange={(e) => setForm((prev) => ({ ...prev, max_option_ltp: e.target.value }))}
                          placeholder="Optional"
                          type="number"
                          value={form.max_option_ltp}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Workers</label>
                        <input
                          className="form-control"
                          max={16}
                          min={1}
                          onChange={(e) => setForm((prev) => ({ ...prev, workers: Number(e.target.value) || 1 }))}
                          type="number"
                          value={form.workers}
                        />
                      </div>
                      <div className="col-12 d-flex gap-2">
                        <button className="btn btn-warning" disabled={scanRunning} onClick={handleRunScan}>
                          {scanRunning ? "Scanning..." : "Run Opportunity Scan"}
                        </button>
                        <div className="muted align-self-center">
                          {loadingCatalog
                            ? "Loading available universe..."
                            : `Available universe: ${catalog?.indices.length ?? 0} indices, ${catalog?.stocks.length ?? 0} stocks`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="dashboard-panel h-100" id="scanner-notes">
                  <h2 className="panel-title">Scanner Notes</h2>
                  <div className="p-3 muted">
                    This page keeps the existing dashboard intact and now runs a daily-basis scan across selected indices
                    and stocks. It combines the current option-chain S/R engine with daily candle trend context, then ranks
                    results into actionable, watchlist, rejected, and error buckets.
                    <div className="mt-3">
                      Each run is also written into the daily scanner SQLite store so we have a clean bridge to a future
                      PostgreSQL-backed scanner history without changing the page flow again.
                    </div>
                    <div className="mt-3">
                      Greek filters still control whether delta/theta/gamma-aware ranking stays active inside the scanner
                      engine. Turn them off if you want a more price-and-OI-driven shortlist.
                    </div>
                    <div className="mt-3">
                      EMA bias uses daily EMA10 and EMA20. Bullish ideas prefer close above both, bearish ideas prefer
                      close below both. Score mode rewards alignment, while strict mode downgrades conflicting actionable setups.
                    </div>
                    <div className="mt-3">
                      `Long Premium Only` returns only `BUY CE` and `BUY PE` ideas, which is usually the safer capital
                      profile for this scanner. `Mixed` keeps sell setups available if you still want option-writing ideas.
                    </div>
                    <div className="mt-3">
                      Kite runs can take longer than Upstox, especially on the first scan. For quick testing, keep the
                      universe small and workers low so the response stays readable and predictable.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {result?.summary.storage_warning && (
          <div className="alert alert-warning" role="alert">
            {result.summary.storage_warning}
          </div>
        )}

        {paperLabError && (
          <div className="alert alert-danger" role="alert">
            {paperLabError}
          </div>
        )}

        {result && (
          <>
            {result.summary.broker_id === "kite" && result.summary.actionable_count === 0 && result.summary.watchlist_count === 0 ? (
              <div className="alert alert-warning" role="alert">
                Kite scan completed, but no setup qualified under the current filters. The ranked table below still shows
                the rejected rows and their reasons so you can inspect what came back.
              </div>
            ) : null}
            <div className="row g-3 mb-3">
              {summaryCards.map((metric) => (
                <div className="col-sm-6 col-xl-3" key={metric.label}>
                  <div className={`metric-card p-3 ${metricTone(metric.label)}`}>
                    <div className="metric-label">{metric.label}</div>
                    <div className="metric-value">{metric.value}</div>
                  </div>
                </div>
              ))}
            </div>
            {recommendedRow ? (
              <div className="dashboard-panel mb-4" id="scanner-recommendation">
                <h2 className="panel-title">Recommended Setup</h2>
                <div className="p-3">
                  <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                    <div>
                      <div className="fw-semibold">
                        {recommendedRow.label}{" "}
                        <span className={`badge-soft ${statusTone(recommendedRow.status)}`}>{recommendedRow.status}</span>
                      </div>
                      <div className="muted small">{recommendedRow.instrument_key}</div>
                      <div className="muted small mt-2">
                        {recommendedRow.trade_label ?? "-"} | Score {fmtNumber(recommendedRow.selection_score)} |{" "}
                        {recommendedRow.quality ? `Quality ${recommendedRow.quality}` : "Quality -"} | RR{" "}
                        {recommendedRow.rr_ratio != null ? recommendedRow.rr_ratio.toFixed(2) : "-"}
                      </div>
                      <div className="muted small">
                        Daily trend{" "}
                        <span className={`badge-soft ${dailyTrendTone(recommendedRow.daily_trend)}`}>
                          {recommendedRow.daily_trend}
                        </span>{" "}
                        | EMA bias{" "}
                        <span className={`badge-soft ${emaBiasTone(recommendedRow.ema_bias)}`}>
                          {recommendedRow.ema_bias}
                        </span>{" "}
                        | Expiry {recommendedRow.resolved_expiry ?? "-"}
                      </div>
                    </div>

                    <div className="d-flex gap-2 align-items-center">
                      <a className="btn btn-sm btn-outline-light" href="#scanner-results">
                        Jump to Table
                      </a>
                      {(recommendedRow.status === "ACTIONABLE" || recommendedRow.status === "WATCHLIST") &&
                      recommendedRow.trade_label &&
                      recommendedRow.option_ltp != null &&
                      recommendedRow.lot_size != null ? (
                        <button
                          className="btn btn-sm btn-warning"
                          disabled={trackActionKey === recommendedRow.instrument_key}
                          onClick={() => handleTrackRow(recommendedRow)}
                          type="button"
                        >
                          {trackActionKey === recommendedRow.instrument_key ? "Tracking..." : "Track 1 Lot"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="muted mt-3">
                    <strong>Reason:</strong> {recommendedRow.status_reason}
                  </div>
                  {recommendedRow.status === "REJECTED" ? (
                    <div className="muted">This is the highest-ranked rejected setup from the current run.</div>
                  ) : null}
                  {recommendedRow.option_symbol ? (
                    <div className="muted">
                      <strong>Option:</strong> {recommendedRow.option_symbol}{" "}
                      {recommendedRow.option_ltp != null ? `| LTP ${fmtMoney(recommendedRow.option_ltp)}` : ""}
                    </div>
                  ) : null}
                  {recommendedRow.rationale ? (
                    <div className="muted">
                      <strong>Setup:</strong> {recommendedRow.rationale}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="muted mb-4">
              Basis: {result.summary.scan_basis.toUpperCase()} | Store: {result.summary.storage_backend} | Target:{" "}
              {result.summary.storage_target}
            </div>
          </>
        )}

        <section className="dashboard-panel" id="scanner-results">
          <h2 className="panel-title">Ranked Opportunity Table</h2>
          {!result && <div className="empty-state">Run the scanner to populate the stock and index table.</div>}
          {result && (
            <div className="table-responsive">
              <table className="table table-dark-shell align-middle">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Kind</th>
                    <th>Instrument</th>
                    <th>Score</th>
                    <th>Bias</th>
                    <th>Daily Trend</th>
                    <th>EMA Bias</th>
                    <th>Quality</th>
                    <th>Trade</th>
                    <th>Side</th>
                    <th>Strike</th>
                    <th>Opt LTP</th>
                    <th>R:R</th>
                    <th>Zone</th>
                    <th>OI Vel</th>
                    <th>Expiry</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <Fragment key={row.instrument_key}>
                      <tr>
                        <td>
                          <span className={`badge-soft ${statusTone(row.status)}`}>{row.status}</span>
                          {recommendedRow?.instrument_key === row.instrument_key ? (
                            <span className="badge-soft gold ms-2">Top</span>
                          ) : null}
                        </td>
                        <td>{row.kind.toUpperCase()}</td>
                        <td>
                          <div className="fw-semibold">{row.label}</div>
                          <div className="muted small">{row.instrument_key}</div>
                        </td>
                        <td>{fmtNumber(row.selection_score)}</td>
                        <td>{row.market_bias}</td>
                        <td>
                          <span className={`badge-soft ${dailyTrendTone(row.daily_trend)}`}>{row.daily_trend}</span>
                        </td>
                        <td>
                          <span className={`badge-soft ${emaBiasTone(row.ema_bias)}`}>{row.ema_bias}</span>
                        </td>
                        <td>
                          {row.quality ? (
                            <span className={`badge-soft ${qualityTone(row.quality)}`}>{row.quality}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{row.trade_label ?? "-"}</td>
                        <td>{row.option_side ?? "-"}</td>
                        <td>{row.strike != null ? fmtNumber(row.strike) : "-"}</td>
                        <td>{row.option_ltp != null ? fmtMoney(row.option_ltp) : "-"}</td>
                        <td>{row.rr_ratio != null ? row.rr_ratio.toFixed(2) : "-"}</td>
                        <td>{row.zone_score != null ? row.zone_score.toFixed(1) : "-"}</td>
                        <td>{row.oi_velocity != null ? row.oi_velocity.toFixed(2) : "-"}</td>
                        <td>{row.resolved_expiry ?? "-"}</td>
                        <td>
                          {(row.status === "ACTIONABLE" || row.status === "WATCHLIST") &&
                          row.trade_label &&
                          row.option_ltp != null &&
                          row.lot_size != null ? (
                            <button
                              className="btn btn-sm btn-outline-light"
                              disabled={trackActionKey === row.instrument_key}
                              onClick={() => handleTrackRow(row)}
                            >
                              {trackActionKey === row.instrument_key ? "Tracking..." : "Track 1 Lot"}
                            </button>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={17}>
                          <div className="muted">
                            <strong>Reason:</strong> {row.status_reason}
                          </div>
                          <div className="muted">
                            <strong>Daily Snapshot:</strong> {row.snapshot_date} | Close{" "}
                            {row.daily_close != null ? fmtMoney(row.daily_close) : "-"} | Change{" "}
                            {row.daily_change_pct != null ? `${row.daily_change_pct.toFixed(2)}%` : "-"} | EMA10{" "}
                            {row.daily_ema10 != null ? fmtMoney(row.daily_ema10) : "-"} | EMA20{" "}
                            {row.daily_ema20 != null ? fmtMoney(row.daily_ema20) : "-"}
                          </div>
                          {row.option_symbol && (
                            <div className="muted">
                              <strong>Option:</strong> {row.option_symbol}
                            </div>
                          )}
                          {row.rationale && (
                            <div className="muted">
                              <strong>Setup:</strong> {row.rationale}
                            </div>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashboard-panel mt-4" id="scanner-paper-lab">
          <h2 className="panel-title">Scanner Paper Lab</h2>
          <div className="p-3">
            <div className="muted mb-3">
              Track daily-basis scanner ideas as paper trades, or let the page auto-run a stricter bullish momentum gate.
              Auto-run waits for daily, 1H, 15m, and 3m alignment, then requires a 3-minute Heikin-Ashi red-to-green flip
              before it opens a BUY CE paper trade.
            </div>
            <div className="row g-3 align-items-end mb-3">
              <div className="col-md-3 col-lg-2">
                <label className="form-label">Risk Cap</label>
                <input
                  className="form-control"
                  max={2000}
                  min={1}
                  onChange={(e) => setPaperRiskCapInput(e.target.value)}
                  type="number"
                  value={paperRiskCapInput}
                />
              </div>
              <div className="col-md-9 col-lg-10">
                <div className="muted">
                  Paper-lab stop-loss is recalculated from the row&apos;s R:R and capped at this rupee amount. Default is{" "}
                  {fmtMoney(1500)}, and we clamp anything above {fmtMoney(2000)} back to the max.
                </div>
              </div>
            </div>

            <div className="row g-3 align-items-end mb-4">
              <div className="col-md-3 col-lg-2">
                <label className="form-label">Auto Run</label>
                <div className="form-check form-switch">
                  <input
                    checked={autoEntryEnabled}
                    className="form-check-input"
                    id="scanner-auto-entry-enabled"
                    onChange={(e) => setAutoEntryEnabled(e.target.checked)}
                    type="checkbox"
                  />
                  <label className="form-check-label" htmlFor="scanner-auto-entry-enabled">
                    Enabled
                  </label>
                </div>
              </div>
              <div className="col-md-3 col-lg-2">
                <label className="form-label">Lots</label>
                <input
                  className="form-control"
                  min={1}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, entry_lots: Math.max(1, Number(e.target.value) || 1) }))
                  }
                  type="number"
                  value={form.entry_lots}
                />
              </div>
              <div className="col-md-3 col-lg-2">
                <label className="form-label">Cooldown Min</label>
                <input
                  className="form-control"
                  min={0}
                  onChange={(e) => setAutoEntryCooldownMinutes(Math.max(0, Number(e.target.value) || 0))}
                  type="number"
                  value={autoEntryCooldownMinutes}
                />
              </div>
              <div className="col-md-3 col-lg-2">
                <label className="form-label">Scan Every (s)</label>
                <input
                  className="form-control"
                  min={15}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      auto_scan_interval_seconds: Math.max(15, Number(e.target.value) || 15),
                    }))
                  }
                  type="number"
                  value={form.auto_scan_interval_seconds}
                />
              </div>
              <div className="col-lg-4">
                <div className="d-flex flex-wrap gap-2">
                  <button
                    className="btn btn-outline-light"
                    disabled={autoEntrySaving}
                    onClick={handleSaveAutoEntrySettings}
                    type="button"
                  >
                    {autoEntrySaving ? "Saving..." : "Save Auto Run"}
                  </button>
                  <button
                    className="btn btn-warning"
                    disabled={autoEntryRunning}
                    onClick={handleRunAutoEntryNow}
                    type="button"
                  >
                    {autoEntryRunning ? "Running..." : "Run Auto Check Now"}
                  </button>
                </div>
              </div>
            </div>

            <div className="dashboard-panel subtle mb-4">
              <div className="p-3">
                <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                  <span className={`badge-soft ${autoEntryStatus?.last_run_state === "error" ? "red" : autoEntryEnabled ? "green" : "gold"}`}>
                    {autoEntryStatus?.last_run_state?.toUpperCase() ?? "IDLE"}
                  </span>
                  <span className="muted small">Auto-run opens only bullish BUY CE paper trades after 9:40 AM IST.</span>
                </div>
                <div className="muted">
                  {autoEntryStatus?.last_run_message || "Save the auto-run settings to let the background monitor use the current scanner filters plus the momentum gate."}
                </div>
                <div className="muted small mt-2">
                  Last run {fmtDateTime(autoEntryStatus?.last_run_at)} | Rows {autoEntryStatus?.last_rows_scanned ?? 0} | Candidates{" "}
                  {autoEntryStatus?.last_candidates_considered ?? 0} | Momentum Ready {autoEntryStatus?.last_momentum_ready ?? 0} | Opened{" "}
                  {autoEntryStatus?.last_entries_opened ?? 0}
                </div>
              </div>
            </div>

            {loadingPaperLab && <div className="muted">Loading scanner paper lab...</div>}

            {!loadingPaperLab && paperLab && (
              <>
                <TodayHistoryToolbar
                  view={paperView}
                  onViewChange={setPaperView}
                  preset={paperHistoryPreset}
                  onPresetChange={setPaperHistoryPreset}
                  fromDate={paperHistoryFrom}
                  onFromDateChange={setPaperHistoryFrom}
                  toDate={paperHistoryTo}
                  onToDateChange={setPaperHistoryTo}
                  todayCount={paperTradesToday.length}
                  historyCount={paperTradesHistory.length}
                  historyTotalCount={paperTradesHistoryAll.length}
                />
                <div className="row g-3 mb-4">
                  {paperSummaryCards.map((metric) => (
                    <div className="col-sm-6 col-xl-3" key={metric.label}>
                      <div className="metric-card p-3">
                        <div className="metric-label">{metric.label}</div>
                        <div className="metric-value">{metric.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="table-responsive">
                  <table className="table table-dark-shell align-middle">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Opened</th>
                        <th>Instrument</th>
                        <th>Trade</th>
                        <th>Qty</th>
                        <th>Entry</th>
                        <th>Exit</th>
                        <th>PnL</th>
                        <th>Score</th>
                        <th>Quality</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePaperTrades.length ? (
                        visiblePaperTrades.map((trade) => (
                          <Fragment key={trade.trade_id}>
                            <tr>
                              <td>
                                <span className={`badge-soft ${trade.status === "OPEN" ? "blue" : "gold"}`}>
                                  {trade.status}
                                </span>
                              </td>
                              <td>{fmtDateTime(trade.opened_at)}</td>
                              <td>
                                <div className="fw-semibold">{trade.label}</div>
                                <div className="muted small">{trade.option_symbol ?? trade.instrument_key}</div>
                              </td>
                              <td>
                                <div>{trade.trade_label}</div>
                                <div className="muted small">{trade.market_bias}</div>
                              </td>
                              <td>{fmtNumber(trade.quantity)}</td>
                              <td>{fmtMoney(trade.entry_price)}</td>
                              <td>
                                {trade.status === "OPEN" ? (
                                  <input
                                    className="form-control form-control-sm"
                                    onChange={(e) =>
                                      setExitInputs((prev) => ({ ...prev, [trade.trade_id]: e.target.value }))
                                    }
                                    placeholder="Exit price"
                                    type="number"
                                    value={exitInputs[trade.trade_id] ?? ""}
                                  />
                                ) : trade.exit_price != null ? (
                                  fmtMoney(trade.exit_price)
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>{trade.pnl != null ? fmtMoney(trade.pnl) : "-"}</td>
                              <td>{fmtNumber(trade.selection_score)}</td>
                              <td>
                                {trade.quality ? (
                                  <span className={`badge-soft ${qualityTone(trade.quality)}`}>{trade.quality}</span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>
                                {trade.status === "OPEN" ? (
                                  <button
                                    className="btn btn-sm btn-warning"
                                    disabled={closeActionKey === trade.trade_id}
                                    onClick={() => handleCloseTrade(trade.trade_id)}
                                  >
                                    {closeActionKey === trade.trade_id ? "Closing..." : "Manual Close"}
                                  </button>
                                ) : (
                                  <span className="muted">{trade.close_reason ?? fmtDateTime(trade.closed_at)}</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={11}>
                                <div className="muted">
                                  <strong>Setup:</strong> {trade.scanner_row.rationale ?? trade.scanner_row.status_reason}
                                </div>
                                <div className="muted">
                                  <strong>Snapshot:</strong> {trade.scanner_row.scan_basis.toUpperCase()} | {trade.scanner_row.status} |{" "}
                                  Trend {trade.scanner_row.daily_trend} | R:R{" "}
                                  {trade.rr_ratio != null ? trade.rr_ratio.toFixed(2) : "-"} | Option{" "}
                                  {trade.option_side ?? "-"} | Expiry {trade.scanner_row.resolved_expiry ?? "-"}
                                </div>
                                <div className="muted">
                                  <strong>Risk:</strong> Stop{" "}
                                  {trade.scanner_row.stop_pnl != null ? fmtMoney(Math.abs(trade.scanner_row.stop_pnl * trade.lots)) : "-"}{" "}
                                  | Target{" "}
                                  {trade.scanner_row.target_pnl != null ? fmtMoney(trade.scanner_row.target_pnl * trade.lots) : "-"}{" "}
                                  | Cap{" "}
                                  {trade.scanner_row.risk_cap_amount != null ? fmtMoney(trade.scanner_row.risk_cap_amount) : fmtMoney(1500)}
                                </div>
                              </td>
                            </tr>
                          </Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="empty-state">
                            {paperView === "today"
                              ? "No scanner paper trades visible for today yet."
                              : "No historical scanner paper trades match the selected date range."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
