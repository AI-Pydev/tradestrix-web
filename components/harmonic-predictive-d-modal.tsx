"use client";

import {
    HARMONIC_SUPPORTED_TIMEFRAMES,
    PredictiveDChartData,
    PredictiveDProjection,
    fetchSymbolPredictiveD,
} from "@/lib/harmonic-pattern-api";
import { useEffect, useState } from "react";

type Props = {
  instrumentKey: string;
  symbolLabel: string;
  initialTimeframe?: string;
  initialProjection?: PredictiveDProjection | null;
  onClose: () => void;
  onTakePaperTrade?: (proj: PredictiveDProjection) => void;
};

export function HarmonicPredictiveDModal({
  instrumentKey,
  symbolLabel,
  initialTimeframe = "15m",
  initialProjection = null,
  onClose,
  onTakePaperTrade,
}: Props) {
  const [timeframe, setTimeframe] = useState<string>(initialTimeframe);
  const [chartData, setChartData] = useState<PredictiveDChartData | null>(null);
  const [selectedPrediction, setSelectedPrediction] =
    useState<PredictiveDProjection | null>(initialProjection);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const loadData = async (tf: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSymbolPredictiveD(instrumentKey, tf);
      if (res.data) {
        setChartData(res.data);
        if (res.data.predictions.length > 0) {
          // If we had an initial projection, pick it or default to top scored
          const match = res.data.predictions.find(
            (p) => p.pattern_name === initialProjection?.pattern_name
          );
          setSelectedPrediction(match || res.data.predictions[0]);
        } else {
          setSelectedPrediction(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projection");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(timeframe);
  }, [timeframe, instrumentKey]);

  const pred = selectedPrediction;
  const isBull = pred?.direction === "BULLISH";

  // Chart coordinate mappings
  const candles = chartData?.candles || [];
  const minLow = candles.length
    ? Math.min(...candles.map((c) => c.low), pred ? pred.predicted_d_low : 999999)
    : 0;
  const maxHigh = candles.length
    ? Math.max(...candles.map((c) => c.high), pred ? pred.predicted_d_high : 0)
    : 100;
  const priceRange = Math.max(maxHigh - minLow, 1.0);

  const svgWidth = isMaximized ? 1100 : 780;
  const svgHeight = isMaximized ? 460 : 340;
  const padLeft = 45;
  const padRight = 85;
  const padTop = 30;
  const padBottom = 35;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const getX = (idx: number) => {
    if (candles.length <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (candles.length - 1)) * plotW;
  };

  const getY = (price: number) => {
    return padTop + ((maxHigh - price) / priceRange) * plotH;
  };

  // Find candle indices for pivots
  const getPivotIndex = (pivTime: string, defaultIdx: number) => {
    const found = candles.findIndex((c) => c.time === pivTime);
    return found >= 0 ? found : defaultIdx;
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 p-2 p-md-4 bg-dark bg-opacity-80 d-flex align-items-center justify-content-center"
      style={{ zIndex: 1070, backdropFilter: "blur(8px)" }}
    >
      <div
        className={`card shadow-lg border-0 bg-surface d-flex flex-column ${
          isMaximized ? "w-100 h-100" : ""
        }`}
        style={{
          maxWidth: isMaximized ? "1600px" : "1100px",
          maxHeight: "96vh",
          width: "100%",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div className="card-header bg-dark text-white py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom border-secondary border-opacity-25">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle p-2 d-flex align-items-center justify-content-center bg-primary bg-opacity-20 text-primary"
              style={{ width: "42px", height: "42px" }}
            >
              <i className="bi bi-bullseye fs-4" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h5 className="mb-0 fw-bold">{symbolLabel} — Point D Predictive Roadmap</h5>
                {pred && (
                  <>
                    <span
                      className={`badge ${
                        isBull ? "bg-success text-white" : "bg-danger text-white"
                      } fw-bold shadow-sm`}
                    >
                      {pred.pattern_name.toUpperCase()} ({pred.direction})
                    </span>
                    <span className="badge bg-info-subtle text-info border border-info-subtle font-monospace">
                      {pred.status}
                    </span>
                  </>
                )}
              </div>
              <span className="text-secondary small">
                Mathematical PRZ Target Zone & C→D Expansion Projection Based on Harmonic Strategy Guides
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-outline-light d-flex align-items-center gap-1"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore window" : "Maximize chart"}
            >
              <i className={`bi ${isMaximized ? "bi-fullscreen-exit" : "bi-arrows-fullscreen"}`} />
            </button>
            <button className="btn-close btn-close-white" onClick={onClose} />
          </div>
        </div>

        {/* Modal Body */}
        <div className="card-body p-3 p-md-4 overflow-auto d-flex flex-column gap-3">
          {/* Timeframe Selector & Alternate Projections Switcher */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-2 bg-light bg-opacity-50 rounded border">
            <div className="d-flex flex-wrap gap-1 align-items-center">
              <span className="text-secondary small fw-semibold me-1">Timeframe:</span>
              {HARMONIC_SUPPORTED_TIMEFRAMES.filter((t) => t.id !== "all").map((tf) => (
                <button
                  key={tf.id}
                  className={`btn btn-xs ${
                    timeframe === tf.id ? "btn-primary fw-bold shadow-sm" : "btn-outline-secondary"
                  }`}
                  style={{ fontSize: "11px", padding: "3px 8px" }}
                  onClick={() => setTimeframe(tf.id)}
                  disabled={loading}
                >
                  {tf.id.toUpperCase()}
                </button>
              ))}
            </div>

            {chartData && chartData.predictions.length > 1 && (
              <div className="d-flex align-items-center gap-1">
                <span className="text-secondary small fw-semibold">Candidate:</span>
                <select
                  className="form-select form-select-sm py-0"
                  style={{ width: "auto", fontSize: "12px" }}
                  value={pred?.pattern_name || ""}
                  onChange={(e) => {
                    const match = chartData.predictions.find((p) => p.pattern_name === e.target.value);
                    if (match) setSelectedPrediction(match);
                  }}
                >
                  {chartData.predictions.map((p) => (
                    <option key={p.pattern_name} value={p.pattern_name}>
                      {p.pattern_name} ({p.direction}) - {(p.quality_score * 100).toFixed(0)}%
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-5 my-auto">
              <span className="spinner-border text-primary" role="status" />
              <div className="text-secondary small mt-2">
                Calculating confirmed X-A-B-C Fibonacci ratios & Point D projections for {timeframe.toUpperCase()}...
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger py-2 small">{error}</div>
          ) : !pred ? (
            <div className="text-center py-5 text-secondary">
              <i className="bi bi-search fs-1 text-muted" />
              <p className="mt-2 mb-0">
                No active emerging X-A-B-C harmonic wave found on <strong>{timeframe.toUpperCase()}</strong>.
              </p>
              <p className="small text-muted">Try switching to another timeframe above!</p>
            </div>
          ) : (
            <div className="row g-3">
              {/* Interactive SVG Chart Panel */}
              <div className={isMaximized ? "col-12 col-xl-8" : "col-12 col-lg-8"}>
                <div className="border rounded bg-dark p-2 position-relative shadow-inner" style={{ minHeight: "360px" }}>
                  <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                      const p = minLow + priceRange * (1 - pct);
                      const yPos = padTop + pct * plotH;
                      return (
                        <g key={pct}>
                          <line
                            x1={padLeft}
                            y1={yPos}
                            x2={svgWidth - padRight}
                            y2={yPos}
                            stroke="#333"
                            strokeDasharray="2,3"
                            strokeWidth="0.75"
                          />
                          <text
                            x={svgWidth - padRight + 6}
                            y={yPos + 4}
                            fill="#888"
                            fontSize="10"
                            fontFamily="monospace"
                          >
                            ₹{p.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}

                    {/* S/R Horizontal Clusters */}
                    {chartData?.support_levels?.slice(0, 2).map((sup, idx) => (
                      <line
                        key={`sup-${idx}`}
                        x1={padLeft}
                        y1={getY(sup)}
                        x2={svgWidth - padRight}
                        y2={getY(sup)}
                        stroke="#2b8a3e"
                        strokeDasharray="4,4"
                        strokeWidth="1.2"
                        opacity="0.6"
                      />
                    ))}
                    {chartData?.resistance_levels?.slice(0, 2).map((res, idx) => (
                      <line
                        key={`res-${idx}`}
                        x1={padLeft}
                        y1={getY(res)}
                        x2={svgWidth - padRight}
                        y2={getY(res)}
                        stroke="#e03131"
                        strokeDasharray="4,4"
                        strokeWidth="1.2"
                        opacity="0.6"
                      />
                    ))}

                    {/* Candlesticks */}
                    {candles.map((c, idx) => {
                      const xPos = getX(idx);
                      const isUp = c.close >= c.open;
                      const cColor = isUp ? "#20c997" : "#ff6b6b";
                      const candleTop = getY(Math.max(c.open, c.close));
                      const candleBot = getY(Math.min(c.open, c.close));
                      const candleHeight = Math.max(candleBot - candleTop, 1.5);
                      const cW = Math.max(plotW / (candles.length * 1.6), 2);

                      return (
                        <g key={idx}>
                          {/* Wick */}
                          <line
                            x1={xPos}
                            y1={getY(c.high)}
                            x2={xPos}
                            y2={getY(c.low)}
                            stroke={cColor}
                            strokeWidth="1"
                          />
                          {/* Body */}
                          <rect
                            x={xPos - cW / 2}
                            y={candleTop}
                            width={cW}
                            height={candleHeight}
                            fill={cColor}
                            opacity="0.9"
                          />
                        </g>
                      );
                    })}

                    {/* Confirmed Pivots X, A, B, C & Connecting Solid Vectors */}
                    {(() => {
                      const idxX = getPivotIndex(pred.x.time, Math.max(0, candles.length - 30));
                      const idxA = getPivotIndex(pred.a.time, Math.max(0, candles.length - 20));
                      const idxB = getPivotIndex(pred.b.time, Math.max(0, candles.length - 12));
                      const idxC = getPivotIndex(pred.c.time, Math.max(0, candles.length - 4));

                      const pX = { x: getX(idxX), y: getY(pred.x.price) };
                      const pA = { x: getX(idxA), y: getY(pred.a.price) };
                      const pB = { x: getX(idxB), y: getY(pred.b.price) };
                      const pC = { x: getX(idxC), y: getY(pred.c.price) };
                      const pD = { x: svgWidth - padRight - 20, y: getY(pred.predicted_d_mid) };

                      return (
                        <g>
                          {/* Confirmed Harmonic Legs X-A-B-C (Solid Cyan/Gold) */}
                          <polygon
                            points={`${pX.x},${pX.y} ${pA.x},${pA.y} ${pB.x},${pB.y}`}
                            fill={isBull ? "rgba(32, 201, 151, 0.12)" : "rgba(255, 107, 107, 0.12)"}
                            stroke="none"
                          />
                          <polygon
                            points={`${pB.x},${pB.y} ${pC.x},${pC.y} ${pD.x},${pD.y}`}
                            fill={isBull ? "rgba(13, 110, 253, 0.15)" : "rgba(255, 193, 7, 0.15)"}
                            stroke="none"
                          />

                          {/* Solid Swings */}
                          <line x1={pX.x} y1={pX.y} x2={pA.x} y2={pA.y} stroke="#0dcaf0" strokeWidth="2.5" />
                          <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke="#0dcaf0" strokeWidth="2.5" />
                          <line x1={pB.x} y1={pB.y} x2={pC.x} y2={pC.y} stroke="#0dcaf0" strokeWidth="2.5" />

                          {/* Projected C -> D Vector (Glowing Dashed Line) */}
                          <line
                            x1={pC.x}
                            y1={pC.y}
                            x2={pD.x}
                            y2={pD.y}
                            stroke={isBull ? "#51cf66" : "#ff6b6b"}
                            strokeWidth="2.5"
                            strokeDasharray="6,4"
                          />

                          {/* Predicted PRZ Zone Box at Point D */}
                          <rect
                            x={pD.x - 30}
                            y={getY(Math.max(pred.predicted_d_low, pred.predicted_d_high))}
                            width={60}
                            height={Math.max(
                              Math.abs(getY(pred.predicted_d_low) - getY(pred.predicted_d_high)),
                              14
                            )}
                            fill={isBull ? "rgba(81, 207, 102, 0.25)" : "rgba(255, 107, 107, 0.25)"}
                            stroke={isBull ? "#51cf66" : "#ff6b6b"}
                            strokeWidth="1.5"
                            strokeDasharray="3,3"
                            rx="4"
                          />
                          <text
                            x={pD.x}
                            y={getY(pred.predicted_d_mid) - 10}
                            fill="#fff"
                            fontSize="11"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            PRZ [D] ₹{pred.predicted_d_mid}
                          </text>

                          {/* Node Labels: X, A, B, C, Predicted D */}
                          <circle cx={pX.x} cy={pX.y} r="5" fill="#0dcaf0" />
                          <text x={pX.x} y={pX.y - 8} fill="#0dcaf0" fontSize="12" fontWeight="bold" textAnchor="middle">
                            X (₹{pred.x.price})
                          </text>

                          <circle cx={pA.x} cy={pA.y} r="5" fill="#0dcaf0" />
                          <text x={pA.x} y={pA.y - 8} fill="#0dcaf0" fontSize="12" fontWeight="bold" textAnchor="middle">
                            A (₹{pred.a.price})
                          </text>

                          <circle cx={pB.x} cy={pB.y} r="5" fill="#0dcaf0" />
                          <text x={pB.x} y={pB.y + 16} fill="#0dcaf0" fontSize="12" fontWeight="bold" textAnchor="middle">
                            B (₹{pred.b.price}) [{(pred.ratio_ab_xa * 100).toFixed(1)}%]
                          </text>

                          <circle cx={pC.x} cy={pC.y} r="5" fill="#0dcaf0" />
                          <text x={pC.x} y={pC.y - 8} fill="#0dcaf0" fontSize="12" fontWeight="bold" textAnchor="middle">
                            C (₹{pred.c.price}) [{(pred.ratio_bc_ab * 100).toFixed(1)}%]
                          </text>

                          <circle cx={pD.x} cy={pD.y} r="6" fill={isBull ? "#51cf66" : "#ff6b6b"} />
                          <text
                            x={pD.x}
                            y={pD.y + 16}
                            fill={isBull ? "#51cf66" : "#ff6b6b"}
                            fontSize="12"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            🎯 PREDICTED D
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Metrics & Action Cards Panel */}
              <div className={isMaximized ? "col-12 col-xl-4" : "col-12 col-lg-4"}>
                <div className="d-flex flex-column gap-3">
                  {/* Card 1: Point D Target Zone */}
                  <div className="card shadow-sm border-0 bg-light p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-bold">🎯 Predicted PRZ (Point D)</span>
                      <span className="badge bg-primary-subtle text-primary">Score: {(pred.quality_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h3 fw-bold text-primary mb-1 font-monospace">₹{pred.predicted_d_mid}</div>
                    <div className="text-muted small">
                      PRZ Range: <strong>₹{pred.predicted_d_low}</strong> – <strong>₹{pred.predicted_d_high}</strong>
                    </div>
                    <div className="mt-2 pt-2 border-top d-flex justify-content-between small">
                      <span className="text-secondary">Distance from LTP:</span>
                      <strong className={pred.dist_to_d_points >= 0 ? "text-success" : "text-danger"}>
                        {pred.dist_to_d_points >= 0 ? "+" : ""}
                        {pred.dist_to_d_points} pts ({pred.dist_to_d_pct}%)
                      </strong>
                    </div>
                  </div>

                  {/* Card 2: Strategy Option 1 (C -> D Expansion Scalp) */}
                  <div className="card shadow-sm border-0 bg-light p-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold small text-dark">⚡ Trade 1: C → D Expansion Move</span>
                      <span className={`badge ${pred.cd_trade_direction === "BUY" ? "bg-success" : "bg-danger"}`}>
                        {pred.cd_trade_direction}
                      </span>
                    </div>
                    <p className="text-secondary small mb-2">
                      Scalp the forming expansion leg from Point C towards the predicted D PRZ zone.
                    </p>
                    <div className="d-flex justify-content-between small font-monospace">
                      <span className="text-muted">Expected Leg Run:</span>
                      <strong className="text-primary">{pred.cd_leg_points} pts</strong>
                    </div>
                  </div>

                  {/* Card 3: Strategy Option 2 (Post-D Reversal) */}
                  <div className="card shadow-sm border-0 bg-light p-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold small text-dark">🔄 Trade 2: Point D PRZ Reversal</span>
                      <span className={`badge ${isBull ? "bg-success" : "bg-danger"}`}>
                        {isBull ? "BUY / CE REVERSAL" : "SELL / PE REVERSAL"}
                      </span>
                    </div>
                    <p className="text-secondary small mb-2">
                      Institutional reversal entry once price touches the predicted PRZ at Point D.
                    </p>
                    <div className="d-flex flex-column gap-1 small font-monospace">
                      <div className="d-flex justify-content-between">
                        <span className="text-success">TP1 ({pred.t1_rule_desc.slice(0, 15)}):</span>
                        <strong className="text-success">₹{pred.anticipated_t1}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-success">TP2 ({pred.t2_rule_desc.slice(0, 15)}):</span>
                        <strong className="text-success">₹{pred.anticipated_t2}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-danger">Stop Loss:</span>
                        <strong className="text-danger">₹{pred.anticipated_sl}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Fibonacci Geometry Breakdown */}
                  <div className="card shadow-sm border-0 bg-light p-3">
                    <span className="fw-bold small text-dark mb-2">📐 Strategy Guide Ratio Compliance</span>
                    <div className="table-responsive">
                      <table className="table table-sm table-borderless small mb-0 font-monospace">
                        <tbody>
                          <tr>
                            <td className="text-secondary">AB / XA:</td>
                            <td><strong>{(pred.ratio_ab_xa * 100).toFixed(1)}%</strong></td>
                            <td className="text-success">✅ Confirmed</td>
                          </tr>
                          <tr>
                            <td className="text-secondary">BC / AB:</td>
                            <td><strong>{(pred.ratio_bc_ab * 100).toFixed(1)}%</strong></td>
                            <td className="text-success">✅ Confirmed</td>
                          </tr>
                          <tr>
                            <td className="text-secondary">CD / BC Target:</td>
                            <td><strong>{pred.target_cd_bc_min} – {pred.target_cd_bc_max}</strong></td>
                            <td className="text-primary">🔮 Projected</td>
                          </tr>
                          <tr>
                            <td className="text-secondary">XD / XA Target:</td>
                            <td><strong>{pred.target_xd_xa_min} – {pred.target_xd_xa_max}</strong></td>
                            <td className="text-primary">🔮 Projected</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="card-footer bg-transparent py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2 border-top">
          <span className="text-secondary small">
            💡 Point D projection adapts in real-time as swing pivots are confirmed.
          </span>
          <div className="d-flex align-items-center gap-2">
            {onTakePaperTrade && pred && (
              <button
                className="btn btn-success btn-sm text-white fw-bold d-flex align-items-center gap-1 shadow-sm"
                onClick={() => onTakePaperTrade(pred)}
              >
                <i className="bi bi-journal-plus" />
                <span>Take Paper Trade</span>
              </button>
            )}
            <button className="btn btn-secondary btn-sm px-4" onClick={onClose}>
              Close Roadmap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
