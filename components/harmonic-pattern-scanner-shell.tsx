"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HARMONIC_SUPPORTED_TIMEFRAMES,
  HarmonicPatternScanItem,
  HarmonicVisualChartResponse,
  fetchHarmonicPatternScan,
  fetchHarmonicVisualChart,
  fetchPersistentDBHarmonicPatterns,
  triggerHarmonicAutoScanCycle,
} from "@/lib/harmonic-pattern-api";

export function HarmonicPatternScannerShell() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HarmonicPatternScanItem[]>([]);
  const [viewMode, setViewMode] = useState<"database" | "live">("database");
  const [timeframe, setTimeframe] = useState("all");
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
      } else {
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
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to retrieve harmonic patterns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewMode, timeframe, minQuality, maxStocks]);

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

  const loadVisualChart = async (item: HarmonicPatternScanItem, customTf?: string) => {
    const tf = customTf || item.timeframe || "3m";
    setSelectedStock(item);
    setActiveChartTf(tf);
    setChartLoading(true);
    try {
      const data = await fetchHarmonicVisualChart(item.instrument_key, {
        timeframe: tf,
      });
      setChartData(data);
    } catch (err: unknown) {
      console.error("Failed to load visual chart:", err);
    } finally {
      setChartLoading(false);
    }
  };

  const summary = useMemo(() => {
    const total = results.length;
    const bullish = results.filter((r) => r.direction === "BULLISH").length;
    const bearish = results.filter((r) => r.direction === "BEARISH").length;
    const highQuality = results.filter((r) => r.quality_score >= 0.8).length;
    return { total, bullish, bearish, highQuality };
  }, [results]);

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
          </div>
          <p className="text-secondary mb-0 small mt-1">
            Auto-scanning & real-time DB persistence across Month, Week, Day, 4h, 2h, 1h, 30m, 15m, 5m, 3m, 1m.
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
            {viewMode === "live" && (
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
            {viewMode === "live" && (
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
                  : `Showing ${results.length} active pattern(s)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-surface">
            <div className="text-secondary small">Active Formations</div>
            <div className="h3 fw-bold mb-0 text-primary">{summary.total}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-surface">
            <div className="text-secondary small">Bullish Setups</div>
            <div className="h3 fw-bold mb-0 text-success">{summary.bullish}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-surface">
            <div className="text-secondary small">Bearish Setups</div>
            <div className="h3 fw-bold mb-0 text-danger">{summary.bearish}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-surface">
            <div className="text-secondary small">High Conviction (≥80%)</div>
            <div className="h3 fw-bold mb-0 text-warning">{summary.highQuality}</div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {/* Main Layout */}
      <div className="row g-4">
        {/* Qualified Stocks Table */}
        <div className={selectedStock && !isMaximized ? "col-lg-5" : "col-12"}>
          <div className="card shadow-sm border-0 bg-surface">
            <div className="card-header bg-transparent py-3 border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">
                {viewMode === "database" ? "Database Pattern Registry" : "Live Scanner Findings"}
              </h5>
              <span className="badge bg-secondary-subtle text-secondary small">
                Timeframe: {timeframe.toUpperCase()}
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Symbol & TF</th>
                    <th>Pattern</th>
                    <th>Direction</th>
                    <th>Quality</th>
                    <th>LTP / PRZ</th>
                    <th>Targets / SL</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-secondary">
                        {loading
                          ? "Scanning multi-timeframe universe..."
                          : "No active harmonic patterns matching the selected filters. Click 'Sync All TFs to DB' to trigger a full refresh."}
                      </td>
                    </tr>
                  ) : (
                    results.map((r, idx) => (
                      <tr
                        key={`${r.instrument_key}-${r.timeframe}-${idx}`}
                        className={
                          selectedStock?.instrument_key === r.instrument_key &&
                          selectedStock?.timeframe === r.timeframe
                            ? "table-active"
                            : ""
                        }
                      >
                        <td>
                          <div className="fw-bold">{r.label}</div>
                          <span className="badge bg-primary text-white font-monospace small px-2">
                            {r.timeframe.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary fw-semibold">
                            {r.pattern_name.toUpperCase()}
                          </span>
                          <div className="text-muted small font-monospace">{r.state}</div>
                        </td>
                        <td>
                          {r.direction === "BULLISH" ? (
                            <span className="badge bg-success text-white">BULLISH</span>
                          ) : (
                            <span className="badge bg-danger text-white">BEARISH</span>
                          )}
                        </td>
                        <td>
                          <div className="fw-bold">{(r.quality_score * 100).toFixed(0)}%</div>
                          <div
                            className="progress"
                            style={{ height: "4px", width: "45px" }}
                          >
                            <div
                              className={`progress-bar ${
                                r.quality_score >= 0.8
                                  ? "bg-success"
                                  : r.quality_score >= 0.7
                                  ? "bg-primary"
                                  : "bg-warning"
                              }`}
                              style={{ width: `${r.quality_score * 100}%` }}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold">₹{r.current_price}</div>
                          <div className="text-secondary small font-monospace">
                            ₹{r.prz_low} - ₹{r.prz_high}
                          </div>
                        </td>
                        <td>
                          <div className="text-success small fw-semibold">T1: ₹{r.target_1}</div>
                          <div className="text-danger small">SL: ₹{r.stop_loss}</div>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => loadVisualChart(r, r.timeframe)}
                          >
                            Chart
                          </button>
                        </td>
                      </tr>
                    ))
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
                    <h5 className="mb-0 fw-bold">{selectedStock.label} — Harmonic Wave Geometry</h5>
                    <span
                      className={`badge ${
                        selectedStock.direction === "BULLISH" ? "bg-success" : "bg-danger"
                      }`}
                    >
                      {selectedStock.pattern_name.toUpperCase()} ({selectedStock.direction})
                    </span>
                    <span className="badge bg-info-subtle text-info border border-info-subtle small">
                      {selectedStock.state === "APPROACHING_PRZ" || !selectedStock.d
                        ? "Point D: Predicted Completion (PRZ)"
                        : "Point D: Confirmed Reversal"}
                    </span>
                  </div>
                  <span className="text-secondary small">
                    TF: <strong>{activeChartTf.toUpperCase()}</strong> | PRZ Reversal Zone: ₹
                    {selectedStock.prz_low} - ₹{selectedStock.prz_high} | Quality:{" "}
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
                {/* Timeframe selector bar for the chart */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <div className="d-flex flex-wrap gap-1">
                    {HARMONIC_SUPPORTED_TIMEFRAMES.filter((t) => t.id !== "all").map((tf) => (
                      <button
                        key={tf.id}
                        className={`btn btn-xs ${
                          activeChartTf === tf.id ? "btn-primary fw-bold shadow-sm" : "btn-outline-secondary"
                        }`}
                        style={{ fontSize: "11px", padding: "3px 9px" }}
                        onClick={() => loadVisualChart(selectedStock, tf.id)}
                      >
                        {tf.id.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <span className="badge bg-secondary-subtle text-secondary small font-monospace">
                    {chartData?.candles?.length || 0} Candles ({activeChartTf.toUpperCase()})
                  </span>
                </div>

                {chartLoading ? (
                  <div className="text-center py-5 my-auto">
                    <span className="spinner-border text-primary" role="status" />
                    <div className="text-secondary small mt-2">
                      Computing XABCD harmonic wave geometry for {activeChartTf.toUpperCase()}...
                    </div>
                  </div>
                ) : chartData && chartData.candles.length > 0 ? (
                  <div className="d-flex flex-column flex-grow-1">
                    {/* SVG Interactive Chart Visualizer with XABCD Harmonic Wave Geometry */}
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

                          // Include XABCD, PRZ, and Targets in scale calculation
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

                              {/* 2. Shaded Harmonic Dual Triangles (Delta XAB & Delta BCD) */}
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

                              {/* 3. Connecting Harmonic Legs (X -> A -> B -> C -> D) */}
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

                              {/* 4. Candlesticks */}
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

                              {/* 5. Fibonacci Target Ladder Lines */}
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

                              {/* 6. Vertex Markers & Labels for X, A, B, C, D */}
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
    </div>
  );
}
