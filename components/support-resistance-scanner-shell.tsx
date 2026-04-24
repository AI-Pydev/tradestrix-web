"use client";

import { Fragment, startTransition, useEffect, useState } from "react";

import { TodayHistoryToolbar } from "@/components/today-history-toolbar";
import {
    closeSupportResistanceTrade,
    createSupportResistanceTrade,
    fetchInstrumentCatalog,
    fetchSupportResistanceTradeLabDashboard,
    InstrumentCatalogResponse,
    runSupportResistanceScanner,
    SupportResistanceScannerResponse,
    SupportResistanceScannerRow,
    SupportResistanceTradeActionRequest,
    SupportResistanceTradeLabDashboard,
    SupportResistanceTradeRecord,
} from "@/lib/api";
import { HistoryPreset, HistoryView, localDateKey, matchesHistoryWindow, parseIsoDate } from "@/lib/history-window";

function fmtNumber(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function fmtPrice(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
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

function badgeTone(status: string) {
  if (status === "NEAR_SUPPORT") {
    return "text-bg-success";
  }
  if (status === "NEAR_RESISTANCE") {
    return "text-bg-danger";
  }
  if (status === "ERROR") {
    return "text-bg-dark";
  }
  return "text-bg-warning";
}

function readinessTone(readiness: string) {
  if (readiness === "strong") {
    return "text-bg-success";
  }
  if (readiness === "tradable") {
    return "text-bg-warning";
  }
  if (readiness === "weak") {
    return "text-bg-secondary";
  }
  return "text-bg-dark";
}

function qualityTone(quality?: string | null) {
  if (quality === "A") {
    return "badge-soft green";
  }
  if (quality === "B") {
    return "badge-soft gold";
  }
  if (quality === "C") {
    return "badge-soft blue";
  }
  return "badge-soft blue";
}

function metricTone(label: string) {
  if (label === "Near Support" || label === "Near Resistance" || label === "Tradable" || label === "Strong") {
    return "positive";
  }
  if (label === "Errors") {
    return "negative";
  }
  return "";
}

function distanceText(distancePct?: number | null, distanceAtr?: number | null) {
  const pct = distancePct == null ? "-" : `${fmtNumber(distancePct, 3)}%`;
  const atr = distanceAtr == null ? "-" : `${fmtNumber(distanceAtr, 3)} ATR`;
  return `${pct} / ${atr}`;
}

function recommendedAction(row: SupportResistanceScannerRow): Exclude<SupportResistanceTradeActionRequest["action"], "auto"> | null {
  if (row.status === "NEAR_SUPPORT" || row.closest_zone === "support") {
    return "buy_ce";
  }
  if (row.status === "NEAR_RESISTANCE" || row.closest_zone === "resistance") {
    return "buy_pe";
  }
  return null;
}

function resolveAction(row: SupportResistanceScannerRow, action: SupportResistanceTradeActionRequest["action"]) {
  if (action === "auto") {
    return recommendedAction(row);
  }
  return action;
}

function actionLabel(action: Exclude<SupportResistanceTradeActionRequest["action"], "auto"> | null) {
  if (action === "buy_ce") {
    return "BUY CE";
  }
  if (action === "buy_pe") {
    return "BUY PE";
  }
  return "No Action";
}

function paperTradeTone(status: SupportResistanceTradeRecord["status"]) {
  return status === "OPEN" ? "badge-soft blue" : "badge-soft gold";
}

function fmtPercentValue(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  return `${fmtNumber(value * 100, 2)}%`;
}

type ScannerFormState = {
  broker_id: "upstox" | "kite";
  include_indices: boolean;
  include_stocks: boolean;
  max_indices: number;
  max_stocks: number;
  verified_only: boolean;
  intraday_history_days: number;
  daily_history_days: number;
  require_close_above_ema10: boolean;
  entry_lots: number;
  min_quality: "A" | "B" | "C";
  max_entry_ltp: number;
  max_total_entry_amount: number | null;
  risk_model: "dynamic" | "fixed" | "risk_amount";
  risk_amount: number | null;
  sl_premium_pct: number;
  target_premium_pct: number;
  workers: number;
};

const TRADE_LAB_REFRESH_MS = 15000;

export function SupportResistanceScannerShell() {
  const [catalog, setCatalog] = useState<InstrumentCatalogResponse | null>(null);
  const [result, setResult] = useState<SupportResistanceScannerResponse | null>(null);
  const [tradeLab, setTradeLab] = useState<SupportResistanceTradeLabDashboard | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingTradeLab, setLoadingTradeLab] = useState(true);
  const [scanRunning, setScanRunning] = useState(false);
  const [error, setError] = useState("");
  const [tradeLabError, setTradeLabError] = useState("");
  const [trackActionKey, setTrackActionKey] = useState("");
  const [closeActionKey, setCloseActionKey] = useState("");
  const [entryActions, setEntryActions] = useState<Record<string, SupportResistanceTradeActionRequest["action"]>>({});
  const [exitInputs, setExitInputs] = useState<Record<string, string>>({});
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
    verified_only: true,
    intraday_history_days: 5,
    daily_history_days: 120,
    require_close_above_ema10: false,
    entry_lots: 1,
    min_quality: "B",
    max_entry_ltp: 1000,
    max_total_entry_amount: null,
    risk_model: "dynamic",
    risk_amount: null,
    sl_premium_pct: 0.2,
    target_premium_pct: 0.36,
    workers: 6,
  });

  const paperRows = tradeLab?.trades ?? [];
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

    async function loadTradeLab() {
      try {
        setLoadingTradeLab(true);
        const response = await fetchSupportResistanceTradeLabDashboard();
        if (!active) {
          return;
        }
        setTradeLab(response);
        setTradeLabError("");
      } catch (err) {
        if (!active) {
          return;
        }
        setTradeLabError(err instanceof Error ? err.message : "Failed to load S/R paper entries");
      } finally {
        if (active) {
          setLoadingTradeLab(false);
        }
      }
    }

    loadTradeLab();
    const intervalId = window.setInterval(loadTradeLab, TRADE_LAB_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleRunScan() {
    try {
      setScanRunning(true);
      setError("");
      const response = await runSupportResistanceScanner(form);
      startTransition(() => {
        setResult(response);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run support/resistance scanner");
    } finally {
      setScanRunning(false);
    }
  }

  async function refreshTradeLab() {
    const response = await fetchSupportResistanceTradeLabDashboard();
    setTradeLab(response);
  }

  async function handleCreateEntry(row: SupportResistanceScannerRow) {
    const selectedAction = entryActions[row.instrument_key] ?? "auto";
    const effectiveAction = resolveAction(row, selectedAction);
    if (effectiveAction == null) {
      setTradeLabError("No direct BUY CE or BUY PE action is recommended for this row yet.");
      return;
    }

    try {
      setTrackActionKey(`${row.instrument_key}:${effectiveAction}`);
      setTradeLabError("");
      await createSupportResistanceTrade({
        broker_id: form.broker_id,
        row,
        action: selectedAction,
        lots: form.entry_lots,
        min_quality: form.min_quality,
        max_entry_ltp: form.max_entry_ltp,
        max_total_entry_amount: form.max_total_entry_amount,
        risk_model: form.risk_model,
        risk_amount: form.risk_amount,
        sl_premium_pct: form.sl_premium_pct,
        target_premium_pct: form.target_premium_pct,
      });
      await refreshTradeLab();
    } catch (err) {
      setTradeLabError(err instanceof Error ? err.message : "Failed to create S/R paper entry");
    } finally {
      setTrackActionKey("");
    }
  }

  async function handleCloseTrade(tradeId: string) {
    const rawValue = (exitInputs[tradeId] ?? "").trim();
    const exitPrice = Number(rawValue);
    if (!rawValue || !Number.isFinite(exitPrice) || exitPrice <= 0) {
      setTradeLabError("Enter a valid exit price before closing the S/R paper entry.");
      return;
    }

    try {
      setCloseActionKey(tradeId);
      setTradeLabError("");
      await closeSupportResistanceTrade(tradeId, {
        exit_price: exitPrice,
        reason: "manual_close",
      });
      setExitInputs((prev) => {
        const next = { ...prev };
        delete next[tradeId];
        return next;
      });
      await refreshTradeLab();
    } catch (err) {
      setTradeLabError(err instanceof Error ? err.message : "Failed to close S/R paper entry");
    } finally {
      setCloseActionKey("");
    }
  }

  const summaryCards = result
    ? [
        { label: "Snapshot", value: fmtDateTime(result.summary.snapshot_time) },
        { label: "Scanned", value: result.summary.scanned_instruments },
        { label: "Near Support", value: result.summary.near_support_count },
        { label: "Near Resistance", value: result.summary.near_resistance_count },
        { label: "Tradable", value: result.summary.tradable_count },
        { label: "Strong", value: result.summary.strong_count },
        { label: "Between", value: result.summary.between_levels_count },
        { label: "Errors", value: result.summary.error_count },
      ]
    : [];

  const visibleOpenEntries = visiblePaperTrades.filter((t) => t.status === "OPEN");
  const visibleClosedEntries = visiblePaperTrades.filter((t) => t.status === "CLOSED");
  const visibleEntryWins = visibleClosedEntries.filter((t) => (t.pnl ?? 0) > 0);
  const visibleEntryLosses = visibleClosedEntries.filter((t) => (t.pnl ?? 0) < 0);
  const visibleEntryRealizedPnl = visibleClosedEntries.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const visibleEntryTotalLoss = visibleEntryLosses.reduce((sum, t) => sum + Math.abs(t.pnl ?? 0), 0);
  const visibleEntryWinRate =
    visibleClosedEntries.length > 0 ? (visibleEntryWins.length / visibleClosedEntries.length) * 100 : 0;
  const visibleEntryTrackedSymbols = new Set(visiblePaperTrades.map((t) => t.instrument_key)).size;

  const tradeSummaryCards = [
    { label: "Tracked Entries", value: visiblePaperTrades.length },
    { label: "Open Entries", value: visibleOpenEntries.length },
    { label: "Closed Entries", value: visibleClosedEntries.length },
    { label: "Wins", value: visibleEntryWins.length },
    { label: "Losses", value: visibleEntryLosses.length },
    { label: "Win Rate", value: `${visibleEntryWinRate.toFixed(1)}%` },
    { label: "Realized PnL", value: fmtPrice(visibleEntryRealizedPnl) },
    { label: "Total Loss", value: fmtPrice(visibleEntryTotalLoss) },
    { label: "Tracked Symbols", value: visibleEntryTrackedSymbols },
  ];
  const riskPreviewPerLot = form.risk_amount != null && form.entry_lots > 0 ? form.risk_amount / form.entry_lots : null;

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="sr-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#sr-top">
              Overview
            </a>
            <a className="hero-tab" href="#sr-controls">
              Controls
            </a>
            <a className="hero-tab" href="#sr-results">
              Ranked Table
            </a>
            <a className="hero-tab" href="#sr-paper-lab">
              S/R Entries
            </a>
            <a className="hero-tab" href="#sr-notes">
              Notes
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">3-Minute Support / Resistance Scanner</h1>
            <p className="hero-subtitle">
              Separate intraday scanner focused on 3-minute support and resistance proximity, without changing the
              existing daily opportunity page.
            </p>
          </div>
          <div className="p-3">
            <div className="row g-3">
              <div className="col-lg-8">
                <div className="dashboard-panel h-100" id="sr-controls">
                  <h2 className="panel-title">Scanner Controls</h2>
                  <div className="p-3">
                    <div className="row g-3">
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
                        <label className="form-label">Primary Timeframe</label>
                        <input className="form-control" disabled readOnly type="text" value="3m" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Validation</label>
                        <input className="form-control" disabled readOnly type="text" value="15m / 1D / 1W" />
                      </div>
                      <div className="col-md-3">
                        <div className="form-check mt-4">
                          <input
                            checked={form.verified_only}
                            className="form-check-input"
                            id="sr-verified-only"
                            onChange={(e) => setForm((prev) => ({ ...prev, verified_only: e.target.checked }))}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="sr-verified-only">
                            Verified Only
                          </label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-check mt-4">
                          <input
                            checked={form.require_close_above_ema10}
                            className="form-check-input"
                            id="sr-close-above-ema10"
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, require_close_above_ema10: e.target.checked }))
                            }
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="sr-close-above-ema10">
                            EMA10 / EMA20 Bias Filter
                          </label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-check mt-2">
                          <input
                            checked={form.include_indices}
                            className="form-check-input"
                            id="sr-include-indices"
                            onChange={(e) => setForm((prev) => ({ ...prev, include_indices: e.target.checked }))}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="sr-include-indices">
                            Include Indices
                          </label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-check mt-2">
                          <input
                            checked={form.include_stocks}
                            className="form-check-input"
                            id="sr-include-stocks"
                            onChange={(e) => setForm((prev) => ({ ...prev, include_stocks: e.target.checked }))}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="sr-include-stocks">
                            Include Stocks
                          </label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Max Indices</label>
                        <input
                          className="form-control"
                          max={20}
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
                          max={200}
                          min={0}
                          onChange={(e) => setForm((prev) => ({ ...prev, max_stocks: Number(e.target.value) || 0 }))}
                          type="number"
                          value={form.max_stocks}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Intraday History Days</label>
                        <input
                          className="form-control"
                          max={20}
                          min={2}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, intraday_history_days: Number(e.target.value) || 2 }))
                          }
                          type="number"
                          value={form.intraday_history_days}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Daily History Days</label>
                        <input
                          className="form-control"
                          max={365}
                          min={20}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, daily_history_days: Number(e.target.value) || 20 }))
                          }
                          type="number"
                          value={form.daily_history_days}
                        />
                      </div>
                      <div className="col-md-4">
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
                      <div className="col-md-4">
                        <label className="form-label">Entry Lots</label>
                        <input
                          className="form-control"
                          max={20}
                          min={1}
                          onChange={(e) => setForm((prev) => ({ ...prev, entry_lots: Number(e.target.value) || 1 }))}
                          type="number"
                          value={form.entry_lots}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Max Total Entry</label>
                        <input
                          className="form-control"
                          min={1}
                          placeholder="Unlimited"
                          type="number"
                          value={form.max_total_entry_amount ?? ""}
                          onChange={(e) => {
                            const next = e.target.value.trim();
                            setForm((prev) => ({
                              ...prev,
                              max_total_entry_amount: next ? Math.max(Number(next) || 0, 0) : null,
                            }));
                          }}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Risk Model</label>
                        <select
                          className="form-select"
                          value={form.risk_model}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              risk_model: e.target.value as ScannerFormState["risk_model"],
                            }))
                          }
                        >
                          <option value="dynamic">Dynamic</option>
                          <option value="fixed">Fixed %</option>
                          <option value="risk_amount">Risk Amount (₹)</option>
                        </select>
                      </div>
                      {form.risk_model === "risk_amount" && (
                        <div className="col-md-4">
                          <label className="form-label">Risk Amount (₹)</label>
                          <input
                            className="form-control"
                            min={1}
                            placeholder="e.g. 1000"
                            type="number"
                            value={form.risk_amount ?? ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                risk_amount: e.target.value ? Number(e.target.value) : null,
                              }))
                            }
                          />
                        </div>
                      )}
                      <div className="col-md-4">
                        <label className="form-label">Min Option Quality</label>
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
                      <div className="col-md-4">
                        <label className="form-label">Max Option LTP</label>
                        <input
                          className="form-control"
                          min={1}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, max_entry_ltp: Number(e.target.value) || 1 }))
                          }
                          type="number"
                          value={form.max_entry_ltp}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">SL Premium %</label>
                        <input
                          className="form-control"
                          step="0.01"
                          type="number"
                          value={form.sl_premium_pct}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, sl_premium_pct: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Target Premium %</label>
                        <input
                          className="form-control"
                          step="0.01"
                          type="number"
                          value={form.target_premium_pct}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, target_premium_pct: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div className="col-12 d-flex gap-2">
                        <button className="btn btn-warning" disabled={scanRunning} onClick={handleRunScan}>
                          {scanRunning ? "Scanning..." : "Run 3M S/R Scan"}
                        </button>
                        <div className="muted align-self-center">
                          {loadingCatalog
                            ? "Loading available universe..."
                            : `Available universe: ${catalog?.indices.length ?? 0} indices, ${catalog?.stocks.length ?? 0} stocks`}
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="small muted">
                          Paper entries use these filters for candidate selection, size capping, and auto-exit target /
                          stop handling inside the S/R trade lab.
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="border rounded p-3 small" style={{ borderColor: "var(--line)" }}>
                          <div className="fw-semibold mb-2">Effective Exit Preview</div>
                          {form.risk_model === "dynamic" ? (
                            <div className="muted">
                              Dynamic mode uses the scanner-selected candidate&apos;s built-in stop-loss and target.
                            </div>
                          ) : null}
                          {form.risk_model === "fixed" ? (
                            <div className="muted">
                              Fixed mode uses premium-based exits: stop at entry premium minus {fmtPercentValue(form.sl_premium_pct)},
                              target at entry premium plus {fmtPercentValue(form.target_premium_pct)}.
                            </div>
                          ) : null}
                          {form.risk_model === "risk_amount" ? (
                            <div className="muted">
                              Risk amount mode caps stop-loss to {fmtPrice(form.risk_amount)} total
                              {riskPreviewPerLot != null ? ` (${fmtPrice(riskPreviewPerLot)} per lot at ${fmtNumber(form.entry_lots, 0)} lot)` : ""}
                              , while target still uses +{fmtPercentValue(form.target_premium_pct)} on premium.
                            </div>
                          ) : null}
                          <div className="muted mt-2">
                            Size cap:{" "}
                            {form.max_total_entry_amount != null
                              ? `${fmtPrice(form.max_total_entry_amount)} maximum total entry`
                              : "no max total entry cap"}
                            .
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="dashboard-panel h-100" id="sr-notes">
                  <h2 className="panel-title">Scanner Notes</h2>
                  <div className="p-3 muted">
                    This page treats 3-minute candles as the primary source of truth. Strength comes from 3m pivots,
                    repeated touches, wick rejection, volume reaction, and confluence with VWAP, EMA, 15m, daily, and
                    weekly structure.
                    <div className="mt-3">
                      Nearness prefers ATR first. A level is treated as near when the latest price is within roughly 0.4
                      ATR on the 3m series, with percentage distance as a fallback.
                    </div>
                    <div className="mt-3">
                      Action controls on this page create isolated S/R paper entries only. Open entries are monitored
                      for automatic target, stop-loss, and time-exit closes without affecting the daily scanner paper
                      lab or any live execution page.
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

        {tradeLabError && (
          <div className="alert alert-danger" role="alert">
            {tradeLabError}
          </div>
        )}

        {result && (
          <>
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
            <div className="muted mb-4">
              Broker: {result.summary.broker_id.toUpperCase()} | Basis: {result.summary.scan_basis} | Timeframes:{" "}
              {result.summary.validation_timeframes.join(" / ")} | Duration: {result.summary.duration_seconds}s
            </div>
          </>
        )}

        <section className="dashboard-panel" id="sr-results">
          <h2 className="panel-title">Ranked 3M Proximity Table</h2>
          {!result && <div className="empty-state">Run the scanner to populate the 3-minute support/resistance table.</div>}
          {result && (
            <div className="table-responsive">
              <table className="table table-dark-shell align-middle">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Instrument</th>
                    <th>Current</th>
                    <th>Support Zone</th>
                    <th>Resistance Zone</th>
                    <th>3M Context</th>
                    <th>Confluence</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => {
                    const selectedAction = entryActions[row.instrument_key] ?? "auto";
                    const effectiveAction = resolveAction(row, selectedAction);
                    const canTrack = effectiveAction != null;
                    const actionKey = `${row.instrument_key}:${effectiveAction ?? "none"}`;

                    return (
                      <Fragment key={row.instrument_key}>
                        <tr>
                          <td>
                            <div className="d-flex flex-column gap-2">
                              <span className={`badge ${badgeTone(row.status)}`}>{row.status.replaceAll("_", " ")}</span>
                              <span className={`badge ${readinessTone(row.trade_readiness)}`}>
                                {row.trade_readiness.toUpperCase()}
                              </span>
                              <span className="muted">Score {fmtNumber(row.selection_score, 1)}</span>
                            </div>
                          </td>
                          <td>
                            <div className="fw-semibold">{row.label}</div>
                            <div className="muted text-uppercase">
                              {row.kind} {row.verified ? "| verified" : ""}
                            </div>
                            <div className="muted">{row.instrument_key}</div>
                          </td>
                          <td>
                            <div>{fmtPrice(row.current_price)}</div>
                            <div className="muted">Closest: {row.closest_zone}</div>
                            <div className="muted">Snapshot: {fmtDateTime(row.snapshot_time)}</div>
                          </td>
                          <td>
                            <div>{fmtPrice(row.nearest_support)}</div>
                            <div className="muted">
                              Strength {row.support_strength_score ?? "-"} | Touches {row.support_touch_count ?? "-"}
                            </div>
                            <div className="muted">{distanceText(row.support_distance_pct, row.support_distance_atr)}</div>
                            <div className="muted">{row.support_sources.join(", ") || "-"}</div>
                          </td>
                          <td>
                            <div>{fmtPrice(row.nearest_resistance)}</div>
                            <div className="muted">
                              Strength {row.resistance_strength_score ?? "-"} | Touches {row.resistance_touch_count ?? "-"}
                            </div>
                            <div className="muted">
                              {distanceText(row.resistance_distance_pct, row.resistance_distance_atr)}
                            </div>
                            <div className="muted">{row.resistance_sources.join(", ") || "-"}</div>
                          </td>
                          <td>
                            <div>ATR: {fmtNumber(row.atr_3m, 3)}</div>
                            <div>VWAP: {fmtPrice(row.vwap_3m)}</div>
                            <div>EMA9: {fmtPrice(row.ema9_3m)}</div>
                            <div>EMA10: {fmtPrice(row.ema10_3m)}</div>
                            <div>EMA20: {fmtPrice(row.ema20_3m)}</div>
                            <div>EMA50: {fmtPrice(row.ema50_3m)}</div>
                          </td>
                          <td>
                            <div>Prev Low: {fmtPrice(row.previous_session_low)}</div>
                            <div>Prev High: {fmtPrice(row.previous_session_high)}</div>
                            <div className="muted">Daily Align: {row.daily_alignment ? "Yes" : "No"}</div>
                            <div className="muted">Weekly Align: {row.weekly_alignment ? "Yes" : "No"}</div>
                          </td>
                          <td className="text-wrap">
                            {row.status_reason}
                          </td>
                          <td>
                            <div className="d-grid gap-2">
                              <select
                                className="form-select form-select-sm"
                                onChange={(e) =>
                                  setEntryActions((prev) => ({
                                    ...prev,
                                    [row.instrument_key]: e.target.value as SupportResistanceTradeActionRequest["action"],
                                  }))
                                }
                                value={selectedAction}
                              >
                                <option value="auto">Auto ({actionLabel(recommendedAction(row))})</option>
                                <option value="buy_ce">BUY CE</option>
                                <option value="buy_pe">BUY PE</option>
                              </select>
                              <button
                                className="btn btn-sm btn-outline-light"
                                disabled={!canTrack || trackActionKey === actionKey}
                                onClick={() => handleCreateEntry(row)}
                              >
                                {trackActionKey === actionKey ? "Creating..." : `Track ${actionLabel(effectiveAction)}`}
                              </button>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={9}>
                            <div className="muted">
                              <strong>Suggested action:</strong> {actionLabel(recommendedAction(row))} | Entry filters:{" "}
                              {form.entry_lots} lot, min quality {form.min_quality}, max option LTP{" "}
                              {fmtPrice(form.max_entry_ltp)} | Risk model {form.risk_model}
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashboard-panel mt-4" id="sr-paper-lab">
          <h2 className="panel-title">S/R Paper Entries</h2>
          <div className="p-3">
            <div className="muted mb-3">
              Use the result-table actions to track 3-minute support/resistance ideas as isolated paper entries. Open
              entries are monitored for automatic target, stop-loss, and time-exit closes, and manual close remains
              available as an override.
            </div>

            {loadingTradeLab && <div className="muted">Loading S/R paper entries...</div>}

            {!loadingTradeLab && tradeLab && (
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
                  {tradeSummaryCards.map((metric) => (
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
                                <span className={paperTradeTone(trade.status)}>{trade.status}</span>
                              </td>
                              <td>{fmtDateTime(trade.opened_at)}</td>
                              <td>
                                <div className="fw-semibold">{trade.label}</div>
                                <div className="muted small">{trade.option_symbol}</div>
                              </td>
                              <td>
                                <div>{trade.trade_label}</div>
                                <div className="muted small">{trade.market_bias}</div>
                              </td>
                              <td>{fmtNumber(trade.quantity)}</td>
                              <td>{fmtPrice(trade.entry_price)}</td>
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
                                  fmtPrice(trade.exit_price)
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>{trade.pnl != null ? fmtPrice(trade.pnl) : "-"}</td>
                              <td>
                                {trade.quality ? <span className={qualityTone(trade.quality)}>{trade.quality}</span> : "-"}
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
                              <td colSpan={10}>
                                <div className="muted">
                                  <strong>Snapshot:</strong> {trade.scanner_row.status} | {trade.scanner_row.closest_zone} |{" "}
                                  Score {fmtNumber(trade.selection_score, 1)} | Readiness {trade.trade_readiness}
                                </div>
                                <div className="muted">
                                  <strong>Option:</strong> {trade.option_symbol} | Expiry {trade.resolved_expiry} | Strike{" "}
                                  {fmtNumber(trade.strike, 0)} | R:R {trade.rr_ratio != null ? fmtNumber(trade.rr_ratio) : "-"}
                                </div>
                                <div className="muted">
                                  <strong>Why:</strong> {trade.rationale}
                                </div>
                              </td>
                            </tr>
                          </Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="empty-state">
                            {paperView === "today"
                              ? "No S/R paper entries visible for today yet."
                              : "No historical S/R paper entries match the selected date range."}
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
