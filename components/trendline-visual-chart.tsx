"use client";

import {
    TrendLineChartFormation,
    TrendLineChartLine,
} from "@/modules/trendlines";
import { useMemo, useRef, useState, useCallback } from "react";

interface CandleItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TrendlineVisualChartProps {
  candles: CandleItem[];
  activeLines: TrendLineChartLine[];
  formations: TrendLineChartFormation[];
  rejections?: Array<{ event_type: string; price: number; line_id: string; time: string; wick_ratio?: number; score?: number }>;
  breakouts?: Array<{ event_type: string; price: number; line_id: string; time: string; direction: string; confirmed: boolean; penetration_atr?: number }>;
  currentPrice: number;
  atr: number;
  symbol: string;
  timeframe: string;
  resDistAtr?: number;
  supDistAtr?: number;
}

type DisplayMode = "focus" | "structure" | "debug";
type ChartMode = "candles" | "heikin_ashi" | "line";

// Max candles shown in initial viewport
const DEFAULT_VIEWPORT = 150;

function getLifecycleWeight(lifecycle: string): number {
  switch (lifecycle) {
    case "STRONG": return 4;
    case "VALID": return 3;
    case "WEAK": return 2;
    case "ROLE_REVERSED": return 2;
    case "BROKEN": return 1;
    case "CANDIDATE": return 0;
    default: return 1;
  }
}

function isRoleReversed(lifecycle: string): boolean {
  return lifecycle === "ROLE_REVERSED";
}

function isBroken(lifecycle: string): boolean {
  return lifecycle === "BROKEN";
}

function isCandidate(lifecycle: string): boolean {
  return lifecycle === "CANDIDATE";
}

export function TrendlineVisualChart({
  candles,
  activeLines,
  formations,
  rejections = [],
  breakouts = [],
  currentPrice,
  atr,
  symbol,
  timeframe,
  resDistAtr,
  supDistAtr,
}: TrendlineVisualChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("candles");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("focus");
  const [showHazardBands, setShowHazardBands] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Compute Heikin-Ashi candles if selected
  const displayCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    if (chartMode !== "heikin_ashi") return candles;
    const ha: CandleItem[] = [];
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (i === 0) {
        ha.push({ time: c.time, open: (c.open + c.close) / 2, high: c.high, low: c.low, close: (c.open + c.high + c.low + c.close) / 4, volume: c.volume });
      } else {
        const prev = ha[i - 1];
        const haClose = (c.open + c.high + c.low + c.close) / 4;
        const haOpen = (prev.open + prev.close) / 2;
        ha.push({ time: c.time, open: haOpen, high: Math.max(c.high, haOpen, haClose), low: Math.min(c.low, haOpen, haClose), close: haClose, volume: c.volume });
      }
    }
    return ha;
  }, [candles, chartMode]);

  // Viewport: show last DEFAULT_VIEWPORT candles
  const viewportCandles = useMemo(() => {
    if (displayCandles.length <= DEFAULT_VIEWPORT) return displayCandles;
    return displayCandles.slice(displayCandles.length - DEFAULT_VIEWPORT);
  }, [displayCandles]);

  const viewportOffset = displayCandles.length - viewportCandles.length;

  // Line selection for Focus/Structure/Debug
  const visibleLines = useMemo(() => {
    if (!activeLines || activeLines.length === 0) return [];

    const resistances = activeLines
      .filter(l => l.direction === "BEARISH_RESISTANCE")
      .sort((a, b) => {
        // nearest to current price first, then by strength
        const distA = Math.abs(a.current_price - currentPrice);
        const distB = Math.abs(b.current_price - currentPrice);
        return distA !== distB ? distA - distB : b.strength_score - a.strength_score;
      });

    const supports = activeLines
      .filter(l => l.direction === "BULLISH_SUPPORT")
      .sort((a, b) => {
        const distA = Math.abs(a.current_price - currentPrice);
        const distB = Math.abs(b.current_price - currentPrice);
        return distA !== distB ? distA - distB : b.strength_score - a.strength_score;
      });

    if (displayMode === "focus") {
      // Top 2 nearest resistance + 2 nearest support (non-broken, non-candidate)
      const focusRes = resistances.filter(l => !isBroken(l.lifecycle) && !isCandidate(l.lifecycle)).slice(0, 2);
      const focusSup = supports.filter(l => !isBroken(l.lifecycle) && !isCandidate(l.lifecycle)).slice(0, 2);
      return [...focusRes, ...focusSup];
    }
    if (displayMode === "structure") {
      // All non-candidate lines
      return activeLines.filter(l => !isCandidate(l.lifecycle));
    }
    // Debug: everything
    return activeLines;
  }, [activeLines, currentPrice, displayMode]);

  // ATR-aware Y axis fitted to visible candles + relevant lines
  const width = 860;
  const height = 450;
  const padding = { top: 32, right: 80, bottom: 42, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { minPrice, maxPrice, barWidth } = useMemo(() => {
    if (viewportCandles.length === 0) return { minPrice: 100, maxPrice: 120, barWidth: 8 };

    let minP = Infinity;
    let maxP = -Infinity;

    // Only fit to visible candles
    for (const c of viewportCandles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    }

    // Include only lines that are within 3 ATR of the candle range
    const candleMid = (minP + maxP) / 2;
    for (const l of visibleLines) {
      const lp = l.current_price;
      if (Math.abs(lp - candleMid) < (maxP - minP + atr * 3)) {
        if (lp < minP) minP = lp;
        if (lp > maxP) maxP = lp;
      }
    }

    // Include current price
    if (currentPrice < minP) minP = currentPrice;
    if (currentPrice > maxP) maxP = currentPrice;

    // ATR-based padding: 0.6 ATR above/below
    const atrPad = Math.max(atr * 0.6, (maxP - minP) * 0.05, 1.0);
    const bW = Math.max(chartWidth / Math.max(viewportCandles.length, 1), 4);

    return { minPrice: minP - atrPad, maxPrice: maxP + atrPad, barWidth: bW };
  }, [viewportCandles, visibleLines, atr, currentPrice, chartWidth]);

  const priceToY = useCallback((price: number) => {
    const range = maxPrice - minPrice || 1;
    return padding.top + chartHeight - ((price - minPrice) / range) * chartHeight;
  }, [maxPrice, minPrice, chartHeight, padding.top]);

  const indexToX = useCallback((index: number) => {
    // index is relative to viewportCandles
    return padding.left + (index + 0.5) * barWidth;
  }, [barWidth, padding.left]);

  // Translate absolute candle index to viewport index
  const absToViewport = useCallback((absIdx: number) => absIdx - viewportOffset, [viewportOffset]);

  const hoveredCandle = hoveredIdx !== null && viewportCandles[hoveredIdx] ? viewportCandles[hoveredIdx] : null;

  // Nearest resistance/support line IDs (for visual emphasis)
  const nearestResLineId = useMemo(() => {
    const res = visibleLines.filter(l => l.direction === "BEARISH_RESISTANCE" && l.current_price > currentPrice);
    if (res.length === 0) return null;
    return res.reduce((a, b) => Math.abs(a.current_price - currentPrice) <= Math.abs(b.current_price - currentPrice) ? a : b).line_id;
  }, [visibleLines, currentPrice]);

  const nearestSupLineId = useMemo(() => {
    const sup = visibleLines.filter(l => l.direction === "BULLISH_SUPPORT" && l.current_price < currentPrice);
    if (sup.length === 0) return null;
    return sup.reduce((a, b) => Math.abs(a.current_price - currentPrice) <= Math.abs(b.current_price - currentPrice) ? a : b).line_id;
  }, [visibleLines, currentPrice]);

  // Build compact right-edge labels, deduplicating overlapping ones (within 6px)
  const lineLabels = useMemo(() => {
    const sorted = [...visibleLines].sort((a, b) => {
      const ya = priceToY(a.current_price);
      const yb = priceToY(b.current_price);
      return ya - yb;
    });

    // Build R1/R2/S1/S2 tags
    let rCount = 0;
    let sCount = 0;
    const labels: Array<{ line_id: string; tag: string; y: number; color: string; atrDist: number | null }> = [];

    for (const l of sorted) {
      const isRes = l.direction === "BEARISH_RESISTANCE";
      const rawY = priceToY(l.current_price);
      const atrDist = atr > 0 ? Math.abs(l.current_price - currentPrice) / atr : null;

      let tag: string;
      if (isRes) {
        rCount++;
        tag = `R${rCount}`;
      } else {
        sCount++;
        tag = `S${sCount}`;
      }

      // Avoid vertical crowding: skip if last label is within 12px
      const lastLabel = labels[labels.length - 1];
      if (lastLabel && Math.abs(lastLabel.y - rawY) < 12) {
        continue;
      }
      // Avoid collision with current-price amber box (18px tall, centred on priceToY(currentPrice))
      const cpY = priceToY(currentPrice);
      if (Math.abs(rawY - cpY) < 11) {
        continue;
      }

      labels.push({
        line_id: l.line_id,
        tag,
        y: rawY,
        color: isRes ? "#f43f5e" : "#22c55e",
        atrDist,
      });
    }
    return labels;
  }, [visibleLines, priceToY, atr, currentPrice]);

  // Line visual style helper
  function getLineStyle(l: TrendLineChartLine) {
    const isNearest = l.line_id === nearestResLineId || l.line_id === nearestSupLineId;
    const isHovered = l.line_id === hoveredLineId;
    const isRes = l.direction === "BEARISH_RESISTANCE";
    const baseColor = isRes ? "#f43f5e" : "#22c55e";
    const brokenColor = isRes ? "#7f2b3a" : "#1a4a2e";

    if (isBroken(l.lifecycle)) {
      return { stroke: brokenColor, strokeWidth: 1, dashArray: "5,4", opacity: 0.45, labelBg: brokenColor };
    }
    if (isRoleReversed(l.lifecycle)) {
      return { stroke: isRes ? "#fb923c" : "#38bdf8", strokeWidth: isNearest || isHovered ? 2 : 1.5, dashArray: "6,3", opacity: 0.75, labelBg: isRes ? "#7c2d12" : "#0c4a6e" };
    }
    if (isCandidate(l.lifecycle)) {
      return { stroke: baseColor, strokeWidth: 1, dashArray: "2,4", opacity: 0.3, labelBg: "#1e293b" };
    }
    // VALID / STRONG
    const weight = getLifecycleWeight(l.lifecycle);
    return {
      stroke: baseColor,
      strokeWidth: isNearest || isHovered ? weight + 1 : weight === 4 ? 2.5 : 2,
      dashArray: "none",
      opacity: isNearest || isHovered ? 1.0 : 0.85,
      labelBg: isRes ? "#7f1d1d" : "#14532d",
    };
  }

  const hoveredLine = hoveredLineId ? activeLines.find(l => l.line_id === hoveredLineId) : null;

  return (
    <div className="card ts-card text-white overflow-hidden shadow-xl" ref={containerRef}>
      {/* Chart Toolbar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center px-3 py-2" style={{ background: "#090e1a", borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
        <div className="d-flex align-items-center gap-2">
          <span className="badge text-xs px-2 py-1 font-mono" style={{ background: "#1e2d4a", color: "#93c5fd" }}>
            {symbol} ({timeframe})
          </span>
          <span className="text-xs" style={{ color: "#94a3b8" }}>
            Price: <strong className="text-white font-mono">{currentPrice.toFixed(2)}</strong> | ATR:{" "}
            <span className="font-mono" style={{ color: "#fbbf24" }}>{atr.toFixed(2)}</span>
          </span>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Chart type */}
          <div className="btn-group btn-group-sm">
            {(["candles", "heikin_ashi", "line"] as ChartMode[]).map((m) => (
              <button
                key={m}
                className={`btn btn-xs ${chartMode === m ? "btn-primary" : "btn-outline-secondary border-0"}`}
                onClick={() => setChartMode(m)}
                style={{ fontSize: "11px", padding: "2px 8px" }}
              >
                {m === "heikin_ashi" ? "Heikin-Ashi" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Display mode */}
          <div className="btn-group btn-group-sm">
            {(["focus", "structure", "debug"] as DisplayMode[]).map((m) => (
              <button
                key={m}
                className={`btn btn-xs ${displayMode === m ? "btn-primary" : "btn-outline-secondary border-0"}`}
                onClick={() => setDisplayMode(m)}
                style={{ fontSize: "11px", padding: "2px 8px" }}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          <button
            className={`btn btn-xs ${showHazardBands ? "btn-outline-warning" : "btn-outline-secondary border-0"}`}
            onClick={() => setShowHazardBands(!showHazardBands)}
            title="Toggle ±0.40 ATR Hazard Zone"
            style={{ fontSize: "11px", padding: "2px 8px" }}
          >
            Hazard Band
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="position-relative w-100" style={{ minHeight: "450px" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-100 h-auto user-select-none"
          style={{ display: "block" }}
          onMouseLeave={() => { setHoveredIdx(null); setHoveredLineId(null); }}
        >
          <defs>
            <clipPath id="chartClip">
              <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} />
            </clipPath>
          </defs>

          {/* Background */}
          <rect x={0} y={0} width={width} height={height} fill="#0b1020" />

          {/* Grid lines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct, i) => {
            const y = padding.top + chartHeight * pct;
            const p = maxPrice - pct * (maxPrice - minPrice);
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1e293b" strokeDasharray="3,4" strokeWidth="1" />
                <text x={width - padding.right + 5} y={y + 4} fill="#475569" fontSize="9.5" fontFamily="monospace">{p.toFixed(1)}</text>
              </g>
            );
          })}

          {/* Hazard bands — subtle fill, clipped to chart area */}
          {showHazardBands && (
            <g clipPath="url(#chartClip)">
              <rect
                x={padding.left}
                y={priceToY(currentPrice + 0.4 * atr)}
                width={chartWidth}
                height={Math.max(priceToY(currentPrice) - priceToY(currentPrice + 0.4 * atr), 1)}
                fill="#ef4444"
                opacity="0.07"
              />
              <rect
                x={padding.left}
                y={priceToY(currentPrice)}
                width={chartWidth}
                height={Math.max(priceToY(currentPrice - 0.4 * atr) - priceToY(currentPrice), 1)}
                fill="#10b981"
                opacity="0.07"
              />
            </g>
          )}

          {/* Formations — subtle fill, boundary lines prominent */}
          <g clipPath="url(#chartClip)">
            {formations.map((f) => {
              const upper = visibleLines.find((l) => l.line_id === f.upper_line_id) || activeLines.find((l) => l.line_id === f.upper_line_id);
              const lower = visibleLines.find((l) => l.line_id === f.lower_line_id) || activeLines.find((l) => l.line_id === f.lower_line_id);
              if (!upper || !lower) return null;

              const startIdx = Math.min(absToViewport(upper.start_index), absToViewport(lower.start_index));
              const endIdx = viewportCandles.length - 1;
              if (endIdx < 0) return null;

              const usx = indexToX(Math.max(startIdx, 0));
              const usy = priceToY(upper.start_price);
              const uex = indexToX(endIdx);
              const uey = priceToY(upper.current_price);
              const lsx = indexToX(Math.max(startIdx, 0));
              const lsy = priceToY(lower.start_price);
              const lex = indexToX(endIdx);
              const ley = priceToY(lower.current_price);

              const isBull = f.pattern_type === "RISING_CHANNEL";
              const fillColor = isBull ? "#10b981" : "#ef4444";

              return (
                <g key={f.formation_id}>
                  <polygon
                    points={`${usx},${usy} ${uex},${uey} ${lex},${ley} ${lsx},${lsy}`}
                    fill={fillColor}
                    fillOpacity="0.04"
                    stroke={fillColor}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                    opacity="0.6"
                  />
                  {f.converging && f.apex_index != null && f.apex_price != null && displayMode !== "focus" && (
                    <g>
                      <circle cx={indexToX(absToViewport(f.apex_index))} cy={priceToY(f.apex_price)} r="3" fill="#fbbf24" opacity="0.8" />
                      {displayMode === "debug" && (
                        <text x={indexToX(absToViewport(f.apex_index)) + 5} y={priceToY(f.apex_price) - 4} fill="#fbbf24" fontSize="8">
                          Apex {(f.apex_proximity_pct * 100).toFixed(0)}%
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Trendlines — clipped, rendered below candles */}
          <g clipPath="url(#chartClip)">
            {visibleLines.map((l) => {
              const style = getLineStyle(l);
              const vpStart = Math.max(absToViewport(l.start_index), 0);
              const vpEnd = viewportCandles.length - 1;
              if (vpEnd < 0) return null;

              // If line starts before viewport, extrapolate start price
              const barsIntoViewport = absToViewport(l.start_index);
              let startPx = l.start_price;
              if (barsIntoViewport < 0 && l.slope_raw !== 0) {
                startPx = l.start_price + l.slope_raw * (-barsIntoViewport);
              }

              const sx = indexToX(vpStart);
              const sy = priceToY(startPx);
              const ex = indexToX(vpEnd);
              const ey = priceToY(l.current_price);

              const isHovered = l.line_id === hoveredLineId;

              return (
                <g key={l.line_id}
                  onMouseEnter={() => setHoveredLineId(l.line_id)}
                  onMouseLeave={() => setHoveredLineId(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Invisible wider hit area */}
                  <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="transparent" strokeWidth="10" />
                  {/* Actual line */}
                  <line
                    x1={sx} y1={sy} x2={ex} y2={ey}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.dashArray === "none" ? undefined : style.dashArray}
                    opacity={style.opacity}
                  />
                  {/* Touch anchor dots — debug mode only to reduce clutter */}
                  {displayMode === "debug" && l.anchors.map((a, aIdx) => {
                    const avp = absToViewport(a.index);
                    if (avp < 0 || avp >= viewportCandles.length) return null;
                    return (
                      <circle key={aIdx} cx={indexToX(avp)} cy={priceToY(a.price)} r="3" fill={style.stroke} stroke="#0f172a" strokeWidth="1" opacity="0.7" />
                    );
                  })}
                  {/* Hovered line highlight ring at end */}
                  {isHovered && <circle cx={ex} cy={ey} r="5" fill="none" stroke={style.stroke} strokeWidth="1.5" opacity="0.8" />}
                </g>
              );
            })}
          </g>

          {/* Candlesticks — on top of lines */}
          <g clipPath="url(#chartClip)">
            {chartMode !== "line" ? (
              viewportCandles.map((c, i) => {
                const x = indexToX(i);
                const isUp = c.close >= c.open;
                const upColor = "#10b981";
                const dnColor = "#ef4444";
                const bodyColor = isUp ? upColor : dnColor;
                const wickColor = isUp ? "#34d399" : "#f87171";
                const openY = priceToY(c.open);
                const closeY = priceToY(c.close);
                const highY = priceToY(c.high);
                const lowY = priceToY(c.low);
                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.max(Math.abs(closeY - openY), 1.5);
                const candleW = Math.max(barWidth * 0.7, 3);

                return (
                  <g key={i} onMouseEnter={() => setHoveredIdx(i)} style={{ cursor: "crosshair" }}>
                    {/* Wick */}
                    <line x1={x} y1={highY} x2={x} y2={lowY} stroke={wickColor} strokeWidth="1" />
                    {/* Body */}
                    <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyHeight} fill={bodyColor} rx="0.5" />
                  </g>
                );
              })
            ) : (
              <path
                d={viewportCandles.map((c, i) => `${i === 0 ? "M" : "L"} ${indexToX(i)} ${priceToY(c.close)}`).join(" ")}
                fill="none" stroke="#38bdf8" strokeWidth="1.5"
              />
            )}
          </g>

          {/* Rejection pins — focus: capped to most-recent 5 (score-filtered when available) */}
          {rejections.map((r, rIdx) => {
            const matchCandle = viewportCandles.findIndex(c => c.time === r.time);
            if (matchCandle === -1) return null;
            if (displayMode === "focus") {
              // Score available: filter low-quality
              if (r.score != null && r.score < 0.6) return null;
              // Score unavailable: cap to most-recent 5 by array position (backend returns chronological)
              if (r.score == null && rIdx < rejections.length - 5) return null;
            }
            const isBull = r.event_type.includes("SUPPORT") || r.event_type.includes("BOUNCE");
            const x = indexToX(matchCandle);
            const c = viewportCandles[matchCandle];
            const y = isBull ? priceToY(c.low) + 10 : priceToY(c.high) - 10;
            return (
              <g key={rIdx}>
                <polygon
                  points={isBull
                    ? `${x},${y - 6} ${x - 4},${y + 2} ${x + 4},${y + 2}`
                    : `${x},${y + 6} ${x - 4},${y - 2} ${x + 4},${y - 2}`}
                  fill={isBull ? "#22c55e" : "#f43f5e"}
                  opacity="0.85"
                />
              </g>
            );
          })}

          {/* Breakout markers — structure + debug modes */}
          {displayMode !== "focus" && breakouts.map((b, bIdx) => {
            const matchCandle = viewportCandles.findIndex(c => c.time === b.time);
            if (matchCandle === -1) return null;
            const x = indexToX(matchCandle);
            const c = viewportCandles[matchCandle];
            const isBull = b.direction === "BULLISH" || b.direction === "UP";
            const y = isBull ? priceToY(c.high) - 8 : priceToY(c.low) + 8;
            return (
              <g key={bIdx}>
                <polygon
                  points={isBull
                    ? `${x},${y - 5} ${x - 4},${y + 3} ${x + 4},${y + 3}`
                    : `${x},${y + 5} ${x - 4},${y - 3} ${x + 4},${y - 3}`}
                  fill={b.confirmed ? (isBull ? "#4ade80" : "#fb7185") : "#fbbf24"}
                  opacity="0.75"
                />
              </g>
            );
          })}

          {/* Current Price Line */}
          <line
            x1={padding.left} y1={priceToY(currentPrice)}
            x2={width - padding.right} y2={priceToY(currentPrice)}
            stroke="#fbbf24" strokeWidth="1" strokeDasharray="4,3" opacity="0.8"
          />
          <rect x={width - padding.right} y={priceToY(currentPrice) - 9} width={70} height={18} fill="#fbbf24" rx="3" />
          <text x={width - padding.right + 4} y={priceToY(currentPrice) + 4} fill="#0f172a" fontSize="10" fontWeight="bold" fontFamily="monospace">
            {currentPrice.toFixed(1)}
          </text>

          {/* Right-edge line labels */}
          {lineLabels.map((lb) => {
            const labelX = width - padding.right + 4;
            const isNearest = lb.line_id === nearestResLineId || lb.line_id === nearestSupLineId;
            const atrText = lb.atrDist != null ? ` ${lb.atrDist.toFixed(2)}` : "";
            return (
              <g key={lb.line_id}>
                {/* Connector dot */}
                <circle cx={width - padding.right - 2} cy={lb.y} r="2.5" fill={lb.color} opacity="0.8" />
                {/* Label background */}
                <rect
                  x={labelX - 1} y={lb.y - 8}
                  width={isNearest ? 58 : 52} height={15}
                  fill={lb.color === "#f43f5e" ? "#3b0a14" : "#0a2616"}
                  stroke={lb.color}
                  strokeWidth={isNearest ? "1" : "0.5"}
                  rx="2"
                  opacity={isNearest ? "1" : "0.8"}
                />
                <text
                  x={labelX + 2} y={lb.y + 3.5}
                  fill={lb.color} fontSize={isNearest ? "9.5" : "8.5"} fontWeight={isNearest ? "bold" : "normal"} fontFamily="monospace"
                >
                  {lb.tag}{atrText}
                </text>
              </g>
            );
          })}

          {/* Hover crosshair */}
          {hoveredIdx !== null && (
            <line
              x1={indexToX(hoveredIdx)} y1={padding.top}
              x2={indexToX(hoveredIdx)} y2={padding.top + chartHeight}
              stroke="#64748b" strokeWidth="1" strokeDasharray="2,3" opacity="0.6"
            />
          )}

          {/* Hovered line tooltip */}
          {hoveredLine && (() => {
            const vpEnd = viewportCandles.length - 1;
            if (vpEnd < 0) return null;
            const ex = indexToX(vpEnd);
            const ey = priceToY(hoveredLine.current_price);
            const isRes = hoveredLine.direction === "BEARISH_RESISTANCE";
            const distAtr = atr > 0 ? Math.abs(hoveredLine.current_price - currentPrice) / atr : null;
            const tipX = Math.max(padding.left + 10, Math.min(ex - 130, width - padding.right - 140));
            const tipY = Math.max(padding.top + 5, ey - 55);
            return (
              <g>
                <rect x={tipX} y={tipY} width={130} height={54} fill="#0f172a" stroke={isRes ? "#f43f5e" : "#22c55e"} strokeWidth="0.8" rx="4" opacity="0.97" />
                <text x={tipX + 7} y={tipY + 14} fill="#e2e8f0" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  {hoveredLine.line_id.substring(0, 16)}
                </text>
                <text x={tipX + 7} y={tipY + 26} fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                  {hoveredLine.lifecycle} · tc:{hoveredLine.touch_count} · str:{hoveredLine.strength_score.toFixed(0)}
                </text>
                <text x={tipX + 7} y={tipY + 38} fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                  {isRes ? "RES" : "SUP"} @ {hoveredLine.current_price.toFixed(1)}
                </text>
                {distAtr != null && (
                  <text x={tipX + 7} y={tipY + 50} fill="#fbbf24" fontSize="8.5" fontFamily="monospace">
                    {distAtr.toFixed(2)} ATR from price
                  </text>
                )}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Footer */}
      <div className="d-flex flex-wrap justify-content-between align-items-center px-3 py-1" style={{ background: "#090e1a", borderTop: "1px solid rgba(148,163,184,0.10)", fontSize: "11px" }}>
        {hoveredCandle ? (
          <div className="font-mono" style={{ color: "#94a3b8" }}>
            <span style={{ color: "#64748b" }}>Bar {hoveredIdx} · {new Date(hoveredCandle.time).toLocaleTimeString()}</span>
            {" · "}O:<strong style={{ color: "#e2e8f0" }}>{hoveredCandle.open.toFixed(2)}</strong>{" "}
            H:<strong style={{ color: "#34d399" }}>{hoveredCandle.high.toFixed(2)}</strong>{" "}
            L:<strong style={{ color: "#f87171" }}>{hoveredCandle.low.toFixed(2)}</strong>{" "}
            C:<strong style={{ color: "#fbbf24" }}>{hoveredCandle.close.toFixed(2)}</strong>
          </div>
        ) : (
          <span style={{ color: "#475569" }}>Hover over any candle to inspect localized OHLC &amp; ray distance.</span>
        )}

        <div className="d-flex align-items-center gap-3 font-mono">
          <span style={{ color: resDistAtr != null && resDistAtr < 0.4 ? "#fb7185" : "#64748b" }}>
            Res Headroom:{" "}
            <strong style={{ color: resDistAtr != null && resDistAtr < 0.4 ? "#fb7185" : "#94a3b8" }}>
              {resDistAtr != null ? `${resDistAtr.toFixed(2)} ATR` : "Clear"}
            </strong>
            {nearestResLineId && lineLabels.find(l => l.line_id === nearestResLineId) && (
              <span style={{ color: "#f43f5e", marginLeft: "4px" }}>
                ({lineLabels.find(l => l.line_id === nearestResLineId)!.tag})
              </span>
            )}
          </span>
          <span style={{ color: supDistAtr != null && supDistAtr < 0.4 ? "#fb7185" : "#64748b" }}>
            Sup Headroom:{" "}
            <strong style={{ color: supDistAtr != null && supDistAtr < 0.4 ? "#fb7185" : "#94a3b8" }}>
              {supDistAtr != null ? `${supDistAtr.toFixed(2)} ATR` : "Clear"}
            </strong>
            {nearestSupLineId && lineLabels.find(l => l.line_id === nearestSupLineId) && (
              <span style={{ color: "#22c55e", marginLeft: "4px" }}>
                ({lineLabels.find(l => l.line_id === nearestSupLineId)!.tag})
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
