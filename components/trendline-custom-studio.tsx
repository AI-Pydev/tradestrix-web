"use client";

import { TrendlineVisualChart } from "@/components/trendline-visual-chart";
import {
    fetchTrendLineCatalog,
    fetchTrendLineChartData,
    runTrendLineSandbox,
    TrendLineCatalogItem,
    TrendLineChartResponse,
    TrendLineSandboxResult,
} from "@/lib/api";
import { useEffect, useState } from "react";

export interface TrendlineCustomStudioProps {
  initialSymbol?: string;
  initialTimeframe?: string;
  brokerId?: "upstox" | "kite";
}

export function TrendlineCustomStudio({
  initialSymbol = "NSE_INDEX|Nifty 50",
  initialTimeframe = "3m",
  brokerId = "upstox",
}: TrendlineCustomStudioProps) {
  const [selectedKey, setSelectedKey] = useState<string>(initialSymbol);
  const [timeframe, setTimeframe] = useState<string>(initialTimeframe);
  const [broker, setBroker] = useState<"upstox" | "kite">(brokerId);
  const [catalog, setCatalog] = useState<{ indices: TrendLineCatalogItem[]; stocks: TrendLineCatalogItem[] }>({
    indices: [],
    stocks: [],
  });
  const [chartData, setChartData] = useState<TrendLineChartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sandbox parameter state
  const [sandboxWindow, setSandboxWindow] = useState(2);
  const [sandboxHeadroom, setSandboxHeadroom] = useState(0.40);
  const [sandboxTolerance, setSandboxTolerance] = useState(0.10);
  const [sandboxResult, setSandboxResult] = useState<TrendLineSandboxResult | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // Load catalog on mount
  useEffect(() => {
    fetchTrendLineCatalog()
      .then((res) => {
        setCatalog({ indices: res.indices || [], stocks: res.stocks || [] });
      })
      .catch((err) => console.error("Catalog load error:", err));
  }, []);

  // Fetch chart data when symbol / timeframe / broker changes
  const loadChartData = async (key: string, tf: string, b: "upstox" | "kite") => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchTrendLineChartData(key, b, tf);
      setChartData(data);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Failed to load trendline chart data. Check API backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartData(selectedKey, timeframe, broker);
  }, [selectedKey, timeframe, broker]);

  // Run live sandbox evaluation
  const handleRunSandbox = async () => {
    setSandboxLoading(true);
    try {
      const res = await runTrendLineSandbox({
        instrument_key: selectedKey,
        broker_id: broker,
        timeframe: timeframe,
        pivot_window: sandboxWindow,
        min_headroom_atr: sandboxHeadroom,
        touch_tolerance_atr: sandboxTolerance,
      });
      setSandboxResult(res);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setSandboxLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Studio Control Bar */}
      <div className="card bg-slate-900 border-slate-800 p-3 shadow-lg">
        <div className="row g-2 align-items-center">
          {/* Symbol Selector */}
          <div className="col-12 col-md-4">
            <label className="text-xs text-slate-400 font-medium mb-1 d-block">Select Underlying Instrument</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-slate-950 border-slate-700 text-slate-400">🔍</span>
              <select
                className="form-select bg-slate-950 border-slate-700 text-white font-semibold"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
              >
                <optgroup label="Indices">
                  {catalog.indices.map((idx) => (
                    <option key={idx.instrument_key} value={idx.instrument_key}>
                      {idx.symbol} (Index)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="F&O Stocks">
                  {catalog.stocks.map((stk) => (
                    <option key={stk.instrument_key} value={stk.instrument_key}>
                      {stk.symbol}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Timeframe Chips */}
          <div className="col-12 col-md-5">
            <label className="text-xs text-slate-400 font-medium mb-1 d-block">Resolution Timeframe</label>
            <div className="d-flex flex-wrap gap-1">
              {["1m", "2m", "3m", "4m", "5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w"].map((tf) => (
                <button
                  key={tf}
                  className={`btn btn-xs px-2 py-1 ${timeframe === tf ? "btn-primary font-bold shadow" : "btn-outline-secondary text-slate-300"}`}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>


          {/* Broker and Refresh */}
          <div className="col-12 col-md-3 d-flex align-items-end justify-content-md-end gap-2">
            <select

              className="form-select form-select-sm bg-slate-950 border-slate-700 text-white w-auto"
              value={broker}
              onChange={(e) => setBroker(e.target.value as "upstox" | "kite")}
            >
              <option value="upstox">Upstox</option>
              <option value="kite">Kite</option>
            </select>
            <button
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
              onClick={() => loadChartData(selectedKey, timeframe, broker)}
              disabled={loading}
            >
              {loading ? <span className="spinner-border spinner-border-sm" /> : <span>↻</span>}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger py-2 px-3 text-sm d-flex justify-content-between align-items-center">
          <span>{errorMsg}</span>
          <button className="btn-close" onClick={() => setErrorMsg(null)} />
        </div>
      )}

      {/* Main Studio Dual Pane Layout */}
      <div className="row g-3">
        {/* Left Column: Visual Chart */}
        <div className="col-12 col-xl-8">
          {loading ? (
            <div className="card bg-slate-950 border-slate-800 p-5 text-center text-slate-500">
              <span className="spinner-border text-primary mx-auto mb-2" />
              <div>Ray-casting trendlines & geometric formations for {selectedKey}...</div>
            </div>
          ) : chartData ? (
            <TrendlineVisualChart
              candles={chartData.candles}
              activeLines={chartData.active_lines}
              formations={chartData.formations}
              rejections={chartData.rejections}
              breakouts={chartData.breakouts}
              currentPrice={chartData.current_price}
              atr={chartData.atr}
              symbol={selectedKey.split("|")[1] || selectedKey}
              timeframe={chartData.timeframe}
              resDistAtr={chartData.headroom.res_dist_atr}
              supDistAtr={chartData.headroom.sup_dist_atr}
            />
          ) : (
            <div className="card bg-slate-950 border-slate-800 p-5 text-center text-slate-500">
              No chart data available. Select a symbol above.
            </div>
          )}

          {/* Confluence & Audit Footprint */}
          {chartData && (
            <div className="card bg-slate-900/90 border-slate-800 p-3 mt-3 shadow">
              <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                Confluence Breakdown & Mathematical Audit
              </h4>
              <div className="row g-2 text-xs">
                <div className="col-12 col-md-4">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Bullish Confluence:</span>{" "}
                    <strong className="text-emerald-400">{chartData.confluence.bullish_score.toFixed(0)}%</strong>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Bearish Confluence:</span>{" "}
                    <strong className="text-rose-400">{chartData.confluence.bearish_score.toFixed(0)}%</strong>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Market Regime:</span>{" "}
                    <strong className="text-amber-400">{chartData.market_regime}</strong>
                  </div>
                </div>
              </div>

              {/* Audit Tokens */}
              <div className="mt-2 text-xs text-slate-300">
                <ul className="list-unstyled mb-0 space-y-1">
                  {chartData.audit_reasons.map((reason, idx) => (
                    <li key={idx} className="text-slate-400">
                      • <span className="text-slate-200">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Headroom Governor & Geometric Formations */}
        <div className="col-12 col-xl-4 space-y-3">
          {/* Headroom Governor Card */}
          {chartData && (
            <div className="card bg-slate-900 border-indigo-900/60 p-3 shadow-lg">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h6 text-white font-bold mb-0">Distance-to-Obstacle Governor</h3>
                <span className="badge bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs">
                  Min {sandboxHeadroom} ATR
                </span>
              </div>

              {/* Headroom Bars */}
              <div className="space-y-3 my-2 text-xs">
                <div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-slate-400">Overhead Resistance Headroom:</span>
                    <strong className={chartData.headroom.res_dist_atr < 0.40 ? "text-rose-400" : "text-emerald-400"}>
                      {chartData.headroom.res_dist_atr > 50 ? "Clear" : `${chartData.headroom.res_dist_atr.toFixed(2)} ATR`}
                    </strong>
                  </div>
                  <div className="progress bg-slate-950" style={{ height: "6px" }}>
                    <div
                      className={`progress-bar ${chartData.headroom.res_dist_atr < 0.40 ? "bg-danger" : "bg-success"}`}
                      style={{ width: `${Math.min(chartData.headroom.res_dist_atr * 50, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-slate-400">Lower Support Headroom:</span>
                    <strong className={chartData.headroom.sup_dist_atr < 0.40 ? "text-rose-400" : "text-emerald-400"}>
                      {chartData.headroom.sup_dist_atr > 50 ? "Clear" : `${chartData.headroom.sup_dist_atr.toFixed(2)} ATR`}
                    </strong>
                  </div>
                  <div className="progress bg-slate-950" style={{ height: "6px" }}>
                    <div
                      className={`progress-bar ${chartData.headroom.sup_dist_atr < 0.40 ? "bg-danger" : "bg-success"}`}
                      style={{ width: `${Math.min(chartData.headroom.sup_dist_atr * 50, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Call / Put Setup Qualities */}
              <div className="row g-2 mt-2">
                <div className="col-6">
                  <div className={`p-2 rounded border text-center ${chartData.headroom.call_vetoed ? "bg-rose-950/40 border-rose-800/80" : "bg-emerald-950/40 border-emerald-800/80"}`}>
                    <div className="text-xs text-slate-400">CALL Quality</div>
                    <div className="h5 font-bold mt-1 mb-0 text-white">{chartData.headroom.call_quality}</div>
                    <div className="text-xs mt-1 font-semibold">{chartData.headroom.call_vetoed ? "⛔ VETOED" : "✅ PASSED"}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className={`p-2 rounded border text-center ${chartData.headroom.put_vetoed ? "bg-rose-950/40 border-rose-800/80" : "bg-emerald-950/40 border-emerald-800/80"}`}>
                    <div className="text-xs text-slate-400">PUT Quality</div>
                    <div className="h5 font-bold mt-1 mb-0 text-white">{chartData.headroom.put_quality}</div>
                    <div className="text-xs mt-1 font-semibold">{chartData.headroom.put_vetoed ? "⛔ VETOED" : "✅ PASSED"}</div>
                  </div>
                </div>
              </div>

              {chartData.headroom.call_veto_reason && (
                <div className="alert alert-danger py-1.5 px-2 mt-2 mb-0 text-xs">
                  <strong>CALL Veto:</strong> {chartData.headroom.call_veto_reason}
                </div>
              )}

              {chartData.headroom.put_veto_reason && (
                <div className="alert alert-danger py-1.5 px-2 mt-2 mb-0 text-xs">
                  <strong>PUT Veto:</strong> {chartData.headroom.put_veto_reason}
                </div>
              )}
            </div>
          )}

          {/* Formations & Active Lines */}
          {chartData && (
            <div className="card bg-slate-900 border-slate-800 p-3 shadow">
              <h3 className="h6 text-white font-bold mb-2">
                Active Formations ({chartData.formations.length})
              </h3>
              {chartData.formations.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">No multi-line channel or triangle active.</div>
              ) : (
                <div className="space-y-2">
                  {chartData.formations.map((f) => (
                    <div key={f.formation_id} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs">
                      <div className="d-flex justify-content-between font-bold text-amber-400">
                        <span>{f.pattern_type}</span>
                        <span className="text-slate-300">Score: {f.quality_score.toFixed(0)}</span>
                      </div>
                      <div className="text-slate-400 mt-1">
                        Width: {f.current_width_points.toFixed(1)} pts ({f.current_width_atr.toFixed(2)} ATR) | Compression: {(f.compression_ratio * 100).toFixed(0)}%
                      </div>
                      {f.converging && f.bars_to_apex != null && (
                        <div className="text-cyan-400 mt-1 font-semibold">
                          ⏳ Apex in {f.bars_to_apex} bars ({(f.apex_proximity_pct * 100).toFixed(0)}% to apex)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Active Rays List */}
              <h3 className="h6 text-white font-bold mt-3 mb-2">
                Active Trendline Rays ({chartData.active_lines.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {chartData.active_lines.map((l) => (
                  <div key={l.line_id} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                    <div className="d-flex justify-content-between font-bold">
                      <span className={l.direction.includes("SUPPORT") ? "text-emerald-400" : "text-rose-400"}>
                        {l.direction.replace("BULLISH_", "").replace("BEARISH_", "")}
                      </span>
                      <span className="badge bg-slate-800 text-slate-300">Score {l.strength_score.toFixed(0)}</span>
                    </div>
                    <div className="text-slate-400 mt-1">
                      Slope: {l.slope_normalized.toFixed(3)} ({l.slope_regime}) | Touches: {l.touch_count} | Status: {l.lifecycle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Interactive Sandbox & Geometry Tuner */}
      <div className="card bg-slate-900/90 border-slate-800 p-3 shadow-lg mt-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 className="h6 text-white font-bold mb-0">🧪 Interactive Geometry Sandbox & Parameter Tuner</h3>
            <p className="text-xs text-slate-400 mb-0">
              Live tune pivot confirmation window (W) and ATR touch buffers to simulate real-time fitted lines.
            </p>
          </div>
          <button
            className="btn btn-sm btn-primary d-flex align-items-center gap-1"
            onClick={handleRunSandbox}
            disabled={sandboxLoading}
          >
            {sandboxLoading ? <span className="spinner-border spinner-border-sm" /> : <span>▶</span>}
            Run Sandbox Simulation
          </button>
        </div>

        <div className="row g-3 text-xs">
          <div className="col-12 col-md-4">
            <label className="text-slate-300 font-medium mb-1 d-block">
              Pivot Window (W): <strong>{sandboxWindow} bars</strong>
            </label>
            <input
              type="range"
              className="form-range"
              min="1"
              max="6"
              step="1"
              value={sandboxWindow}
              onChange={(e) => setSandboxWindow(parseInt(e.target.value))}
            />
            <div className="d-flex justify-content-between text-slate-500 text-2xs">
              <span>1 (Fast)</span>
              <span>2 (Standard 3m)</span>
              <span>6 (Macro)</span>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <label className="text-slate-300 font-medium mb-1 d-block">
              Min Headroom Veto: <strong>{sandboxHeadroom.toFixed(2)} ATR</strong>
            </label>
            <input
              type="range"
              className="form-range"
              min="0.20"
              max="1.50"
              step="0.05"
              value={sandboxHeadroom}
              onChange={(e) => setSandboxHeadroom(parseFloat(e.target.value))}
            />
            <div className="d-flex justify-content-between text-slate-500 text-2xs">
              <span>0.20 ATR (Lenient)</span>
              <span>0.40 ATR (Default)</span>
              <span>1.50 ATR (Strict)</span>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <label className="text-slate-300 font-medium mb-1 d-block">
              Touch Tolerance Buffer: <strong>{sandboxTolerance.toFixed(2)} ATR</strong>
            </label>
            <input
              type="range"
              className="form-range"
              min="0.05"
              max="0.30"
              step="0.01"
              value={sandboxTolerance}
              onChange={(e) => setSandboxTolerance(parseFloat(e.target.value))}
            />
            <div className="d-flex justify-content-between text-slate-500 text-2xs">
              <span>0.05 ATR</span>
              <span>0.10 ATR</span>
              <span>0.30 ATR</span>
            </div>
          </div>
        </div>

        {sandboxResult && (
          <div className="p-3 rounded bg-slate-950 border border-slate-800 mt-3 text-xs">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong className="text-emerald-400">Sandbox Simulation Result:</strong>
              <span className="badge bg-slate-800 text-slate-300">
                Active Lines: {sandboxResult.active_lines_count} | Formation: {sandboxResult.primary_formation || "None"}
              </span>
            </div>
            <div className="row g-2">
              <div className="col-6 col-md-3">
                <span className="text-slate-400">CALL Quality:</span>{" "}
                <strong className={sandboxResult.call_vetoed ? "text-rose-400" : "text-emerald-400"}>
                  {sandboxResult.call_trade_quality} {sandboxResult.call_vetoed ? "(VETOED)" : ""}
                </strong>
              </div>
              <div className="col-6 col-md-3">
                <span className="text-slate-400">PUT Quality:</span>{" "}
                <strong className={sandboxResult.put_vetoed ? "text-rose-400" : "text-emerald-400"}>
                  {sandboxResult.put_trade_quality} {sandboxResult.put_vetoed ? "(VETOED)" : ""}
                </strong>
              </div>
              <div className="col-6 col-md-3">
                <span className="text-slate-400">Res Dist:</span>{" "}
                <strong className="text-white">{sandboxResult.res_dist_atr?.toFixed(2)} ATR</strong>
              </div>
              <div className="col-6 col-md-3">
                <span className="text-slate-400">Sup Dist:</span>{" "}
                <strong className="text-white">{sandboxResult.sup_dist_atr?.toFixed(2)} ATR</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

