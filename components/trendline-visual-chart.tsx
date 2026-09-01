"use client";

import {
    TrendLineChartFormation,
    TrendLineChartLine,
} from "@/lib/api";
import { useMemo, useRef, useState } from "react";

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
  rejections?: Array<{ event_type: string; price: number; line_id: string; time: string }>;
  breakouts?: Array<{ event_type: string; price: number; line_id: string; time: string; direction: string }>;
  currentPrice: number;
  atr: number;
  symbol: string;
  timeframe: string;
  resDistAtr?: number;
  supDistAtr?: number;
}

export function TrendlineVisualChart({
  candles,
  activeLines,
  formations,
  rejections = [],
  currentPrice,
  atr,
  symbol,
  timeframe,
  resDistAtr,
  supDistAtr,
}: TrendlineVisualChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<"candles" | "heikin_ashi" | "line">("candles");
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
        ha.push({
          time: c.time,
          open: (c.open + c.close) / 2,
          high: c.high,
          low: c.low,
          close: (c.open + c.high + c.low + c.close) / 4,
          volume: c.volume,
        });
      } else {
        const prevHa = ha[i - 1];
        const haClose = (c.open + c.high + c.low + c.close) / 4;
        const haOpen = (prevHa.open + prevHa.close) / 2;
        const haHigh = Math.max(c.high, haOpen, haClose);
        const haLow = Math.min(c.low, haOpen, haClose);
        ha.push({
          time: c.time,
          open: haOpen,
          high: haHigh,
          low: haLow,
          close: haClose,
          volume: c.volume,
        });
      }
    }
    return ha;
  }, [candles, chartMode]);

  // Dimension and scale metrics
  const width = 850;
  const height = 440;
  const padding = { top: 30, right: 70, bottom: 40, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { minPrice, maxPrice, barWidth } = useMemo(() => {
    if (displayCandles.length === 0) {
      return { minPrice: 100, maxPrice: 120, barWidth: 8 };
    }
    let minP = Infinity;
    let maxP = -Infinity;

    for (const c of displayCandles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    }

    // Include active lines and formation apexes in price extent
    for (const l of activeLines) {
      if (l.start_price < minP) minP = l.start_price;
      if (l.start_price > maxP) maxP = l.start_price;
      if (l.current_price < minP) minP = l.current_price;
      if (l.current_price > maxP) maxP = l.current_price;
    }

    const priceBuffer = Math.max((maxP - minP) * 0.08, atr * 1.5, 2.0);
    const bW = Math.max(chartWidth / Math.max(displayCandles.length, 1), 4);

    return {
      minPrice: minP - priceBuffer,
      maxPrice: maxP + priceBuffer,
      barWidth: bW,
    };
  }, [displayCandles, activeLines, atr, chartWidth]);

  const priceToY = (price: number) => {
    const range = maxPrice - minPrice || 1;
    return padding.top + chartHeight - ((price - minPrice) / range) * chartHeight;
  };

  const indexToX = (index: number) => {
    return padding.left + (index + 0.5) * barWidth;
  };

  const hoveredCandle = hoveredIdx !== null && displayCandles[hoveredIdx] ? displayCandles[hoveredIdx] : null;

  return (
    <div className="card bg-slate-950 border-slate-800 text-white overflow-hidden shadow-xl" ref={containerRef}>
      {/* Chart Toolbar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center bg-slate-900/90 border-b border-slate-800 px-3 py-2">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-indigo-900/80 text-indigo-300 font-mono text-xs px-2 py-1">
            {symbol} ({timeframe})
          </span>
          <span className="text-xs text-slate-400">
            Price: <strong className="text-white font-mono">{currentPrice.toFixed(2)}</strong> | ATR:{" "}
            <span className="text-amber-400 font-mono">{atr.toFixed(2)}</span>
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="btn-group btn-group-sm">
            <button
              className={`btn btn-xs ${chartMode === "candles" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setChartMode("candles")}
            >
              Candles
            </button>
            <button
              className={`btn btn-xs ${chartMode === "heikin_ashi" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setChartMode("heikin_ashi")}
            >
              Heikin-Ashi
            </button>
            <button
              className={`btn btn-xs ${chartMode === "line" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setChartMode("line")}
            >
              Line
            </button>
          </div>

          <button
            className={`btn btn-xs ${showHazardBands ? "btn-warning text-dark font-bold" : "btn-outline-secondary text-slate-400"}`}
            onClick={() => setShowHazardBands(!showHazardBands)}
            title="Toggle ±0.40 ATR Obstacle Hazard Zone"
          >
            🛡️ Hazard Band
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="position-relative w-100" style={{ minHeight: "440px" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-100 h-auto user-select-none"
          style={{ display: "block" }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/* Bullish support glow */}
            <filter id="greenGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10b981" floodOpacity="0.6" />
            </filter>
            {/* Bearish resistance glow */}
            <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ef4444" floodOpacity="0.6" />
            </filter>
            {/* Channel shading gradient */}
            <linearGradient id="channelBullGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="channelBearGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + chartHeight * pct;
            const p = maxPrice - pct * (maxPrice - minPrice);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                />
                <text
                  x={width - padding.right + 6}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {p.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Obstacle Headroom Hazard Bands */}
          {showHazardBands && (
            <g opacity="0.4">
              {/* Resistance hazard band above current price */}
              <rect
                x={padding.left}
                y={priceToY(currentPrice + 0.40 * atr)}
                width={chartWidth}
                height={Math.max(priceToY(currentPrice) - priceToY(currentPrice + 0.40 * atr), 1)}
                fill="#ef4444"
                opacity="0.18"
              />
              {/* Support hazard band below current price */}
              <rect
                x={padding.left}
                y={priceToY(currentPrice)}
                width={chartWidth}
                height={Math.max(priceToY(currentPrice - 0.40 * atr) - priceToY(currentPrice), 1)}
                fill="#10b981"
                opacity="0.18"
              />
            </g>
          )}

          {/* Current Price Line */}
          <line
            x1={padding.left}
            y1={priceToY(currentPrice)}
            x2={width - padding.right}
            y2={priceToY(currentPrice)}
            stroke="#f59e0b"
            strokeWidth="1"
            strokeDasharray="4,2"
            opacity="0.7"
          />
          <rect
            x={width - padding.right}
            y={priceToY(currentPrice) - 9}
            width={65}
            height={18}
            fill="#f59e0b"
            rx="2"
          />
          <text
            x={width - padding.right + 4}
            y={priceToY(currentPrice) + 4}
            fill="#0f172a"
            fontSize="10"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {currentPrice.toFixed(1)}
          </text>

          {/* Formations (Channels & Triangles Shading) */}
          {formations.map((f) => {
            const upper = activeLines.find((l) => l.line_id === f.upper_line_id);
            const lower = activeLines.find((l) => l.line_id === f.lower_line_id);
            if (!upper || !lower) return null;

            const startIdx = Math.min(upper.start_index, lower.start_index);
            const endIdx = displayCandles.length - 1;

            const uStartX = indexToX(startIdx);
            const uStartY = priceToY(upper.start_price);
            const uEndX = indexToX(endIdx);
            const uEndY = priceToY(upper.current_price);

            const lStartX = indexToX(startIdx);
            const lStartY = priceToY(lower.start_price);
            const lEndX = indexToX(endIdx);
            const lEndY = priceToY(lower.current_price);

            const polygonPoints = `${uStartX},${uStartY} ${uEndX},${uEndY} ${lEndX},${lEndY} ${lStartX},${lStartY}`;
            const isBullChannel = f.pattern_type === "RISING_CHANNEL";

            return (
              <g key={f.formation_id}>
                {/* Shaded Corridor */}
                <polygon
                  points={polygonPoints}
                  fill={isBullChannel ? "url(#channelBullGrad)" : "url(#channelBearGrad)"}
                  stroke={isBullChannel ? "#10b981" : "#ef4444"}
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                  opacity="0.8"
                />

                {/* Triangle Apex crosshair */}
                {f.converging && f.apex_index != null && f.apex_price != null && (
                  <g>
                    <line
                      x1={indexToX(f.apex_index) - 10}
                      y1={priceToY(f.apex_price)}
                      x2={indexToX(f.apex_index) + 10}
                      y2={priceToY(f.apex_price)}
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={indexToX(f.apex_index)}
                      y1={priceToY(f.apex_price) - 10}
                      x2={indexToX(f.apex_index)}
                      y2={priceToY(f.apex_price) + 10}
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={indexToX(f.apex_index)}
                      cy={priceToY(f.apex_price)}
                      r="4"
                      fill="#fbbf24"
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                    <text
                      x={indexToX(f.apex_index) + 6}
                      y={priceToY(f.apex_price) - 6}
                      fill="#fbbf24"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      Apex ({(f.apex_proximity_pct * 100).toFixed(0)}%)
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Active Trendlines (Rays + Touch Anchors) */}
          {activeLines.map((l) => {
            const isSupport = l.direction === "BULLISH_SUPPORT";
            const strokeColor = isSupport ? "#22c55e" : "#f43f5e";
            const glowFilter = isSupport ? "url(#greenGlow)" : "url(#redGlow)";

            const startX = indexToX(l.start_index);
            const startY = priceToY(l.start_price);
            const endX = indexToX(displayCandles.length - 1);
            const endY = priceToY(l.current_price);

            return (
              <g key={l.line_id}>
                {/* Main Fitted Ray */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeDasharray={l.lifecycle === "VALID" || l.lifecycle === "STRONG" ? "none" : "4,3"}
                  filter={glowFilter}
                />

                {/* Touch Anchor Dots */}
                {l.anchors.map((a, aIdx) => (
                  <circle
                    key={aIdx}
                    cx={indexToX(a.index)}
                    cy={priceToY(a.price)}
                    r="4"
                    fill={strokeColor}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                ))}

                {/* Trendline Label Tag at End */}
                <rect
                  x={endX + 3}
                  y={endY - 8}
                  width={isSupport ? 46 : 46}
                  height={15}
                  fill={isSupport ? "#14532d" : "#7f1d1d"}
                  stroke={strokeColor}
                  strokeWidth="0.8"
                  rx="3"
                />
                <text
                  x={endX + 6}
                  y={endY + 3}
                  fill="#ffffff"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {isSupport ? "SUP" : "RES"} {l.strength_score.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Candlesticks */}
          {chartMode !== "line" ? (
            displayCandles.map((c, i) => {
              const x = indexToX(i);
              const isUp = c.close >= c.open;
              const candleColor = isUp ? "#10b981" : "#ef4444";
              const openY = priceToY(c.open);
              const closeY = priceToY(c.close);
              const highY = priceToY(c.high);
              const lowY = priceToY(c.low);

              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(Math.abs(closeY - openY), 1.5);
              const candleW = Math.max(barWidth * 0.72, 3);

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredIdx(i)}
                  className="cursor-pointer"
                >
                  {/* High/Low Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={candleColor}
                    strokeWidth="1.2"
                  />
                  {/* Candle Body */}
                  <rect
                    x={x - candleW / 2}
                    y={bodyTop}
                    width={candleW}
                    height={bodyHeight}
                    fill={candleColor}
                    stroke={candleColor}
                    strokeWidth="0.5"
                    rx="1"
                  />
                </g>
              );
            })
          ) : (
            /* Line View */
            <path
              d={displayCandles
                .map((c, i) => `${i === 0 ? "M" : "L"} ${indexToX(i)} ${priceToY(c.close)}`)
                .join(" ")}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
            />
          )}

          {/* Rejection / Bounce Pins */}
          {rejections.map((r, rIdx) => {
            const matchIdx = displayCandles.findIndex((c) => c.time === r.time);
            if (matchIdx === -1) return null;
            const x = indexToX(matchIdx);
            const isBull = r.event_type.includes("SUPPORT");
            const y = isBull ? priceToY(displayCandles[matchIdx].low) + 12 : priceToY(displayCandles[matchIdx].high) - 12;

            return (
              <g key={rIdx}>
                <circle cx={x} cy={y} r="5" fill={isBull ? "#22c55e" : "#f43f5e"} />
                <text x={x} y={y + 3} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                  {isBull ? "▲" : "▼"}
                </text>
              </g>
            );
          })}

          {/* Hover Crosshair & Details */}
          {hoveredIdx !== null && (
            <g>
              <line
                x1={indexToX(hoveredIdx)}
                y1={padding.top}
                x2={indexToX(hoveredIdx)}
                y2={padding.top + chartHeight}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.8"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Hover Info Footer */}
      <div className="bg-slate-900/80 border-t border-slate-800 px-3 py-1.5 d-flex justify-content-between align-items-center text-xs">
        {hoveredCandle ? (
          <div className="font-mono text-slate-300">
            <span>Bar: <strong>{hoveredIdx}</strong></span> |{" "}
            <span>Time: <strong>{new Date(hoveredCandle.time).toLocaleTimeString()}</strong></span> |{" "}
            <span>O: <strong className="text-white">{hoveredCandle.open.toFixed(2)}</strong></span>{" "}
            <span>H: <strong className="text-emerald-400">{hoveredCandle.high.toFixed(2)}</strong></span>{" "}
            <span>L: <strong className="text-rose-400">{hoveredCandle.low.toFixed(2)}</strong></span>{" "}
            <span>C: <strong className="text-amber-300">{hoveredCandle.close.toFixed(2)}</strong></span>
          </div>
        ) : (
          <span className="text-slate-500">Hover over any candle to inspect localized OHLC & ray distance.</span>
        )}

        <div className="d-flex align-items-center gap-3 font-mono">
          <span className={resDistAtr != null && resDistAtr < 0.40 ? "text-rose-400 font-bold" : "text-slate-400"}>
            Res Headroom: {resDistAtr != null ? `${resDistAtr.toFixed(2)} ATR` : "Clear"}
          </span>
          <span className={supDistAtr != null && supDistAtr < 0.40 ? "text-rose-400 font-bold" : "text-slate-400"}>
            Sup Headroom: {supDistAtr != null ? `${supDistAtr.toFixed(2)} ATR` : "Clear"}
          </span>
        </div>
      </div>
    </div>
  );
}

