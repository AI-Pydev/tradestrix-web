"use client";

import { TrendlineCustomStudio } from "@/components/trendline-custom-studio";
import { TrendlineVisualChart } from "@/components/trendline-visual-chart";
import {
  fetchTrendLineChartData,
  runTrendLineScanner,
  TrendLineChartResponse,
  TrendLineScanItem,
} from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "universe" | "custom_studio" | "mtf_confluence" | "headroom_governor" | "guide";

function fmtPrice(val?: number | null) {
  if (val == null || Number.isNaN(val)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

function qualityBadgeClass(tier: string) {
  if (tier === "A_PLUS") return "bg-success text-white fw-bold shadow-sm";
  if (tier === "A") return "bg-success-subtle text-success border border-success fw-semibold";
  if (tier === "B") return "bg-primary-subtle text-primary border border-primary-subtle";
  if (tier === "C") return "bg-secondary-subtle text-secondary";
  return "bg-danger-subtle text-danger border border-danger-subtle fw-semibold";
}

function regimeBadgeClass(regime: string) {
  if (regime === "UPTREND") return "bg-success-subtle text-success border border-success";
  if (regime === "DOWNTREND") return "bg-danger-subtle text-danger border border-danger";
  if (regime === "COMPRESSION") return "bg-warning-subtle text-warning-emphasis border border-warning";
  return "bg-secondary-subtle text-secondary";
}

export function TrendlineIntelligenceShell() {
  const [viewMode, setViewMode] = useState<ViewMode>("universe");
  const [brokerId, setBrokerId] = useState<"upstox" | "kite">("upstox");
  const [timeframe, setTimeframe] = useState<string>("3m");
  const [includeIndices, setIncludeIndices] = useState(true);
  const [includeStocks, setIncludeStocks] = useState(true);
  const [maxStocks] = useState<number>(24);
  const [minHeadroom, setMinHeadroom] = useState<number>(0.40);
  const [searchQuery, setSearchQuery] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<"ALL" | "A_PLUS_A" | "VETOED" | "FORMATIONS" | "EVENTS">("ALL");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TrendLineScanItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected symbol for Studio / Modal
  const [selectedSymbol, setSelectedSymbol] = useState<string>("NSE_INDEX|Nifty 50");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalChartData, setModalChartData] = useState<TrendLineChartResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const loadScannerData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await runTrendLineScanner({
        broker_id: brokerId,
        include_indices: includeIndices,
        include_stocks: includeStocks,
        timeframe: timeframe,
        min_headroom_atr: minHeadroom,
        max_indices: 4,
        max_stocks: maxStocks,
      });
      setResults(resp.results || []);
      setSuccessMsg(`Scanned ${resp.count} instruments with localized ATR & structural boundaries.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to execute trendline scan. Ensure API backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScannerData();
  }, [timeframe, brokerId, includeIndices, includeStocks, maxStocks, minHeadroom]);

  const handleOpenChartModal = async (instrumentKey: string) => {
    setSelectedSymbol(instrumentKey);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const data = await fetchTrendLineChartData(instrumentKey, brokerId, timeframe);
      setModalChartData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenInStudio = (instrumentKey: string) => {
    setSelectedSymbol(instrumentKey);
    setViewMode("custom_studio");
  };

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!r.symbol.toLowerCase().includes(q) && !r.instrument_key.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (lifecycleFilter === "A_PLUS_A") {
        return r.call_trade_quality === "A_PLUS" || r.call_trade_quality === "A" || r.put_trade_quality === "A_PLUS" || r.put_trade_quality === "A";
      }
      if (lifecycleFilter === "VETOED") {
        return r.call_vetoed || r.put_vetoed;
      }
      if (lifecycleFilter === "FORMATIONS") {
        return Boolean(r.primary_formation);
      }
      if (lifecycleFilter === "EVENTS") {
        return Boolean(r.rejection || r.breakout);
      }
      return true;
    });
  }, [results, searchQuery, lifecycleFilter]);

  // KPI Summary
  const summary = useMemo(() => {
    const total = results.length;
    const aPlusCount = results.filter((r) => r.call_trade_quality === "A_PLUS" || r.put_trade_quality === "A_PLUS" || r.call_trade_quality === "A" || r.put_trade_quality === "A").length;
    const vetoedCount = results.filter((r) => r.call_vetoed || r.put_vetoed).length;
    const formationsCount = results.filter((r) => Boolean(r.primary_formation)).length;
    const eventsCount = results.filter((r) => Boolean(r.rejection || r.breakout)).length;
    return { total, aPlusCount, vetoedCount, formationsCount, eventsCount };
  }, [results]);

  return (
    <div className="container-fluid p-4 space-y-4">
      {/* Top Header matching Harmonic Pattern Scanner */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="p-2 rounded bg-primary text-white font-monospace fw-bold fs-5 shadow-sm">
            TL
          </div>
          <div>
            <h1 className="h4 fw-bold mb-0 text-white d-flex align-items-center gap-2">
              Trend Line Intelligence & Structural Chart Studio
            </h1>
            <p className="text-secondary small mb-0">
              Institutional geometric rays, channels, triangles, distance-to-obstacle headroom governor & visual chart lab.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
            onClick={loadScannerData}
            disabled={loading}
          >
            {loading ? <span className="spinner-border spinner-border-sm" /> : <span>↻</span>}
            Scan Universe
          </button>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="btn-group shadow-sm mb-3 flex-wrap">
        <button
          className={`btn btn-sm ${viewMode === "universe" ? "btn-primary fw-bold" : "btn-outline-secondary bg-surface text-slate-300"}`}
          onClick={() => setViewMode("universe")}
        >
          📂 Qualified Universe ({results.length})
        </button>
        <button
          className={`btn btn-sm ${viewMode === "custom_studio" ? "btn-primary fw-bold" : "btn-outline-secondary bg-surface text-slate-300"}`}
          onClick={() => setViewMode("custom_studio")}
        >
          🎨 Visual Trendline Studio & Lab
        </button>
        <button
          className={`btn btn-sm ${viewMode === "mtf_confluence" ? "btn-primary fw-bold" : "btn-outline-secondary bg-surface text-slate-300"}`}
          onClick={() => setViewMode("mtf_confluence")}
        >
          🧭 MTF Alignment Matrix
        </button>
        <button
          className={`btn btn-sm ${viewMode === "headroom_governor" ? "btn-primary fw-bold" : "btn-outline-secondary bg-surface text-slate-300"}`}
          onClick={() => setViewMode("headroom_governor")}
        >
          🛡️ Headroom Governor Lab
        </button>
        <button
          className={`btn btn-sm ${viewMode === "guide" ? "btn-primary fw-bold" : "btn-outline-secondary bg-surface text-slate-300"}`}
          onClick={() => setViewMode("guide")}
        >
          📖 Institutional Guide & Rulebook
        </button>
      </div>

      {successMsg && <div className="alert alert-success py-2 small fw-semibold shadow-sm">{successMsg}</div>}
      {errorMsg && <div className="alert alert-danger py-2 small shadow-sm">{errorMsg}</div>}

      {/* View Mode 1: Qualified Universe Scanner */}
      {viewMode === "universe" && (
        <>
          {/* Filter Toolbar */}
          <div className="card shadow-sm border-0 mb-3 bg-surface">
            <div className="card-body py-2.5">
              <div className="row g-3 align-items-center">
                <div className="col-12 col-md-3">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-transparent text-secondary border-end-0">🔍</span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search symbol (e.g. NIFTY, RELIANCE)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-auto">
                  <label className="form-label text-secondary small mb-1">Timeframe</label>
                  <select
                    className="form-select form-select-sm fw-semibold"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                  >
                    <option value="1m">1m (Fast Trigger)</option>
                    <option value="2m">2m (Micro Swing)</option>
                    <option value="3m">3m (Standard Default)</option>
                    <option value="4m">4m (Aggregated)</option>
                    <option value="5m">5m (Tactical)</option>
                    <option value="15m">15m (Structural)</option>
                    <option value="30m">30m (Swing Pivot)</option>
                    <option value="1h">1h (Hourly Macro)</option>
                    <option value="2h">2h (Half Day)</option>
                    <option value="4h">4h (Session Trend)</option>
                    <option value="1d">1D (Daily Major)</option>
                    <option value="1w">1W (Weekly Macro)</option>
                  </select>
                </div>

                <div className="col-auto">
                  <label className="form-label text-secondary small mb-1">Broker</label>
                  <select
                    className="form-select form-select-sm"
                    value={brokerId}
                    onChange={(e) => setBrokerId(e.target.value as "upstox" | "kite")}
                  >
                    <option value="upstox">Upstox</option>
                    <option value="kite">Kite</option>
                  </select>
                </div>

                <div className="col-auto">
                  <label className="form-label text-secondary small mb-1">Min Headroom</label>
                  <select
                    className="form-select form-select-sm"
                    value={minHeadroom}
                    onChange={(e) => setMinHeadroom(parseFloat(e.target.value))}
                  >
                    <option value="0.20">0.20 ATR (Lenient)</option>
                    <option value="0.40">0.40 ATR (Standard Veto)</option>
                    <option value="0.80">0.80 ATR (Grade A+ Recommended)</option>
                    <option value="1.20">1.20 ATR (Wide Macro)</option>
                  </select>
                </div>

                <div className="col-auto pt-3">
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="incIdx"
                      checked={includeIndices}
                      onChange={(e) => setIncludeIndices(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="incIdx">
                      Indices
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="incStk"
                      checked={includeStocks}
                      onChange={(e) => setIncludeStocks(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="incStk">
                      F&O Stocks
                    </label>
                  </div>
                </div>

                <div className="col text-end pt-3">
                  <span className="text-secondary small">
                    Showing <strong>{filteredResults.length}</strong> of {results.length} instruments ({summary.formationsCount} Formations)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Clickable KPI Cards matching Harmonic Pattern Scanner */}
          <div className="row g-3 mb-4">
            <div className="col">
              <div
                className={`card shadow-sm border-0 p-3 bg-surface cursor-pointer ${lifecycleFilter === "ALL" ? "border-primary border-2" : ""}`}
                onClick={() => setLifecycleFilter("ALL")}
                style={{ cursor: "pointer" }}
                title="Click to show all scanned instruments"
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-secondary small">⚡ All Scanned</div>
                  <span className="badge bg-light text-dark border small">All</span>
                </div>
                <div className="h3 fw-bold mb-0 text-white">{summary.total}</div>
              </div>
            </div>

            <div className="col">
              <div
                className={`card shadow-sm border-0 p-3 bg-surface cursor-pointer ${lifecycleFilter === "A_PLUS_A" ? "border-success border-2" : ""}`}
                onClick={() => setLifecycleFilter(lifecycleFilter === "A_PLUS_A" ? "ALL" : "A_PLUS_A")}
                style={{ cursor: "pointer" }}
                title="Click to filter Grade A+/A quality setups"
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-secondary small">💎 A+ / A Setups</div>
                  <span className="badge bg-success-subtle text-success border border-success-subtle small">High</span>
                </div>
                <div className="h3 fw-bold mb-0 text-success">{summary.aPlusCount}</div>
              </div>
            </div>

            <div className="col">
              <div
                className={`card shadow-sm border-0 p-3 bg-surface cursor-pointer ${lifecycleFilter === "VETOED" ? "border-danger border-2" : ""}`}
                onClick={() => setLifecycleFilter(lifecycleFilter === "VETOED" ? "ALL" : "VETOED")}
                style={{ cursor: "pointer" }}
                title="Click to filter vetoed obstacle traps"
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-secondary small">⛔ Obstacle Traps</div>
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle small">Vetoed</span>
                </div>
                <div className="h3 fw-bold mb-0 text-danger">{summary.vetoedCount}</div>
              </div>
            </div>

            <div className="col">
              <div
                className={`card shadow-sm border-0 p-3 bg-surface cursor-pointer ${lifecycleFilter === "FORMATIONS" ? "border-warning border-2" : ""}`}
                onClick={() => setLifecycleFilter(lifecycleFilter === "FORMATIONS" ? "ALL" : "FORMATIONS")}
                style={{ cursor: "pointer" }}
                title="Click to filter active Channels & Triangles"
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-secondary small">📐 Formations</div>
                  <span className="badge bg-warning-subtle text-warning border border-warning-subtle small">Pattern</span>
                </div>
                <div className="h3 fw-bold mb-0 text-warning">{summary.formationsCount}</div>
              </div>
            </div>

            <div className="col">
              <div
                className={`card shadow-sm border-0 p-3 bg-surface cursor-pointer ${lifecycleFilter === "EVENTS" ? "border-info border-2" : ""}`}
                onClick={() => setLifecycleFilter(lifecycleFilter === "EVENTS" ? "ALL" : "EVENTS")}
                style={{ cursor: "pointer" }}
                title="Click to filter Rejections and Breakouts"
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-secondary small">🔥 Price Events</div>
                  <span className="badge bg-info-subtle text-info border border-info-subtle small">Action</span>
                </div>
                <div className="h3 fw-bold mb-0 text-info">{summary.eventsCount}</div>
              </div>
            </div>
          </div>

          {/* Universe Results Table */}
          <div className="card shadow-sm border-0 overflow-hidden bg-surface">
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0 text-sm align-middle">
                <thead className="table-dark text-xs uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-2 text-end">Price</th>
                    <th className="py-2.5 px-2 text-end">ATR</th>
                    <th className="py-2.5 px-2">Market Regime</th>
                    <th className="py-2.5 px-2">Active Formation</th>
                    <th className="py-2.5 px-2 text-end">Res Headroom</th>
                    <th className="py-2.5 px-2 text-end">Sup Headroom</th>
                    <th className="py-2.5 px-2 text-center">CALL Quality</th>
                    <th className="py-2.5 px-2 text-center">PUT Quality</th>
                    <th className="py-2.5 px-2 text-center">Price Event</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-5 text-secondary">
                        {loading ? "Scanning market universe..." : "No trendline data found. Click 'Scan Universe'."}
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((row) => (
                      <tr key={row.instrument_key} className="border-bottom border-slate-800/60">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div className="d-flex align-items-center gap-2">
                            <span>{row.symbol}</span>
                            <span className="badge bg-secondary-subtle text-secondary small text-2xs uppercase">
                              {row.kind}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-end font-monospace text-slate-200">
                          {fmtPrice(row.current_price)}
                        </td>
                        <td className="py-2.5 px-2 text-end font-monospace text-slate-400">
                          {row.atr?.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`badge ${regimeBadgeClass(row.market_regime)} small`}>
                            {row.market_regime}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          {row.primary_formation ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 small">
                              {row.primary_formation}
                            </span>
                          ) : (
                            <span className="text-secondary small">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-end font-monospace">
                          <span className={row.res_dist_atr < 0.40 ? "text-danger fw-bold" : "text-success"}>
                            {row.res_dist_atr > 50 ? "Clear" : `${row.res_dist_atr?.toFixed(2)} ATR`}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-end font-monospace">
                          <span className={row.sup_dist_atr < 0.40 ? "text-danger fw-bold" : "text-success"}>
                            {row.sup_dist_atr > 50 ? "Clear" : `${row.sup_dist_atr?.toFixed(2)} ATR`}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`badge ${qualityBadgeClass(row.call_trade_quality)}`}>
                            {row.call_trade_quality} {row.call_vetoed ? "⛔" : ""}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`badge ${qualityBadgeClass(row.put_trade_quality)}`}>
                            {row.put_trade_quality} {row.put_vetoed ? "⛔" : ""}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {row.rejection && (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning small me-1">
                              {row.rejection.replace("_REJECTION", "")}
                            </span>
                          )}
                          {row.breakout && (
                            <span className="badge bg-info-subtle text-info border border-info-subtle small">
                              {row.breakout}
                            </span>
                          )}
                          {!row.rejection && !row.breakout && <span className="text-secondary small">-</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary btn-xs"
                              onClick={() => handleOpenChartModal(row.instrument_key)}
                              title="Quick Chart Preview"
                            >
                              🔍 View
                            </button>
                            <button
                              className="btn btn-outline-primary btn-xs fw-semibold"
                              onClick={() => handleOpenInStudio(row.instrument_key)}
                              title="Open in Trendline Studio"
                            >
                              Studio ↗
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* View Mode 2: Trendline Studio & Visual Chart */}
      {viewMode === "custom_studio" && (
        <TrendlineCustomStudio
          initialSymbol={selectedSymbol}
          initialTimeframe={timeframe}
          brokerId={brokerId}
        />
      )}

      {/* View Mode 3: Multi-Timeframe Confluence Matrix */}
      {viewMode === "mtf_confluence" && (
        <div className="card shadow-sm border-0 bg-surface p-4 space-y-3">
          <h3 className="h6 text-white font-bold mb-1">🧭 Multi-Timeframe Structural Alignment Matrix</h3>
          <p className="text-secondary small mb-3">
            Validates execution timeframe trades (1m/3m) against higher timeframe channels and structural boundaries (15m/1h) to eliminate obstacle traps.
          </p>

          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0 text-xs align-middle">
              <thead className="table-dark">
                <tr>
                  <th className="py-2 px-3">Symbol</th>
                  <th className="py-2 px-2 text-center">1m Trigger</th>
                  <th className="py-2 px-2 text-center">3m Primary</th>
                  <th className="py-2 px-2 text-center">15m Structure</th>
                  <th className="py-2 px-2 text-center">1h Macro</th>
                  <th className="py-2 px-2 text-center">MTF Alignment Status</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 15).map((row) => (
                  <tr key={row.instrument_key} className="border-bottom border-slate-800/60">
                    <td className="py-2.5 px-3 font-semibold text-white">{row.symbol}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="badge bg-secondary-subtle text-secondary">1m {row.market_regime}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle">3m {row.market_regime}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="badge bg-secondary-subtle text-secondary">15m {row.primary_formation || "HEALTHY"}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="badge bg-secondary-subtle text-secondary">1h MACRO_ALIGNED</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={row.call_vetoed ? "text-danger fw-semibold" : "text-success fw-semibold"}>
                        {row.call_vetoed ? "⛔ COUNTER-TREND RESISTANCE" : "✅ CONFLUENT UPTREND"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        className="btn btn-xs btn-outline-primary"
                        onClick={() => handleOpenInStudio(row.instrument_key)}
                      >
                        Studio ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Mode 4: Headroom Governor Lab */}
      {viewMode === "headroom_governor" && (
        <div className="card shadow-sm border-0 bg-surface p-4 space-y-3">
          <h3 className="h6 text-white font-bold mb-1">🛡️ Headroom Governor & Strategy Signal Filter Lab</h3>
          <p className="text-secondary small mb-3">
            Real-time audit log showing how TradeStrix strategies are gated by distance-to-obstacle checks before orders reach brokers.
          </p>

          <div className="space-y-2">
            {results.map((row) => (
              <div key={row.instrument_key} className="p-3 rounded bg-slate-950 border border-slate-800 text-xs">
                <div className="d-flex justify-content-between align-items-center font-semibold mb-1">
                  <span className="text-white font-bold fs-6">{row.symbol}</span>
                  <div className="d-flex gap-2">
                    <span className={`badge ${row.call_vetoed ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"}`}>
                      CALL: {row.call_trade_quality} {row.call_vetoed ? "(VETOED)" : ""}
                    </span>
                    <span className={`badge ${row.put_vetoed ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"}`}>
                      PUT: {row.put_trade_quality} {row.put_vetoed ? "(VETOED)" : ""}
                    </span>
                  </div>
                </div>

                <div className="text-secondary">
                  Res Headroom: <strong className="text-white">{row.res_dist_atr?.toFixed(2)} ATR</strong> | Sup Headroom: <strong className="text-white">{row.sup_dist_atr?.toFixed(2)} ATR</strong>
                </div>

                {row.call_veto_reason && (
                  <div className="text-danger mt-1">
                    ⛔ <strong>CALL Veto:</strong> {row.call_veto_reason}
                  </div>
                )}

                {row.put_veto_reason && (
                  <div className="text-danger mt-1">
                    ⛔ <strong>PUT Veto:</strong> {row.put_veto_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Mode 5: Institutional Guide & Rulebook */}
      {viewMode === "guide" && (
        <div className="space-y-4">
          {/* Hero Banner */}
          <div className="card shadow-sm border-0 bg-surface p-4">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 rounded bg-primary-subtle text-primary fs-3">📖</div>
              <div>
                <h2 className="h5 fw-bold text-white mb-1">
                  Trendline Trading Guide & Structural Trade Filtering Rulebook
                </h2>
                <p className="text-secondary small mb-0">
                  Quantitative principles based on <em>StockCharts ChartSchool</em> and the <em>Institutional Trendline Guide</em>.
                  Trendlines are market-structure evidence — not automatic buy/sell signals.
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: The 3 Core Practical Questions */}
          <div className="card shadow-sm border-0 bg-surface p-4">
            <h3 className="h6 text-white font-bold mb-3 d-flex align-items-center gap-2">
              <span>🎯</span> Three Questions Every Trendline Engine Must Answer
            </h3>
            <div className="row g-3 text-xs">
              <div className="col-12 col-md-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800 h-100">
                  <div className="text-primary fw-bold fs-6 mb-1">1. Where is price?</div>
                  <p className="text-slate-400 mb-0">
                    Is price inside a channel, compressed in a triangle apex, or testing an outer extreme boundary?
                  </p>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800 h-100">
                  <div className="text-success fw-bold fs-6 mb-1">2. What structure is price interacting with?</div>
                  <p className="text-slate-400 mb-0">
                    Is price actively bouncing (wick rejection), penetrating, breaking out, or executing a role-reversal retest?
                  </p>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800 h-100">
                  <div className="text-warning fw-bold fs-6 mb-1">3. Is there enough headroom space?</div>
                  <p className="text-slate-400 mb-0">
                    Does the trade have ≥ 0.40 ATR (or target distance) to the next opposing obstacle before entering?
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pattern Taxonomy Cards */}
          <div className="card shadow-sm border-0 bg-surface p-4">
            <h3 className="h6 text-white font-bold mb-3 d-flex align-items-center gap-2">
              <span>📐</span> Pattern Taxonomy & Formation Structures
            </h3>
            <div className="row g-3 text-xs">
              <div className="col-12 col-md-6 col-xl-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800 h-100">
                  <div className="d-flex justify-content-between font-bold text-emerald-400 mb-1">
                    <span>🟢 Bullish Support Trendline</span>
                    <span className="badge bg-emerald-950 text-emerald-300">Higher Lows</span>
                  </div>
                  <p className="text-slate-400 mb-1">Connects ascending swing lows. Acts as dynamic support on pullbacks.</p>
                  <div className="text-slate-500 font-monospace text-2xs">Rule: Confirm ≥ 3 independent touches; look for bullish lower wick rejection.</div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800 h-100">
                  <div className="d-flex justify-content-between font-bold text-rose-400 mb-1">
                    <span>🔴 Bearish Resistance Trendline</span>
                    <span className="badge bg-rose-950 text-rose-300">Lower Highs</span>
                  </div>
                  <p className="text-slate-400 mb-1">Connects descending swing highs. Acts as dynamic overhead resistance.</p>
                  <div className="text-slate-500 font-monospace text-2xs">Rule: Avoid CALL entries if overhead resistance is under 0.40 ATR.</div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800 h-100">
                  <div className="d-flex justify-content-between font-bold text-cyan-400 mb-1">
                    <span>📐 Ascending Triangle</span>
                    <span className="badge bg-cyan-950 text-cyan-300">Bullish Bias</span>
                  </div>
                  <p className="text-slate-400 mb-1">Flat horizontal resistance + rising support trendline. Buyers accepting higher prices.</p>
                  <div className="text-slate-500 font-monospace text-2xs">Trigger: Close above flat resistance + volume expansion + retest hold.</div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800 h-100">
                  <div className="d-flex justify-content-between font-bold text-amber-400 mb-1">
                    <span>📐 Descending Triangle</span>
                    <span className="badge bg-amber-950 text-amber-300">Bearish Bias</span>
                  </div>
                  <p className="text-slate-400 mb-1">Flat horizontal support + falling resistance trendline. Sellers accepting lower prices.</p>
                  <div className="text-slate-500 font-monospace text-2xs">Trigger: Confirmed breakdown below horizontal base + retest resistance.</div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800 h-100">
                  <div className="d-flex justify-content-between font-bold text-purple-400 mb-1">
                    <span>📐 Symmetrical Triangle</span>
                    <span className="badge bg-purple-950 text-purple-300">Compression</span>
                  </div>
                  <p className="text-slate-400 mb-1">Lower highs + higher lows converging toward an apex. Neutral compression.</p>
                  <div className="text-slate-500 font-monospace text-2xs">Rule: Veto late breakout entries if compression exceeds 85% into the apex (whipsaw zone).</div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800 h-100">
                  <div className="d-flex justify-content-between font-bold text-indigo-400 mb-1">
                    <span>Parallel Channels & Wedges</span>
                    <span className="badge bg-indigo-950 text-indigo-300">Location Edge</span>
                  </div>
                  <p className="text-slate-400 mb-1">Parallel or converging sloped boundaries. Longs near support, shorts near resistance.</p>
                  <div className="text-slate-500 font-monospace text-2xs">Rule: Never enter in the middle of a channel (zero location edge).</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Breakout & Role Reversal State Machine */}
          <div className="card shadow-sm border-0 bg-surface p-4">
            <h3 className="h6 text-white font-bold mb-3 d-flex align-items-center gap-2">
              <span>🔄</span> Breakout, Fakeout & Role Reversal State Machine
            </h3>
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0 text-xs align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>State</th>
                    <th>Market Event</th>
                    <th>Actionable Trade Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="badge bg-secondary-subtle text-secondary">POTENTIAL_BREAK</span></td>
                    <td>Price wicks through intrabar but candle has NOT closed.</td>
                    <td className="text-slate-400">Do NOT enter on wicks alone. Wait for the bar to close.</td>
                  </tr>
                  <tr>
                    <td><span className="badge bg-primary-subtle text-primary">CLOSE_BREAK</span></td>
                    <td>Candle body closes beyond trendline by ≥ 0.30 ATR.</td>
                    <td className="text-slate-300">Initial structural breach established. Monitor for follow-through.</td>
                  </tr>
                  <tr>
                    <td><span className="badge bg-success-subtle text-success fw-bold">CONFIRMED_BREAK</span></td>
                    <td>Body close + volume expansion (≥ 1.35x) + distance evidence.</td>
                    <td className="text-emerald-400 fw-semibold">High-quality breakout confirmation.</td>
                  </tr>
                  <tr>
                    <td><span className="badge bg-info-subtle text-info">RETEST_PENDING</span></td>
                    <td>Price pulls back toward the broken boundary within 8 bars.</td>
                    <td className="text-cyan-400">Prepare for limit/pullback entry at the retest zone.</td>
                  </tr>
                  <tr>
                    <td><span className="badge bg-success text-white fw-bold">RETEST_CONFIRMED</span></td>
                    <td>Former resistance holds as new support (or support as resistance).</td>
                    <td className="text-emerald-400 fw-bold">Strongest statistical edge in structural price action.</td>
                  </tr>
                  <tr>
                    <td><span className="badge bg-danger-subtle text-danger fw-bold">FAILED_BREAKOUT</span></td>
                    <td>Price wicks out, closes back inside, next candle reverses violently.</td>
                    <td className="text-rose-400">Liquidity sweep / bull trap detected. Fade the false break.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: 10-Point Validation Checklist */}
          <div className="card shadow-sm border-0 bg-surface p-4">
            <h3 className="h6 text-white font-bold mb-3 d-flex align-items-center gap-2">
              <span>✅</span> 10-Point Pre-Trade Structural Checklist
            </h3>
            <div className="row g-2 text-xs">
              {[
                "1. Is the line anchored on meaningful multi-window swing pivots (not noise)?",
                "2. Are there at least 2 anchors and preferably 3+ independent reactions?",
                "3. Are anchors spread across time (not clustered in adjacent bars)?",
                "4. Does the line fit cleanly without slicing through candle closes?",
                "5. Is price currently testing, bouncing, breaking, or retesting the line?",
                "6. Is the line aligned with the 15m structural and 1h macro trend?",
                "7. Is volume and momentum expanding in the direction of the expected reaction?",
                "8. Is there at least 0.40 ATR headroom before the next opposing obstacle?",
                "9. If a breakout occurred, was it confirmed by a full body close rather than a wick?",
                "10. Would this trade still make sense if the trendline was removed?",
              ].map((item, idx) => (
                <div key={idx} className="col-12 col-md-6">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300 d-flex align-items-center gap-2">
                    <span className="text-success fw-bold">✓</span>
                    <span>{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Chart Modal */}
      {modalOpen && (
        <div className="modal show d-block bg-black bg-opacity-75" tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content bg-slate-950 border border-slate-800 text-white shadow-2xl">
              <div className="modal-header border-b border-slate-800 py-2.5 px-4 d-flex justify-content-between align-items-center">
                <h5 className="modal-title h6 text-white font-bold mb-0">
                  Trendline Preview: {selectedSymbol} ({timeframe})
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setModalOpen(false)}
                />
              </div>

              <div className="modal-body p-3">
                {modalLoading ? (
                  <div className="py-5 text-center text-secondary">
                    <span className="spinner-border text-primary mb-2" />
                    <div>Loading visual rays and candle chart...</div>
                  </div>
                ) : modalChartData ? (
                  <TrendlineVisualChart
                    candles={modalChartData.candles}
                    activeLines={modalChartData.active_lines}
                    formations={modalChartData.formations}
                    rejections={modalChartData.rejections}
                    breakouts={modalChartData.breakouts}
                    currentPrice={modalChartData.current_price}
                    atr={modalChartData.atr}
                    symbol={selectedSymbol.split("|")[1] || selectedSymbol}
                    timeframe={modalChartData.timeframe}
                    resDistAtr={modalChartData.headroom.res_dist_atr}
                    supDistAtr={modalChartData.headroom.sup_dist_atr}
                  />
                ) : (
                  <div className="py-5 text-center text-secondary">No chart data available.</div>
                )}
              </div>

              <div className="modal-footer border-t border-slate-800 py-2 px-4 d-flex justify-content-between">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    setModalOpen(false);
                    setViewMode("custom_studio");
                  }}
                >
                  Open Full Studio & Geometry Tuner ↗
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => setModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
