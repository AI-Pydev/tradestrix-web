"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HARMONIC_SUPPORTED_TIMEFRAMES,
  HarmonicPatternScanItem,
  HarmonicVisualChartResponse,
  MTFConfluenceReport,
  fetchHarmonicPatternScan,
  fetchHarmonicVisualChart,
  fetchMTFConfluence,
  fetchMTFUniverseConfluence,
  fetchPersistentDBHarmonicPatterns,
  triggerHarmonicAutoScanCycle,
} from "@/lib/harmonic-pattern-api";

export type PatternLifecycleStatus = "ALL" | "OPEN_ACTIVE" | "TARGET_ACHIEVED" | "SL_BREACHED";

export type GroupedHarmonicItem = {
  instrument_key: string;
  label: string;
  kind: "index" | "stock";
  current_price: number;
  patterns_by_tf: Record<string, HarmonicPatternScanItem>;
  primary_pattern: HarmonicPatternScanItem;
  active_timeframes: string[];
};

export function getPatternLifecycle(item: HarmonicPatternScanItem, currentPrice: number): {
  status: "OPEN_ACTIVE" | "TARGET_ACHIEVED" | "SL_BREACHED";
  badgeLabel: string;
  badgeClass: string;
  rowClass: string;
} {
  const isBull = item.direction === "BULLISH";
  const t1 = item.target_1;
  const t2 = item.target_2;
  const sl = item.stop_loss;
  const przLow = item.prz_low;
  const przHigh = item.prz_high;

  // 1. Target Hit check
  const isT2Hit = isBull ? currentPrice >= t2 : currentPrice <= t2;
  const isT1Hit = isBull ? currentPrice >= t1 : currentPrice <= t1;

  if (isT2Hit) {
    return {
      status: "TARGET_ACHIEVED",
      badgeLabel: "🎯 T2 ACHIEVED",
      badgeClass: "bg-success text-white fw-bold",
      rowClass: "bg-success bg-opacity-10 border-start border-success border-3",
    };
  }

  if (isT1Hit) {
    return {
      status: "TARGET_ACHIEVED",
      badgeLabel: "🎯 T1 HIT (Trailing)",
      badgeClass: "bg-success-subtle text-success border border-success fw-bold",
      rowClass: "bg-success bg-opacity-10 border-start border-success border-3",
    };
  }

  // 2. Stop Loss / Invalidation check
  const isSLBreached = isBull ? currentPrice <= sl : currentPrice >= sl;
  if (isSLBreached) {
    return {
      status: "SL_BREACHED",
      badgeLabel: "⚠️ SL BREACHED",
      badgeClass: "bg-warning-subtle text-warning-emphasis border border-warning fw-bold",
      rowClass: "bg-warning bg-opacity-10 border-start border-warning border-3",
    };
  }

  // 3. Open for Trade check
  const inPRZ =
    currentPrice >= Math.min(przLow, przHigh) &&
    currentPrice <= Math.max(przLow, przHigh);

  return {
    status: "OPEN_ACTIVE",
    badgeLabel: inPRZ ? "⚡ IN PRZ ENTRY" : "⚡ ACTIVE SETUP",
    badgeClass: inPRZ
      ? "bg-primary text-white fw-bold"
      : "bg-info-subtle text-info border border-info-subtle",
    rowClass: "bg-surface",
  };
}

export function HarmonicPatternScannerShell() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HarmonicPatternScanItem[]>([]);
  const [viewMode, setViewMode] = useState<"database" | "live" | "mtf_confluence">("database");
  const [mtfReports, setMtfReports] = useState<MTFConfluenceReport[]>([]);
  const [timeframe, setTimeframe] = useState("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<PatternLifecycleStatus>("ALL");
  const [minQuality, setMinQuality] = useState(0.65);
  const [includeIndices, setIncludeIndices] = useState(true);
  const [includeStocks, setIncludeStocks] = useState(true);
  const [maxStocks, setMaxStocks] = useState(24);
  const [dbSummary, setDbSummary] = useState<Record<string, unknown> | null>(
    null
  );

  const [selectedStock, setSelectedStock] = useState<HarmonicPatternScanItem | null>(null);
  const [chartData, setChartData] = useState<HarmonicVisualChartResponse | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [activeChartTf, setActiveChartTf] = useState("3m");
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMtfReport, setActiveMtfReport] = useState<MTFConfluenceReport | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (viewMode === "database") {
        const resp = await fetchPersistentDBHarmonicPatterns({
          timeframe: timeframe === "all" ? undefined : timeframe,
          min_quality: minQuality,
          is_active: true,
          limit: 100,
        });
        setResults(resp.results || []);
        setDbSummary(resp.database_summary);
      } else if (viewMode === "live") {
        const resp = await fetchHarmonicPatternScan({
          include_indices: includeIndices,
          include_stocks: includeStocks,
          max_indices: 4,
          max_stocks: maxStocks,
          timeframe,
          min_quality_score: minQuality,
          workers: 8,
        });
        setResults(resp.results || []);
      } else if (viewMode === "mtf_confluence") {
        const resp = await fetchMTFUniverseConfluence({
          max_indices: includeIndices ? 4 : 0,
          max_stocks: includeStocks ? maxStocks : 0,
          workers: 8,
        });
        setMtfReports(resp.results || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to retrieve harmonic patterns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewMode, timeframe, minQuality, maxStocks, includeIndices, includeStocks]);

  // Handle Esc key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized]);

  const handleTriggerAutoScan = async () => {
    setLoading(true);
    try {
      await triggerHarmonicAutoScanCycle();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run auto scan cycle.");
    } finally {
      setLoading(false);
    }
  };

  // Group multiple timeframe entries by instrument key to eliminate duplicate rows
  const groupedResults = useMemo(() => {
    const map = new Map<string, GroupedHarmonicItem>();

    results.forEach((item) => {
      const existing = map.get(item.instrument_key);
      if (!existing) {
        map.set(item.instrument_key, {
          instrument_key: item.instrument_key,
          label: item.label,
          kind: item.kind,
          current_price: item.current_price,
          patterns_by_tf: { [item.timeframe]: item },
          primary_pattern: item,
          active_timeframes: [item.timeframe],
        });
      } else {
        existing.patterns_by_tf[item.timeframe] = item;
        if (!existing.active_timeframes.includes(item.timeframe)) {
          existing.active_timeframes.push(item.timeframe);
        }
        if (
          item.timeframe === timeframe ||
          (existing.primary_pattern.timeframe !== timeframe &&
            item.quality_score > existing.primary_pattern.quality_score)
        ) {
          existing.primary_pattern = item;
        }
      }
    });

    return Array.from(map.values());
  }, [results, timeframe]);

  // Filter grouped results by trade lifecycle status
  const filteredGroupedResults = useMemo(() => {
    if (lifecycleFilter === "ALL") return groupedResults;
    return groupedResults.filter((g) => {
      const lifecycle = getPatternLifecycle(g.primary_pattern, g.current_price);
      return lifecycle.status === lifecycleFilter;
    });
  }, [groupedResults, lifecycleFilter]);

  // Find all active pattern timeframes for the selected stock
  const selectedStockActivePatterns = useMemo(() => {
    if (!selectedStock) return {};
    const match = groupedResults.find(
      (g) => g.instrument_key === selectedStock.instrument_key
    );
    return match ? match.patterns_by_tf : { [selectedStock.timeframe]: selectedStock };
  }, [selectedStock, groupedResults]);

  const loadVisualChart = async (item: HarmonicPatternScanItem, customTf?: string) => {
    const tf = customTf || item.timeframe || "3m";
    const targetItem = selectedStockActivePatterns[tf] || {
      ...item,
      timeframe: tf,
    };
    setSelectedStock(targetItem);
    setActiveChartTf(tf);
    setChartLoading(true);
    try {
      const [chartResp, mtfResp] = await Promise.allSettled([
        fetchHarmonicVisualChart(targetItem.instrument_key, { timeframe: tf }),
        fetchMTFConfluence(targetItem.instrument_key, { label: targetItem.label }),
      ]);

      if (chartResp.status === "fulfilled") {
        setChartData(chartResp.value);
      }
      if (mtfResp.status === "fulfilled") {
        setActiveMtfReport(mtfResp.value);
      } else {
        setActiveMtfReport(null);
      }
    } catch (err: unknown) {
      console.error("Failed to load visual chart / MTF report:", err);
    } finally {
      setChartLoading(false);
    }
  };

  const summary = useMemo(() => {
    const total = results.length;
    const uniqueSymbols = groupedResults.length;
    let targetAchieved = 0;
    let openActive = 0;
    let slBreached = 0;
    let srConfluentCount = 0;

    groupedResults.forEach((g) => {
      const life = getPatternLifecycle(g.primary_pattern, g.current_price);
      if (life.status === "TARGET_ACHIEVED") targetAchieved++;
      else if (life.status === "SL_BREACHED") slBreached++;
      else openActive++;

      if (g.primary_pattern.sr_confluence) srConfluentCount++;
    });

    const bullish = results.filter((r) => r.direction === "BULLISH").length;
    const bearish = results.filter((r) => r.direction === "BEARISH").length;
    return { total, uniqueSymbols, targetAchieved, openActive, slBreached, srConfluentCount, bullish, bearish };
  }, [results, groupedResults]);

  return (
    <div className="container-fluid p-4">
      {/* Header & Mode Switcher */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="mb-0 fw-bold text-gradient">Harmonic Pattern Intelligence</h2>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
              11 Timeframes (1m → 1M)
            </span>
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
              🔥 Support & Resistance Confluence
            </span>
          </div>
          <p className="text-secondary mb-0 small mt-1">
            Harmonic Reversal Zones validated against <strong>Strong Historical S/R Levels</strong>, Base Reversal ($D$) vs Live LTP, and Option Chain Max OI.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group p-1 bg-body-tertiary rounded border" role="group">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === "database" ? "btn-primary shadow-sm fw-semibold" : "btn-light text-secondary"}`}
              onClick={() => setViewMode("database")}
            >
              <i className="bi bi-database me-1" /> Persistent DB View
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === "live" ? "btn-primary shadow-sm fw-semibold" : "btn-light text-secondary"}`}
              onClick={() => setViewMode("live")}
            >
              <i className="bi bi-broadcast me-1" /> Live Universe Scan
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === "mtf_confluence" ? "btn-primary shadow-sm fw-semibold" : "btn-light text-secondary"}`}
              onClick={() => setViewMode("mtf_confluence")}
            >
              <i className="bi bi-layers-half me-1" /> MTF Confluence Matrix
            </button>
          </div>

          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 px-3"
            onClick={handleTriggerAutoScan}
            disabled={loading}
            title="Scan universe across all 11 timeframes and update database"
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" />
            ) : (
              <i className="bi bi-arrow-repeat" />
            )}
            <span>Sync All TFs to DB</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card shadow-sm border-0 mb-4 bg-surface">
        <div className="card-body py-3">
          <div className="row g-3 align-items-center">
            {viewMode !== "mtf_confluence" && (
              <div className="col-auto">
                <label className="form-label text-secondary small mb-1">Timeframe Selection</label>
                <select
                  className="form-select form-select-sm fw-semibold"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                >
                  {HARMONIC_SUPPORTED_TIMEFRAMES.map((tf) => (
                    <option key={tf.id} value={tf.id}>
                      {tf.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-auto">
              <label className="form-label text-secondary small mb-1">Min Quality Score</label>
              <select
                className="form-select form-select-sm"
                value={minQuality}
                onChange={(e) => setMinQuality(parseFloat(e.target.value))}
              >
                <option value="0.0">All Scores (0%+)</option>
                <option value="0.5">50% (Emerging)</option>
                <option value="0.65">65% (Standard Default)</option>
                <option value="0.75">75% (High Conviction)</option>
                <option value="0.85">85% (Institutional Strict)</option>
              </select>
            </div>
            {viewMode !== "database" && (
              <div className="col-auto">
                <label className="form-label text-secondary small mb-1">Max Stocks</label>
                <select
                  className="form-select form-select-sm"
                  value={maxStocks}
                  onChange={(e) => setMaxStocks(parseInt(e.target.value))}
                >
                  <option value="12">Top 12 Stocks</option>
                  <option value="24">Top 24 Stocks</option>
                  <option value="50">Top 50 F&O Universe</option>
                </select>
              </div>
            )}
            {viewMode !== "database" && (
              <div className="col-auto pt-3">
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includeIndices"
                    checked={includeIndices}
                    onChange={(e) => setIncludeIndices(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="includeIndices">
                    Indices
                  </label>
                </div>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includeStocks"
                    checked={includeStocks}
                    onChange={(e) => setIncludeStocks(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="includeStocks">
                    Equities
                  </label>
                </div>
              </div>
            )}
            <div className="col text-end pt-3">
              <span className="text-secondary small">
                {viewMode === "database" && typeof dbSummary?.latest_update === "string"
                  ? `DB Last Synced: ${new Date(dbSummary.latest_update).toLocaleTimeString()}`
                  : viewMode === "mtf_confluence"
                  ? `Evaluated ${mtfReports.length} MTF setups with Option Chain PCR & OI`
                  : `Showing ${filteredGroupedResults.length} unique symbol(s) (${summary.srConfluentCount} S/R Confluent)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards with Lifecycle & S/R Confluence Breakdown */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div
            className={`card shadow-sm border-0 p-3 bg-surface cursor-pointer ${lifecycleFilter === "OPEN_ACTIVE" ? "ring-2 ring-primary border border-primary" : ""}`}
            onClick={() => setLifecycleFilter(lifecycleFilter === "OPEN_ACTIVE" ? "ALL" : "OPEN_ACTIVE")}
            style={{ cursor: "pointer" }}
            title="Click to filter only open active trade setups (White rows)"
          >
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-secondary small">⚡ Open for Trade (White)</div>
              <span className="badge bg-light text-dark border small">Filter</span>
            </div>
            <div className="h3 fw-bold mb-0 text-primary">{summary.openActive}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className={`card shadow-sm border-0 p-3 bg-surface cursor-pointer ${lifecycleFilter === "TARGET_ACHIEVED" ? "ring-2 ring-success border border-success" : ""}`}
            onClick={() => setLifecycleFilter(lifecycleFilter === "TARGET_ACHIEVED" ? "ALL" : "TARGET_ACHIEVED")}
            style={{ cursor: "pointer" }}
            title="Click to filter targets achieved setups (Light Green rows)"
          >
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-secondary small">🎯 Target Achieved (Green)</div>
              <span className="badge bg-success-subtle text-success border border-success-subtle small">Filter</span>
            </div>
            <div className="h3 fw-bold mb-0 text-success">{summary.targetAchieved}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div
            className={`card shadow-sm border-0 p-3 bg-surface cursor-pointer ${lifecycleFilter === "SL_BREACHED" ? "ring-2 ring-warning border border-warning" : ""}`}
            onClick={() => setLifecycleFilter(lifecycleFilter === "SL_BREACHED" ? "ALL" : "SL_BREACHED")}
            style={{ cursor: "pointer" }}
            title="Click to filter invalidated / SL breached setups (Light Yellow rows)"
          >
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-secondary small">⚠️ SL Breached (Yellow)</div>
              <span className="badge bg-warning-subtle text-warning border border-warning-subtle small">Filter</span>
            </div>
            <div className="h3 fw-bold mb-0 text-warning">{summary.slBreached}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-surface">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-secondary small">🔥 S/R Confluent Setups</div>
              <span className="badge bg-danger-subtle text-danger small">High Edge</span>
            </div>
            <div className="h3 fw-bold mb-0 text-danger">{summary.srConfluentCount}</div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {/* MTF Universe Confluence Mode View */}
      {viewMode === "mtf_confluence" && (
        <div className="card shadow-sm border-0 bg-surface mb-4">
          <div className="card-header bg-transparent py-3 border-0 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Multi-Timeframe Fractal + Option Chain Confluence Matrix</h5>
            <span className="badge bg-primary-subtle text-primary">
              Top-Down Institutional Execution
            </span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Symbol & Macro TF</th>
                  <th>Macro Harmonic Setup</th>
                  <th>PRZ Status</th>
                  <th>3M Micro Signals (RSI & BOS)</th>
                  <th>Option Chain (PCR & OI Buildup)</th>
                  <th>Execution Stage</th>
                  <th>Risk : Reward</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {mtfReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-secondary">
                      {loading
                        ? "Evaluating multi-timeframe fractal confluence & options data across universe..."
                        : "No active macro harmonic patterns found across top universe."}
                    </td>
                  </tr>
                ) : (
                  mtfReports.map((r, idx) => (
                    <tr key={`${r.instrument_key}-${idx}`}>
                      <td>
                        <div className="fw-bold">{r.symbol_label}</div>
                        <span className="badge bg-primary text-white font-monospace small px-2">
                          {r.macro_timeframe.toUpperCase()} Macro
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <span className="badge bg-primary-subtle text-primary fw-semibold">
                            {r.macro_pattern_name}
                          </span>
                          <span
                            className={`badge ${
                              r.direction === "BULLISH" ? "bg-success" : "bg-danger"
                            }`}
                          >
                            {r.direction}
                          </span>
                        </div>
                        <div className="text-secondary small">
                          Quality: <strong>{(r.quality_score * 100).toFixed(0)}%</strong>
                        </div>
                      </td>
                      <td>
                        {r.in_prz ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold">
                            ● IN PRZ (₹{r.prz_low} - ₹{r.prz_high})
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">
                            Target PRZ: ₹{r.prz_mid}
                          </span>
                        )}
                        <div className="small font-monospace text-muted mt-1">LTP: ₹{r.current_price}</div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1 small">
                          <div>
                            <span className="text-secondary">RSI (3M): </span>
                            <span className="fw-bold">{r.rsi_3m}</span>{" "}
                            {r.rsi_divergence !== "NEUTRAL" && (
                              <span className="badge bg-info-subtle text-info small">
                                {r.rsi_divergence}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-secondary">BOS: </span>
                            <span
                              className={`badge ${
                                r.break_of_structure.includes("CONFIRMED")
                                  ? "bg-success"
                                  : "bg-light text-secondary"
                              }`}
                            >
                              {r.break_of_structure}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1 small">
                          {r.pcr_value !== undefined && r.pcr_value !== null ? (
                            <div>
                              <span className="text-secondary">PCR: </span>
                              <strong className={r.pcr_value > 1.3 ? "text-success" : r.pcr_value < 0.7 ? "text-danger" : ""}>
                                {r.pcr_value}
                              </strong>
                              {r.pcr_value > 1.3 && (
                                <span className="badge bg-success-subtle text-success ms-1 small">Oversold Squeeze</span>
                              )}
                              {r.pcr_value < 0.7 && (
                                <span className="badge bg-danger-subtle text-danger ms-1 small">Overbought</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted small">No active options</span>
                          )}
                          {r.oi_buildup && r.oi_buildup !== "NEUTRAL" && (
                            <div>
                              <span
                                className={`badge ${
                                  r.oi_buildup === "SHORT_COVERING"
                                    ? "bg-success text-white"
                                    : r.oi_buildup === "LONG_BUILDUP"
                                    ? "bg-primary text-white"
                                    : r.oi_buildup === "SHORT_BUILDUP"
                                    ? "bg-danger text-white"
                                    : "bg-secondary text-white"
                                }`}
                              >
                                {r.oi_buildup.replace(/_/g, " ")}
                              </span>
                            </div>
                          )}
                          {r.option_support_strike && (
                            <div className="text-muted font-monospace small">
                              Max Put OI: ₹{r.option_support_strike}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {r.readiness_stage === "MICRO_TRIGGER_CONFIRMED" ? (
                          <span className="badge bg-success text-white px-2 py-1 fw-bold">
                            ⚡ TRIGGERED
                          </span>
                        ) : r.readiness_stage === "IN_PRZ_MONITORING" ? (
                          <span className="badge bg-warning text-dark px-2 py-1 fw-bold">
                            ⏳ IN PRZ
                          </span>
                        ) : (
                          <span className="badge bg-secondary text-white px-2 py-1">
                            WATCHLIST
                          </span>
                        )}
                        <div className="progress mt-1" style={{ height: "4px", width: "70px" }}>
                          <div
                            className="progress-bar bg-success"
                            style={{ width: `${r.confluence_score * 100}%` }}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="fw-bold text-success">1 : {r.risk_reward_ratio}</div>
                        <div className="text-danger small">Micro SL: ₹{r.micro_stop_loss}</div>
                        <div className="text-success small">T1: ₹{r.macro_target_1}</div>
                      </td>
                      <td style={{ maxWidth: "260px" }}>
                        <div className="small text-secondary">{r.recommendation}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Layout for Database & Live View (Deduplicated with Timeframe Tabs) */}
      {viewMode !== "mtf_confluence" && (
        <div className="row g-4">
          {/* Qualified Stocks Table (Grouped by Symbol) */}
          <div className={selectedStock && !isMaximized ? "col-lg-5" : "col-12"}>
            <div className="card shadow-sm border-0 bg-surface">
              <div className="card-header bg-transparent py-3 border-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h5 className="mb-0 fw-bold">
                    {viewMode === "database" ? "Database Pattern Registry" : "Live Scanner Findings"}
                  </h5>
                  <span className="text-muted small">
                    {filteredGroupedResults.length} Instruments | Showing:{" "}
                    <strong>
                      {lifecycleFilter === "ALL"
                        ? "All Setups"
                        : lifecycleFilter === "OPEN_ACTIVE"
                        ? "⚡ Open for Trade (White)"
                        : lifecycleFilter === "TARGET_ACHIEVED"
                        ? "🎯 Target Achieved (Green)"
                        : "⚠️ SL Breached (Yellow)"}
                    </strong>
                  </span>
                </div>

                {/* Quick Lifecycle Filter Switcher Pills */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${lifecycleFilter === "ALL" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
                    onClick={() => setLifecycleFilter("ALL")}
                  >
                    All ({groupedResults.length})
                  </button>
                  <button
                    type="button"
                    className={`btn ${lifecycleFilter === "OPEN_ACTIVE" ? "btn-primary fw-bold" : "btn-outline-primary"}`}
                    onClick={() => setLifecycleFilter("OPEN_ACTIVE")}
                  >
                    ⚡ Open ({summary.openActive})
                  </button>
                  <button
                    type="button"
                    className={`btn ${lifecycleFilter === "TARGET_ACHIEVED" ? "btn-success fw-bold" : "btn-outline-success"}`}
                    onClick={() => setLifecycleFilter("TARGET_ACHIEVED")}
                  >
                    🎯 Hit ({summary.targetAchieved})
                  </button>
                  <button
                    type="button"
                    className={`btn ${lifecycleFilter === "SL_BREACHED" ? "btn-warning text-dark fw-bold" : "btn-outline-warning text-dark"}`}
                    onClick={() => setLifecycleFilter("SL_BREACHED")}
                  >
                    ⚠️ SL ({summary.slBreached})
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Symbol & Status</th>
                      <th>Timeframe Formations</th>
                      <th>Base $D$ vs Live LTP</th>
                      <th>Strong S/R Levels</th>
                      <th>Live Target & Risk</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroupedResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-secondary">
                          {loading
                            ? "Scanning multi-timeframe universe..."
                            : "No harmonic patterns matching the current lifecycle filter."}
                        </td>
                      </tr>
                    ) : (
                      filteredGroupedResults.map((group) => {
                        const prim = group.primary_pattern;
                        const isSelected = selectedStock?.instrument_key === group.instrument_key;
                        const isBull = prim.direction === "BULLISH";
                        const basePrice = prim.base_price ?? prim.d?.price ?? prim.prz_mid;
                        const currentPrice = group.current_price;

                        // Lifecycle evaluation for color styling
                        const lifecycle = getPatternLifecycle(prim, currentPrice);

                        // Live remaining points
                        const remT1 = prim.reward_points_t1 ?? (isBull ? prim.target_1 - currentPrice : currentPrice - prim.target_1);
                        const liveRisk = prim.risk_points_sl ?? (isBull ? currentPrice - prim.stop_loss : prim.stop_loss - currentPrice);
                        const liveRR = prim.live_rr_ratio ?? (Math.max(remT1, 0) / Math.max(liveRisk, 0.1));
                        const distFromBase = prim.dist_from_base ?? (isBull ? currentPrice - basePrice : basePrice - currentPrice);

                        return (
                          <tr
                            key={group.instrument_key}
                            className={`${lifecycle.rowClass} ${isSelected ? "ring-2 ring-primary" : ""}`}
                            style={{ transition: "background-color 0.2s ease" }}
                          >
                            <td>
                              <div className="fw-bold">{group.label}</div>
                              <div className="d-flex align-items-center gap-1 mt-1 flex-wrap">
                                <span className={`badge ${lifecycle.badgeClass} small`}>
                                  {lifecycle.badgeLabel}
                                </span>
                                <span className="badge bg-light text-muted border small font-monospace">
                                  {group.kind.toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td>
                              {/* Highlighted Timeframe Tabs for this instrument */}
                              <div className="d-flex flex-wrap gap-1" style={{ maxWidth: "220px" }}>
                                {HARMONIC_SUPPORTED_TIMEFRAMES.filter((t) => t.id !== "all").map((tf) => {
                                  const pat = group.patterns_by_tf[tf.id];
                                  const isCurrentActive =
                                    isSelected && activeChartTf === tf.id;

                                  if (pat) {
                                    const isPatBull = pat.direction === "BULLISH";
                                    return (
                                      <button
                                        key={tf.id}
                                        type="button"
                                        className={`btn btn-xs fw-bold ${
                                          isCurrentActive
                                            ? "btn-primary shadow-sm"
                                            : isPatBull
                                            ? "btn-success-subtle text-success border border-success"
                                            : "btn-danger-subtle text-danger border border-danger"
                                        }`}
                                        style={{ fontSize: "10px", padding: "2px 6px" }}
                                        title={`${tf.label}: ${pat.pattern_name} (${pat.direction}) - ${(pat.quality_score * 100).toFixed(0)}%`}
                                        onClick={() => loadVisualChart(pat, tf.id)}
                                      >
                                        {tf.id.toUpperCase()} ●
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      key={tf.id}
                                      type="button"
                                      className={`btn btn-xs ${
                                        isCurrentActive
                                          ? "btn-primary shadow-sm fw-bold"
                                          : "btn-light text-muted opacity-50"
                                      }`}
                                      style={{ fontSize: "10px", padding: "2px 5px" }}
                                      title={`${tf.label}: No pattern detected (Click to view chart)`}
                                      onClick={() => loadVisualChart(prim, tf.id)}
                                    >
                                      {tf.id.toUpperCase()}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td>
                              <div className="d-flex flex-column gap-1">
                                <div className="d-flex align-items-center gap-1">
                                  <span className="badge bg-primary-subtle text-primary fw-semibold small">
                                    {prim.pattern_name.toUpperCase()}
                                  </span>
                                  <span
                                    className={`badge ${
                                      isBull ? "bg-success" : "bg-danger"
                                    }`}
                                  >
                                    {prim.direction}
                                  </span>
                                </div>
                                <div className="small">
                                  <span className="text-secondary">Base D: </span>
                                  <strong className="text-primary font-monospace">₹{basePrice}</strong>
                                </div>
                                <div className="small">
                                  <span className="text-secondary">Live LTP: </span>
                                  <span className="fw-bold font-monospace">₹{currentPrice}</span>{" "}
                                  <span
                                    className={`badge ${
                                      distFromBase >= 0 ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"
                                    } small font-monospace`}
                                  >
                                    {distFromBase >= 0 ? `+${distFromBase.toFixed(1)}` : distFromBase.toFixed(1)} pts
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              {/* Strong S/R Levels and Confluence Badge */}
                              <div className="d-flex flex-column gap-1 small font-monospace">
                                <div>
                                  <span className="text-secondary">Supp: </span>
                                  <strong className="text-success">
                                    {prim.nearest_support ? `₹${prim.nearest_support}` : "—"}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-secondary">Res: </span>
                                  <strong className="text-danger">
                                    {prim.nearest_resistance ? `₹${prim.nearest_resistance}` : "—"}
                                  </strong>
                                </div>
                                {prim.sr_confluence && (
                                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle small fw-bold">
                                    🔥 S/R CONFLUENT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="d-flex flex-column small font-monospace">
                                <div className="text-success fw-semibold">
                                  T1: ₹{prim.target_1} ({remT1 >= 0 ? `+${remT1.toFixed(1)} pts` : "Hit"})
                                </div>
                                <div className="text-danger">
                                  SL: ₹{prim.stop_loss} ({liveRisk >= 0 ? `-${liveRisk.toFixed(1)} pts` : "Breached"})
                                </div>
                                <div className="text-primary fw-bold">
                                  Live R:R: 1 : {liveRR.toFixed(2)}
                                </div>
                              </div>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => loadVisualChart(prim, prim.timeframe)}
                              >
                                Chart
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Visual Chart View Panel */}
          {selectedStock && (
            <div
              className={
                isMaximized
                  ? "position-fixed top-0 start-0 w-100 h-100 p-3 p-md-4 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center"
                  : "col-lg-7"
              }
              style={isMaximized ? { zIndex: 1060, backdropFilter: "blur(6px)" } : {}}
            >
              <div
                className={`card shadow-lg border-0 bg-surface ${
                  isMaximized ? "w-100 h-100 overflow-auto" : "sticky-top"
                }`}
                style={
                  isMaximized
                    ? { maxWidth: "1500px", maxHeight: "95vh" }
                    : { top: "80px" }
                }
              >
                <div className="card-header bg-transparent py-3 d-flex justify-content-between align-items-center border-bottom">
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h5 className="mb-0 fw-bold">{selectedStock.label} — Harmonic Wave & S/R Confluence</h5>
                      <span
                        className={`badge ${
                          selectedStock.direction === "BULLISH" ? "bg-success" : "bg-danger"
                        }`}
                      >
                        {selectedStock.pattern_name.toUpperCase()} ({selectedStock.direction})
                      </span>
                      {(() => {
                        const life = getPatternLifecycle(selectedStock, selectedStock.current_price);
                        return (
                          <span className={`badge ${life.badgeClass} small`}>
                            {life.badgeLabel}
                          </span>
                        );
                      })()}
                      {selectedStock.sr_confluence && (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle small fw-bold">
                          🔥 S/R ALIGNED
                        </span>
                      )}
                    </div>
                    <span className="text-secondary small">
                      TF: <strong>{activeChartTf.toUpperCase()}</strong> | Base Reversal: ₹
                      {selectedStock.base_price ?? selectedStock.d?.price ?? selectedStock.prz_mid} | Live LTP: ₹
                      {selectedStock.current_price} | Quality:{" "}
                      <strong>{(selectedStock.quality_score * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                      onClick={() => setIsMaximized(!isMaximized)}
                      title={isMaximized ? "Restore default window (Esc)" : "Maximize chart to full screen"}
                    >
                      <i className={`bi ${isMaximized ? "bi-fullscreen-exit" : "bi-arrows-fullscreen"}`} />
                      <span className="d-none d-sm-inline">{isMaximized ? "Restore" : "Maximize"}</span>
                    </button>
                    <button
                      className="btn-close"
                      onClick={() => {
                        setSelectedStock(null);
                        setChartData(null);
                        setIsMaximized(false);
                      }}
                    />
                  </div>
                </div>

                <div className="card-body d-flex flex-column">
                  {/* Highlighted Timeframe Selector Bar for the Selected Stock Chart */}
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <div className="d-flex flex-wrap gap-1">
                      {HARMONIC_SUPPORTED_TIMEFRAMES.filter((t) => t.id !== "all").map((tf) => {
                        const pat = selectedStockActivePatterns[tf.id];
                        const isCurrent = activeChartTf === tf.id;

                        if (pat) {
                          const isBull = pat.direction === "BULLISH";
                          return (
                            <button
                              key={tf.id}
                              className={`btn btn-xs fw-bold ${
                                isCurrent
                                  ? "btn-primary shadow-sm border-light"
                                  : isBull
                                  ? "btn-success-subtle text-success border border-success"
                                  : "btn-danger-subtle text-danger border border-danger"
                              }`}
                              style={{ fontSize: "11px", padding: "3px 9px" }}
                              title={`${tf.label}: Active ${pat.pattern_name} (${pat.direction}) - ${(pat.quality_score * 100).toFixed(0)}%`}
                              onClick={() => loadVisualChart(pat, tf.id)}
                            >
                              ★ {tf.id.toUpperCase()} ({pat.pattern_name.slice(0, 3)})
                            </button>
                          );
                        }

                        return (
                          <button
                            key={tf.id}
                            className={`btn btn-xs ${
                              isCurrent ? "btn-primary fw-bold shadow-sm" : "btn-outline-secondary opacity-75"
                            }`}
                            style={{ fontSize: "11px", padding: "3px 9px" }}
                            title={`${tf.label}: Candlestick chart`}
                            onClick={() => loadVisualChart(selectedStock, tf.id)}
                          >
                            {tf.id.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                    <span className="badge bg-secondary-subtle text-secondary small font-monospace">
                      {chartData?.candles?.length || 0} Candles ({activeChartTf.toUpperCase()})
                    </span>
                  </div>

                  {chartLoading ? (
                    <div className="text-center py-5 my-auto">
                      <span className="spinner-border text-primary" role="status" />
                      <div className="text-secondary small mt-2">
                        Computing XABCD harmonic wave geometry & S/R clusters for {activeChartTf.toUpperCase()}...
                      </div>
                    </div>
                  ) : chartData && chartData.candles.length > 0 ? (
                    <div className="d-flex flex-column flex-grow-1">
                      {/* SVG Interactive Chart Visualizer with XABCD Harmonic Wave Geometry & S/R Levels */}
                      <div
                        className="border rounded bg-dark p-2 mb-3 shadow-inner flex-grow-1 position-relative"
                        style={{ minHeight: isMaximized ? "520px" : "360px" }}
                      >
                        <svg width="100%" height="100%" viewBox={isMaximized ? "0 0 900 480" : "0 0 600 320"} preserveAspectRatio="none">
                          {/* Grid lines */}
                          <line x1="0" y1={isMaximized ? 120 : 80} x2={isMaximized ? 900 : 600} y2={isMaximized ? 120 : 80} stroke="#262626" strokeDasharray="3 3" />
                          <line x1="0" y1={isMaximized ? 240 : 160} x2={isMaximized ? 900 : 600} y2={isMaximized ? 240 : 160} stroke="#262626" strokeDasharray="3 3" />
                          <line x1="0" y1={isMaximized ? 360 : 240} x2={isMaximized ? 900 : 600} y2={isMaximized ? 360 : 240} stroke="#262626" strokeDasharray="3 3" />

                          {(() => {
                            const candleCount = isMaximized ? 75 : 50;
                            const candles = chartData.candles.slice(-candleCount);
                            const highs = candles.map((c) => c.high);
                            const lows = candles.map((c) => c.low);
                            
                            const viewW = isMaximized ? 900 : 600;
                            const viewH = isMaximized ? 480 : 320;
                            const paddingX = isMaximized ? 60 : 40;
                            const chartW = viewW - paddingX * 2;

                            // Include XABCD, PRZ, Targets, and S/R in scale calculation
                            const allPrices = [
                              ...highs,
                              ...lows,
                              selectedStock.x.price,
                              selectedStock.a.price,
                              selectedStock.b.price,
                              selectedStock.c.price,
                              selectedStock.d?.price || selectedStock.prz_mid,
                              selectedStock.prz_low,
                              selectedStock.prz_high,
                              selectedStock.target_1,
                              selectedStock.target_2,
                              selectedStock.stop_loss,
                              ...(chartData.support_levels || []),
                              ...(chartData.resistance_levels || []),
                            ];
                            const minP = Math.min(...allPrices);
                            const maxP = Math.max(...allPrices);
                            const range = maxP - minP || 1.0;
                            const toY = (p: number) => (viewH - 25) - ((p - minP) / range) * (viewH - 60);

                            // Map timestamps to closest candle index for accurate vertex positioning
                            const findCandleX = (targetTime: string, fallbackIdx: number) => {
                              const targetMs = new Date(targetTime).getTime();
                              let bestIdx = fallbackIdx;
                              let bestDiff = Infinity;
                              candles.forEach((c, idx) => {
                                const diff = Math.abs(new Date(c.time).getTime() - targetMs);
                                if (diff < bestDiff) {
                                  bestDiff = diff;
                                  bestIdx = idx;
                                }
                              });
                              return (bestIdx / (candles.length - 1 || 1)) * chartW + paddingX;
                            };

                            const xX = findCandleX(selectedStock.x.time, Math.max(0, candles.length - 40));
                            const yX = toY(selectedStock.x.price);

                            const xA = findCandleX(selectedStock.a.time, Math.max(1, candles.length - 30));
                            const yA = toY(selectedStock.a.price);

                            const xB = findCandleX(selectedStock.b.time, Math.max(2, candles.length - 20));
                            const yB = toY(selectedStock.b.price);

                            const xC = findCandleX(selectedStock.c.time, Math.max(3, candles.length - 10));
                            const yC = toY(selectedStock.c.price);

                            const dPrice = selectedStock.d?.price || selectedStock.prz_mid;
                            const xD = selectedStock.d?.time
                              ? findCandleX(selectedStock.d.time, candles.length - 1)
                              : (viewW - paddingX);
                            const yD = toY(dPrice);

                            // Accurate Institutional Fibonacci Ratios
                            const diffXA = Math.abs(selectedStock.a.price - selectedStock.x.price) || 1;
                            const diffAB = Math.abs(selectedStock.b.price - selectedStock.a.price) || 1;
                            const diffBC = Math.abs(selectedStock.c.price - selectedStock.b.price) || 1;

                            const ratioB = (Math.abs(selectedStock.b.price - selectedStock.a.price) / diffXA).toFixed(3);
                            const ratioC = (Math.abs(selectedStock.c.price - selectedStock.b.price) / diffAB).toFixed(3);
                            const ratioD_BC = (Math.abs(dPrice - selectedStock.c.price) / diffBC).toFixed(3);
                            const ratioD_XA = (Math.abs(dPrice - selectedStock.x.price) / diffXA).toFixed(3);

                            const isBullish = selectedStock.direction === "BULLISH";
                            const tri1Color = isBullish ? "rgba(59, 130, 246, 0.25)" : "rgba(239, 68, 68, 0.25)";
                            const tri2Color = isBullish ? "rgba(34, 197, 94, 0.28)" : "rgba(249, 115, 22, 0.28)";
                            const waveStroke = isBullish ? "#60a5fa" : "#f87171";

                            return (
                              <>
                                {/* 1. Potential Reversal Zone (PRZ) Shaded Box */}
                                <rect
                                  x="0"
                                  y={Math.min(toY(selectedStock.prz_low), toY(selectedStock.prz_high))}
                                  width={viewW}
                                  height={Math.abs(toY(selectedStock.prz_low) - toY(selectedStock.prz_high)) || 10}
                                  fill="rgba(34, 197, 94, 0.18)"
                                  stroke="rgba(34, 197, 94, 0.6)"
                                  strokeDasharray="4 2"
                                />
                                <text
                                  x="10"
                                  y={Math.min(toY(selectedStock.prz_low), toY(selectedStock.prz_high)) + 12}
                                  fill="#22c55e"
                                  fontSize={isMaximized ? "11" : "9"}
                                  fontWeight="bold"
                                >
                                  PRZ Zone: ₹{selectedStock.prz_low} - ₹{selectedStock.prz_high}
                                </text>

                                {/* 2. Horizontal Strong Support Lines */}
                                {chartData.support_levels?.map((sup, idx) => (
                                  <g key={`sup-${idx}`}>
                                    <line
                                      x1="0"
                                      y1={toY(sup)}
                                      x2={viewW}
                                      y2={toY(sup)}
                                      stroke="#22c55e"
                                      strokeWidth="1.2"
                                      strokeDasharray="6 4"
                                      opacity="0.65"
                                    />
                                    <text
                                      x="10"
                                      y={toY(sup) - 4}
                                      fill="#4ade80"
                                      fontSize={isMaximized ? "10" : "8"}
                                      fontWeight="semibold"
                                    >
                                      Major Support: ₹{sup}
                                    </text>
                                  </g>
                                ))}

                                {/* 3. Horizontal Strong Resistance Lines */}
                                {chartData.resistance_levels?.map((res, idx) => (
                                  <g key={`res-${idx}`}>
                                    <line
                                      x1="0"
                                      y1={toY(res)}
                                      x2={viewW}
                                      y2={toY(res)}
                                      stroke="#ef4444"
                                      strokeWidth="1.2"
                                      strokeDasharray="6 4"
                                      opacity="0.65"
                                    />
                                    <text
                                      x="10"
                                      y={toY(res) - 4}
                                      fill="#f87171"
                                      fontSize={isMaximized ? "10" : "8"}
                                      fontWeight="semibold"
                                    >
                                      Major Resistance: ₹{res}
                                    </text>
                                  </g>
                                ))}

                                {/* 4. Shaded Harmonic Dual Triangles (Delta XAB & Delta BCD) */}
                                <polygon
                                  points={`${xX},${yX} ${xA},${yA} ${xB},${yB}`}
                                  fill={tri1Color}
                                  stroke={waveStroke}
                                  strokeWidth="1.5"
                                  strokeDasharray="2 2"
                                />
                                <polygon
                                  points={`${xB},${yB} ${xC},${yC} ${xD},${yD}`}
                                  fill={tri2Color}
                                  stroke={waveStroke}
                                  strokeWidth="1.5"
                                  strokeDasharray="2 2"
                                />

                                {/* 5. Connecting Harmonic Legs (X -> A -> B -> C -> D) */}
                                <polyline
                                  points={`${xX},${yX} ${xA},${yA} ${xB},${yB} ${xC},${yC} ${xD},${yD}`}
                                  fill="none"
                                  stroke={isBullish ? "#38bdf8" : "#fb7185"}
                                  strokeWidth={isMaximized ? "3" : "2.5"}
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                />

                                {/* Dashed baseline from X -> D */}
                                <line
                                  x1={xX}
                                  y1={yX}
                                  x2={xD}
                                  y2={yD}
                                  stroke="#a855f7"
                                  strokeWidth="1.2"
                                  strokeDasharray="4 4"
                                />

                                {/* 6. Candlesticks */}
                                {candles.map((c, i) => {
                                  const x = (i / (candles.length - 1 || 1)) * chartW + paddingX;
                                  const isGreen = c.close >= c.open;
                                  const yOpen = toY(c.open);
                                  const yClose = toY(c.close);
                                  const yHigh = toY(c.high);
                                  const yLow = toY(c.low);
                                  const color = isGreen ? "#22c55e" : "#ef4444";
                                  const candleW = isMaximized ? 9 : 7;

                                  return (
                                    <g key={i}>
                                      <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                                      <rect
                                        x={x - candleW / 2}
                                        y={Math.min(yOpen, yClose)}
                                        width={candleW}
                                        height={Math.max(Math.abs(yOpen - yClose), 2)}
                                        fill={color}
                                        rx="1"
                                      />
                                    </g>
                                  );
                                })}

                                {/* 7. Fibonacci Ratio Badges Right on the Geometric Lines */}
                                <g transform={`translate(${(xA + xB) / 2}, ${(yA + yB) / 2})`}>
                                  <rect x="-24" y="-10" width="48" height="20" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                                  <text x="0" y="4" fill="#38bdf8" fontSize={isMaximized ? "10" : "9"} fontWeight="bold" textAnchor="middle">
                                    {ratioB}
                                  </text>
                                </g>

                                <g transform={`translate(${(xB + xC) / 2}, ${(yB + yC) / 2})`}>
                                  <rect x="-24" y="-10" width="48" height="20" rx="5" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
                                  <text x="0" y="4" fill="#f59e0b" fontSize={isMaximized ? "10" : "9"} fontWeight="bold" textAnchor="middle">
                                    {ratioC}
                                  </text>
                                </g>

                                <g transform={`translate(${(xC + xD) / 2}, ${(yC + yD) / 2})`}>
                                  <rect x="-24" y="-10" width="48" height="20" rx="5" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                                  <text x="0" y="4" fill="#10b981" fontSize={isMaximized ? "10" : "9"} fontWeight="bold" textAnchor="middle">
                                    {ratioD_BC}
                                  </text>
                                </g>

                                <g transform={`translate(${(xX + xD) / 2}, ${(yX + yD) / 2})`}>
                                  <rect x="-28" y="-10" width="56" height="20" rx="5" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1.5" />
                                  <text x="0" y="4" fill="#c084fc" fontSize={isMaximized ? "10" : "9"} fontWeight="bold" textAnchor="middle">
                                    {ratioD_XA} XA
                                  </text>
                                </g>

                                {/* 8. Fibonacci Target Ladder Lines */}
                                <line
                                  x1="0"
                                  y1={toY(selectedStock.target_1)}
                                  x2={viewW}
                                  y2={toY(selectedStock.target_1)}
                                  stroke="#10b981"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 4"
                                />
                                <text
                                  x={viewW - 90}
                                  y={toY(selectedStock.target_1) - 4}
                                  fill="#10b981"
                                  fontSize={isMaximized ? "11" : "10"}
                                  fontWeight="bold"
                                >
                                  T1: ₹{selectedStock.target_1}
                                </text>

                                <line
                                  x1="0"
                                  y1={toY(selectedStock.target_2)}
                                  x2={viewW}
                                  y2={toY(selectedStock.target_2)}
                                  stroke="#059669"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 4"
                                />
                                <text
                                  x={viewW - 90}
                                  y={toY(selectedStock.target_2) - 4}
                                  fill="#059669"
                                  fontSize={isMaximized ? "11" : "10"}
                                  fontWeight="bold"
                                >
                                  T2: ₹{selectedStock.target_2}
                                </text>

                                {/* Stop Loss Line */}
                                <line
                                  x1="0"
                                  y1={toY(selectedStock.stop_loss)}
                                  x2={viewW}
                                  y2={toY(selectedStock.stop_loss)}
                                  stroke="#f43f5e"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 4"
                                />
                                <text
                                  x={viewW - 90}
                                  y={toY(selectedStock.stop_loss) - 4}
                                  fill="#f43f5e"
                                  fontSize={isMaximized ? "11" : "10"}
                                  fontWeight="bold"
                                >
                                  SL: ₹{selectedStock.stop_loss}
                                </text>

                                {/* 9. Vertex Markers & Labels for X, A, B, C, D */}
                                {[
                                  { label: "X", x: xX, y: yX, price: selectedStock.x.price, bg: "#3b82f6" },
                                  { label: "A", x: xA, y: yA, price: selectedStock.a.price, bg: "#8b5cf6" },
                                  { label: "B", x: xB, y: yB, price: selectedStock.b.price, bg: "#06b6d4" },
                                  { label: "C", x: xC, y: yC, price: selectedStock.c.price, bg: "#f59e0b" },
                                  {
                                    label: selectedStock.d ? "D" : "D (PRZ)",
                                    x: xD,
                                    y: yD,
                                    price: dPrice,
                                    bg: "#10b981",
                                  },
                                ].map((pt, idx) => (
                                  <g key={idx}>
                                    <circle
                                      cx={pt.x}
                                      cy={pt.y}
                                      r={isMaximized ? "9" : "7"}
                                      fill={pt.bg}
                                      stroke="#ffffff"
                                      strokeWidth="2"
                                    />
                                    <text
                                      x={pt.x}
                                      y={pt.y + (isMaximized ? 4 : 3.5)}
                                      fill="#ffffff"
                                      fontSize={isMaximized ? "10" : "8"}
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      {pt.label}
                                    </text>
                                    <text
                                      x={pt.x}
                                      y={pt.y > 50 ? pt.y - (isMaximized ? 14 : 11) : pt.y + (isMaximized ? 22 : 18)}
                                      fill="#e2e8f0"
                                      fontSize={isMaximized ? "11" : "9"}
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      ₹{pt.price}
                                    </text>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      </div>

                      {/* Top-Down MTF + Option Chain Confluence Confirmation Card */}
                      {activeMtfReport && (
                        <div className="card border-primary border-opacity-25 bg-primary-subtle bg-opacity-10 p-3 mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-primary">MTF + OI Confluence Engine</span>
                              <span className="fw-bold small">
                                Macro {activeMtfReport.macro_timeframe.toUpperCase()} {activeMtfReport.macro_pattern_name} → Micro 3M Confirmation
                              </span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span
                                className={`badge ${
                                  activeMtfReport.readiness_stage === "MICRO_TRIGGER_CONFIRMED"
                                    ? "bg-success text-white"
                                    : activeMtfReport.readiness_stage === "IN_PRZ_MONITORING"
                                    ? "bg-warning text-dark"
                                    : "bg-secondary text-white"
                                }`}
                              >
                                {activeMtfReport.readiness_stage.replace(/_/g, " ")}
                              </span>
                              <span className="badge bg-success font-monospace">
                                1 : {activeMtfReport.risk_reward_ratio} RRR
                              </span>
                            </div>
                          </div>

                          <div className="row g-2 small">
                            <div className="col-12 col-md-3">
                              <div className="border rounded p-2 bg-body">
                                <div className="text-secondary">PRZ Status</div>
                                <div className="fw-bold">
                                  {activeMtfReport.in_prz ? (
                                    <span className="text-success">● Inside PRZ (Reversal Ready)</span>
                                  ) : (
                                    <span className="text-muted">○ Approaching PRZ</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="col-12 col-md-3">
                              <div className="border rounded p-2 bg-body">
                                <div className="text-secondary">3M Micro Signals</div>
                                <div className="fw-bold">
                                  RSI: {activeMtfReport.rsi_3m} ({activeMtfReport.rsi_divergence}) | {activeMtfReport.break_of_structure}
                                </div>
                              </div>
                            </div>
                            <div className="col-12 col-md-3">
                              <div className="border rounded p-2 bg-body">
                                <div className="text-secondary">Option Chain & PCR</div>
                                <div className="fw-bold">
                                  {activeMtfReport.pcr_value !== undefined && activeMtfReport.pcr_value !== null ? (
                                    <>
                                      <span>PCR {activeMtfReport.pcr_value}</span>{" "}
                                      {activeMtfReport.oi_buildup && (
                                        <span className="badge bg-primary-subtle text-primary small">
                                          {activeMtfReport.oi_buildup.replace(/_/g, " ")}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-muted">Equity Cash Context</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="col-12 col-md-3">
                              <div className="border rounded p-2 bg-body">
                                <div className="text-secondary">Micro Execution Risk</div>
                                <div className="fw-bold text-danger">
                                  Micro SL: ₹{activeMtfReport.micro_stop_loss} (T1: ₹{activeMtfReport.macro_target_1})
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-primary small fw-semibold">
                            💡 {activeMtfReport.recommendation}
                          </div>
                        </div>
                      )}

                      {/* Explicit Base Price vs Live LTP Execution Tracker & S/R Confluence */}
                      {(() => {
                        const isBull = selectedStock.direction === "BULLISH";
                        const baseP = selectedStock.base_price ?? selectedStock.d?.price ?? selectedStock.prz_mid;
                        const curP = selectedStock.current_price;
                        const remT1 = isBull ? selectedStock.target_1 - curP : curP - selectedStock.target_1;
                        const remT2 = isBull ? selectedStock.target_2 - curP : curP - selectedStock.target_2;
                        const liveRisk = isBull ? curP - selectedStock.stop_loss : selectedStock.stop_loss - curP;
                        const distBase = isBull ? curP - baseP : baseP - curP;
                        const liveRR = Math.max(remT1, 0) / Math.max(liveRisk, 0.1);

                        return (
                          <div className="card border-0 bg-body-tertiary p-3 mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold small text-primary">
                                  🎯 Base Reversal ($D$) Anchor vs Live Market Execution
                                </span>
                                {selectedStock.sr_confluence && (
                                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle small fw-bold">
                                    🔥 S/R CONFLUENT
                                  </span>
                                )}
                              </div>
                              <span className="badge bg-dark font-monospace">
                                Live R:R: 1 : {liveRR.toFixed(2)}
                              </span>
                            </div>
                            <div className="row g-2 small">
                              <div className="col-6 col-md-3">
                                <div className="border rounded p-2 bg-body">
                                  <div className="text-secondary">Base Reversal Price ($D$)</div>
                                  <div className="fw-bold text-primary font-monospace">₹{baseP}</div>
                                  <div className="text-muted small">Pattern Anchor</div>
                                </div>
                              </div>
                              <div className="col-6 col-md-3">
                                <div className="border rounded p-2 bg-body">
                                  <div className="text-secondary">Current Live LTP</div>
                                  <div className="fw-bold font-monospace">₹{curP}</div>
                                  <div className={`small ${distBase >= 0 ? "text-success" : "text-warning"}`}>
                                    {distBase >= 0 ? `+${distBase.toFixed(1)} pts bounced` : `${distBase.toFixed(1)} pts to PRZ`}
                                  </div>
                                </div>
                              </div>
                              <div className="col-6 col-md-3">
                                <div className="border rounded p-2 bg-body">
                                  <div className="text-success">Remaining to Target 1 & 2</div>
                                  <div className="fw-bold font-monospace text-success">
                                    T1: ₹{selectedStock.target_1} ({remT1 >= 0 ? `+${remT1.toFixed(1)}` : "Hit"}) | T2: ₹{selectedStock.target_2} ({remT2 >= 0 ? `+${remT2.toFixed(1)}` : "Hit"})
                                  </div>
                                  <div className="text-muted small">38.2% & 61.8% CD Extension</div>
                                </div>
                              </div>
                              <div className="col-6 col-md-3">
                                <div className="border rounded p-2 bg-body">
                                  <div className="text-danger">Current Risk to Stop Loss</div>
                                  <div className="fw-bold font-monospace text-danger">
                                    ₹{selectedStock.stop_loss} ({liveRisk >= 0 ? `-${liveRisk.toFixed(1)} pts` : "Breached"})
                                  </div>
                                  <div className="text-muted small">Terminal Invalidation</div>
                                </div>
                              </div>
                            </div>

                            {/* Strong Support & Resistance Summary Row */}
                            <div className="row g-2 small mt-2">
                              <div className="col-12 col-md-6">
                                <div className="border rounded p-2 bg-body d-flex justify-content-between align-items-center">
                                  <span className="text-secondary">Major Support Floor:</span>
                                  <strong className="text-success font-monospace">
                                    {selectedStock.nearest_support ? `₹${selectedStock.nearest_support}` : "— (No major support below)"}
                                  </strong>
                                </div>
                              </div>
                              <div className="col-12 col-md-6">
                                <div className="border rounded p-2 bg-body d-flex justify-content-between align-items-center">
                                  <span className="text-secondary">Major Resistance Ceiling:</span>
                                  <strong className="text-danger font-monospace">
                                    {selectedStock.nearest_resistance ? `₹${selectedStock.nearest_resistance}` : "— (Clean air above)"}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Coordinates & Target Ladder Details */}
                      <div className="row g-2 small">
                        <div className="col-6 col-md-4">
                          <div className="border rounded p-2 bg-body-tertiary">
                            <div className="text-secondary">Point X → A Swing</div>
                            <div className="fw-bold">
                              ₹{selectedStock.x.price} → ₹{selectedStock.a.price}
                            </div>
                          </div>
                        </div>
                        <div className="col-6 col-md-4">
                          <div className="border rounded p-2 bg-body-tertiary">
                            <div className="text-secondary">Point B → C Retracement</div>
                            <div className="fw-bold">
                              ₹{selectedStock.b.price} → ₹{selectedStock.c.price}
                            </div>
                          </div>
                        </div>
                        <div className="col-6 col-md-4">
                          <div className="border rounded p-2 bg-body-tertiary">
                            <div className="text-secondary">Point D Predicted PRZ</div>
                            <div className="fw-bold text-primary">₹{selectedStock.prz_mid} (₹{selectedStock.prz_low} - ₹{selectedStock.prz_high})</div>
                          </div>
                        </div>
                        <div className="col-6 col-md-4">
                          <div className="border rounded p-2 bg-success-subtle text-success">
                            <div>Target 1 (38.2% CD)</div>
                            <div className="fw-bold">₹{selectedStock.target_1}</div>
                          </div>
                        </div>
                        <div className="col-6 col-md-4">
                          <div className="border rounded p-2 bg-success-subtle text-success">
                            <div>Target 2 (61.8% CD)</div>
                            <div className="fw-bold">₹{selectedStock.target_2}</div>
                          </div>
                        </div>
                        <div className="col-6 col-md-4">
                          <div className="border rounded p-2 bg-danger-subtle text-danger">
                            <div>Terminal Stop Loss (X-Exceed)</div>
                            <div className="fw-bold">₹{selectedStock.stop_loss}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5 text-secondary">
                      No chart data available for {activeChartTf.toUpperCase()}.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
