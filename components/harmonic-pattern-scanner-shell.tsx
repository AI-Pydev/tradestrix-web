"use client";

import {
    HarmonicPatternScanItem,
    HarmonicVisualChartResponse,
    fetchHarmonicPatternScan,
    fetchHarmonicVisualChart,
} from "@/lib/harmonic-pattern-api";
import { useEffect, useMemo, useState } from "react";

export function HarmonicPatternScannerShell() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HarmonicPatternScanItem[]>([]);
  const [timeframe, setTimeframe] = useState("3m");
  const [minQuality, setMinQuality] = useState(0.65);
  const [includeIndices, setIncludeIndices] = useState(true);
  const [includeStocks, setIncludeStocks] = useState(true);
  const [maxStocks, setMaxStocks] = useState(24);

  const [selectedStock, setSelectedStock] = useState<HarmonicPatternScanItem | null>(null);
  const [chartData, setChartData] = useState<HarmonicVisualChartResponse | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchHarmonicPatternScan({
        include_indices: includeIndices,
        include_stocks: includeStocks,
        max_indices: 4,
        max_stocks: maxStocks,
        timeframe,
        min_quality_score: minQuality,
      });
      setResults(resp.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to scan harmonic universe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  const loadVisualChart = async (item: HarmonicPatternScanItem) => {
    setSelectedStock(item);
    setChartLoading(true);
    try {
      const data = await fetchHarmonicVisualChart(item.instrument_key, {
        timeframe: item.timeframe || timeframe,
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
      {/* Header & Controls */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="mb-1 fw-bold text-gradient">Harmonic Pattern Intelligence</h2>
          <p className="text-secondary mb-0">
            Real-time institutional pattern scanner with Potential Reversal Zone (PRZ) clustering & dynamic target ladders.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-primary d-flex align-items-center gap-2 px-3 shadow-sm"
            onClick={runScan}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" />
                <span>Scanning Universe...</span>
              </>
            ) : (
              <>
                <i className="bi bi-radar" />
                <span>Run Live Scan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card shadow-sm border-0 mb-4 bg-surface">
        <div className="card-body py-3">
          <div className="row g-3 align-items-center">
            <div className="col-auto">
              <label className="form-label text-secondary small mb-1">Timeframe</label>
              <select
                className="form-select form-select-sm"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="1m">1 Minute</option>
                <option value="3m">3 Minutes</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
              </select>
            </div>
            <div className="col-auto">
              <label className="form-label text-secondary small mb-1">Min Quality Score</label>
              <select
                className="form-select form-select-sm"
                value={minQuality}
                onChange={(e) => setMinQuality(parseFloat(e.target.value))}
              >
                <option value="0.5">50% (All Formations)</option>
                <option value="0.65">65% (Standard)</option>
                <option value="0.75">75% (High Conviction)</option>
                <option value="0.85">85% (Institutional Strict)</option>
              </select>
            </div>
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
                  Indices (Nifty/BankNifty)
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
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-surface">
            <div className="text-secondary small">Qualified Patterns</div>
            <div className="h3 fw-bold mb-0 text-primary">{summary.total}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-surface">
            <div className="text-secondary small">Bullish Reversals</div>
            <div className="h3 fw-bold mb-0 text-success">{summary.bullish}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-surface">
            <div className="text-secondary small">Bearish Reversals</div>
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

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* Main Content Layout */}
      <div className="row g-4">
        {/* Qualified Stocks Table */}
        <div className={selectedStock ? "col-lg-6" : "col-12"}>
          <div className="card shadow-sm border-0 bg-surface">
            <div className="card-header bg-transparent py-3 border-0">
              <h5 className="mb-0 fw-bold">Active Harmonic Setups</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Symbol</th>
                    <th>Pattern</th>
                    <th>Direction</th>
                    <th>Score</th>
                    <th>Current / PRZ</th>
                    <th>Target 1 / SL</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-secondary">
                        {loading ? "Scanning market..." : "No harmonic patterns currently formed for selected filters."}
                      </td>
                    </tr>
                  ) : (
                    results.map((r, idx) => (
                      <tr
                        key={`${r.instrument_key}-${idx}`}
                        className={selectedStock?.instrument_key === r.instrument_key ? "table-active" : ""}
                      >
                        <td>
                          <div className="fw-bold">{r.label}</div>
                          <span className="badge bg-secondary-subtle text-secondary font-monospace small">
                            {r.timeframe}
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
                            style={{ height: "4px", width: "50px" }}
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
                            onClick={() => loadVisualChart(r)}
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
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 bg-surface sticky-top" style={{ top: "80px" }}>
              <div className="card-header bg-transparent py-3 d-flex justify-content-between align-items-center border-0">
                <div>
                  <h5 className="mb-0 fw-bold">{selectedStock.label} — Harmonic Wave Overlay</h5>
                  <span className="text-secondary small">
                    {selectedStock.pattern_name} ({selectedStock.direction}) | PRZ: ₹{selectedStock.prz_low} - ₹{selectedStock.prz_high}
                  </span>
                </div>
                <button
                  className="btn-close"
                  onClick={() => {
                    setSelectedStock(null);
                    setChartData(null);
                  }}
                />
              </div>
              <div className="card-body">
                {chartLoading ? (
                  <div className="text-center py-5">
                    <span className="spinner-border text-primary" role="status" />
                    <div className="text-secondary small mt-2">Rendering visual harmonic geometry...</div>
                  </div>
                ) : chartData && chartData.candles.length > 0 ? (
                  <div>
                    {/* SVG Interactive Chart Visualizer */}
                    <div className="border rounded bg-dark p-2 mb-3" style={{ height: "320px", position: "relative" }}>
                      <svg width="100%" height="100%" viewBox="0 0 500 280" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="70" x2="500" y2="70" stroke="#333" strokeDasharray="3 3" />
                        <line x1="0" y1="140" x2="500" y2="140" stroke="#333" strokeDasharray="3 3" />
                        <line x1="0" y1="210" x2="500" y2="210" stroke="#333" strokeDasharray="3 3" />

                        {/* Candlestick bars rendering */}
                        {(() => {
                          const candles = chartData.candles.slice(-40);
                          const highs = candles.map((c) => c.high);
                          const lows = candles.map((c) => c.low);
                          const minP = Math.min(...lows);
                          const maxP = Math.max(...highs);
                          const range = maxP - minP || 1.0;
                          const toY = (p: number) => 260 - ((p - minP) / range) * 230;

                          return (
                            <>
                              {/* PRZ shaded zone */}
                              <rect
                                x="0"
                                y={Math.min(toY(selectedStock.prz_low), toY(selectedStock.prz_high))}
                                width="500"
                                height={Math.abs(toY(selectedStock.prz_low) - toY(selectedStock.prz_high)) || 8}
                                fill="rgba(34, 197, 94, 0.15)"
                                stroke="rgba(34, 197, 94, 0.5)"
                                strokeDasharray="4 2"
                              />

                              {/* Candles */}
                              {candles.map((c, i) => {
                                const x = (i / candles.length) * 480 + 10;
                                const isGreen = c.close >= c.open;
                                const yOpen = toY(c.open);
                                const yClose = toY(c.close);
                                const yHigh = toY(c.high);
                                const yLow = toY(c.low);
                                const color = isGreen ? "#22c55e" : "#ef4444";

                                return (
                                  <g key={i}>
                                    <line x1={x + 4} y1={yHigh} x2={x + 4} y2={yLow} stroke={color} strokeWidth="1" />
                                    <rect
                                      x={x}
                                      y={Math.min(yOpen, yClose)}
                                      width="8"
                                      height={Math.max(Math.abs(yOpen - yClose), 2)}
                                      fill={color}
                                    />
                                  </g>
                                );
                              })}

                              {/* Target and Stop Loss lines */}
                              <line
                                x1="0"
                                y1={toY(selectedStock.target_1)}
                                x2="500"
                                y2={toY(selectedStock.target_1)}
                                stroke="#10b981"
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                              />
                              <text x="440" y={toY(selectedStock.target_1) - 4} fill="#10b981" fontSize="10">
                                T1
                              </text>

                              <line
                                x1="0"
                                y1={toY(selectedStock.stop_loss)}
                                x2="500"
                                y2={toY(selectedStock.stop_loss)}
                                stroke="#f43f5e"
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                              />
                              <text x="440" y={toY(selectedStock.stop_loss) - 4} fill="#f43f5e" fontSize="10">
                                SL
                              </text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Coordinates & Target Ladder Details */}
                    <div className="row g-2 small">
                      <div className="col-4">
                        <div className="border rounded p-2 bg-body-tertiary">
                          <div className="text-secondary">Point X / A</div>
                          <div className="fw-bold">₹{selectedStock.x.price} → ₹{selectedStock.a.price}</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="border rounded p-2 bg-body-tertiary">
                          <div className="text-secondary">Point B / C</div>
                          <div className="fw-bold">₹{selectedStock.b.price} → ₹{selectedStock.c.price}</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="border rounded p-2 bg-body-tertiary">
                          <div className="text-secondary">PRZ Zone</div>
                          <div className="fw-bold text-primary">₹{selectedStock.prz_mid}</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="border rounded p-2 bg-success-subtle text-success">
                          <div>Target 1 (38.2%)</div>
                          <div className="fw-bold">₹{selectedStock.target_1}</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="border rounded p-2 bg-success-subtle text-success">
                          <div>Target 2 (61.8%)</div>
                          <div className="fw-bold">₹{selectedStock.target_2}</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="border rounded p-2 bg-danger-subtle text-danger">
                          <div>Terminal Stop Loss</div>
                          <div className="fw-bold">₹{selectedStock.stop_loss}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 text-secondary">No chart data available.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
