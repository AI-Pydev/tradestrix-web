"use client";

import type { PatternMatch } from "@/lib/harmonic-pattern-api";
import { useMemo, useRef, useState } from "react";

interface PivotMeta {
  price: number;
  time?: string;
  type?: string;
  isPredicted?: boolean;
}

export interface HarmonicCandleWaveChartProps {
  candles?: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  pivotsMeta?: {
    x?: PivotMeta;
    a?: PivotMeta;
    b?: PivotMeta;
    c?: PivotMeta;
    d?: PivotMeta;
  };
  xPrice: number;
  aPrice: number;
  bPrice: number;
  cPrice: number;
  dPrice: string;
  bestMatch?: PatternMatch | null;
  cmpPrice: number;
  symbol: string;
  timeframe: string;
}

export function HarmonicCandleWaveChart({
  candles = [],
  pivotsMeta,
  xPrice,
  aPrice,
  bPrice,
  cPrice,
  dPrice,
  bestMatch,
  cmpPrice,
  symbol,
  timeframe,
}: HarmonicCandleWaveChartProps) {
  const [chartType, setChartType] = useState<"candle" | "line">("candle");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Generate synthetic candles if live candle feed has not been fetched yet
  const displayCandles = useMemo(() => {
    if (candles && candles.length >= 10) {
      return candles.slice(-60);
    }

    const dVal =
      dPrice !== ""
        ? parseFloat(dPrice)
        : bestMatch?.predicted_d_mid || bestMatch?.target_3 || cPrice;

    const synth: Array<{
      time: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];

    const numPoints = 45;
    const now = new Date();

    const legPoints = [
      { idx: 0, price: xPrice },
      { idx: 10, price: aPrice },
      { idx: 22, price: bPrice },
      { idx: 32, price: cPrice },
      { idx: 44, price: dVal },
    ];

    let currPrice = xPrice;

    for (let i = 0; i < numPoints; i++) {
      let targetPrice = currPrice;
      for (let j = 0; j < legPoints.length - 1; j++) {
        if (i >= legPoints[j].idx && i <= legPoints[j + 1].idx) {
          const ratio =
            (i - legPoints[j].idx) / (legPoints[j + 1].idx - legPoints[j].idx);
          targetPrice =
            legPoints[j].price +
            (legPoints[j + 1].price - legPoints[j].price) * ratio;
          break;
        }
      }

      const noise = (Math.sin(i * 1.3) * 0.003 + (Math.random() - 0.5) * 0.005) * targetPrice;
      const open = i === 0 ? xPrice : synth[i - 1].close;
      const close = targetPrice + noise;
      const high = Math.max(open, close) + Math.abs(noise * 0.8) + targetPrice * 0.002;
      const low = Math.min(open, close) - Math.abs(noise * 0.8) - targetPrice * 0.002;

      const candleTime = new Date(
        now.getTime() - (numPoints - i) * (timeframe === "1d" ? 86400000 : 3600000)
      );

      synth.push({
        time: candleTime.toISOString().slice(0, 16).replace("T", " "),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(10000 + Math.random() * 50000),
      });
      currPrice = close;
    }

    return synth;
  }, [candles, xPrice, aPrice, bPrice, cPrice, dPrice, bestMatch, timeframe]);

  const chartHeight = 300;
  const paddingRight = 65;
  const paddingLeft = 15;
  const paddingTop = 28;
  const paddingBottom = 28;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const candleCount = displayCandles.length;
  const candleStep = 13;
  const candleWidth = 7;
  const svgWidth = Math.max(candleCount * candleStep + paddingLeft + paddingRight, 540);

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (!displayCandles.length) return { minPrice: 0, maxPrice: 1, priceRange: 1 };
    const lows = displayCandles.map((c) => c.low);
    const highs = displayCandles.map((c) => c.high);

    const dVal =
      dPrice !== ""
        ? parseFloat(dPrice)
        : bestMatch?.predicted_d_mid || bestMatch?.target_3 || cPrice;
    lows.push(xPrice, aPrice, bPrice, cPrice, dVal, cmpPrice);
    highs.push(xPrice, aPrice, bPrice, cPrice, dVal, cmpPrice);

    if (bestMatch?.stop_loss) lows.push(bestMatch.stop_loss);
    if (bestMatch?.target_2) highs.push(bestMatch.target_2);
    if (bestMatch?.target_3) highs.push(bestMatch.target_3);

    const validLows = lows.filter((p) => !isNaN(p) && p > 0);
    const validHighs = highs.filter((p) => !isNaN(p) && p > 0);

    const min = Math.min(...validLows);
    const max = Math.max(...validHighs);
    const buffer = (max - min) * 0.06 || 1.0;

    return {
      minPrice: min - buffer,
      maxPrice: max + buffer,
      priceRange: max - min + buffer * 2,
    };
  }, [displayCandles, xPrice, aPrice, bPrice, cPrice, dPrice, bestMatch, cmpPrice]);

  const calcY = (price: number) => {
    if (priceRange <= 0) return paddingTop + plotHeight / 2;
    const ratio = (price - minPrice) / priceRange;
    return paddingTop + plotHeight * (1 - ratio);
  };

  const getCandleX = (index: number) => {
    return paddingLeft + index * candleStep + candleStep / 2;
  };

  const harmonicPoints = useMemo(() => {
    if (!displayCandles.length) return null;

    const findBestIndex = (targetPrice: number, targetTime?: string, defaultIdx: number = 0) => {
      if (targetTime) {
        const targetMs = new Date(targetTime).getTime();
        if (!isNaN(targetMs)) {
          let closestIdx = 0;
          let minDiff = Infinity;
          displayCandles.forEach((c, idx) => {
            const diff = Math.abs(new Date(c.time).getTime() - targetMs);
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = idx;
            }
          });
          return closestIdx;
        }
      }

      let bestIdx = defaultIdx;
      let minDiff = Infinity;
      displayCandles.forEach((c, idx) => {
        const diff = Math.min(
          Math.abs(c.low - targetPrice),
          Math.abs(c.high - targetPrice),
          Math.abs(c.close - targetPrice)
        );
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = idx;
        }
      });
      return bestIdx;
    };

    const dVal =
      dPrice !== ""
        ? parseFloat(dPrice)
        : bestMatch?.predicted_d_mid || bestMatch?.target_3 || cPrice;

    const len = displayCandles.length;
    let idxX = findBestIndex(xPrice, pivotsMeta?.x?.time, Math.floor(len * 0.05));
    let idxA = findBestIndex(aPrice, pivotsMeta?.a?.time, Math.floor(len * 0.28));
    let idxB = findBestIndex(bPrice, pivotsMeta?.b?.time, Math.floor(len * 0.52));
    let idxC = findBestIndex(cPrice, pivotsMeta?.c?.time, Math.floor(len * 0.76));
    let idxD = findBestIndex(dVal, pivotsMeta?.d?.time, len - 1);

    if (idxA <= idxX) idxA = Math.min(len - 4, idxX + Math.max(1, Math.floor((len - idxX) * 0.25)));
    if (idxB <= idxA) idxB = Math.min(len - 3, idxA + Math.max(1, Math.floor((len - idxA) * 0.33)));
    if (idxC <= idxB) idxC = Math.min(len - 2, idxB + Math.max(1, Math.floor((len - idxB) * 0.50)));
    if (idxD <= idxC) idxD = len - 1;

    return {
      ptX: { x: getCandleX(idxX), y: calcY(xPrice), price: xPrice, label: "X", idx: idxX },
      ptA: { x: getCandleX(idxA), y: calcY(aPrice), price: aPrice, label: "A", idx: idxA },
      ptB: { x: getCandleX(idxB), y: calcY(bPrice), price: bPrice, label: "B", idx: idxB },
      ptC: { x: getCandleX(idxC), y: calcY(cPrice), price: cPrice, label: "C", idx: idxC },
      ptD: { x: getCandleX(idxD), y: calcY(dVal), price: dVal, label: "D", idx: idxD },
      isBullish: bestMatch?.direction === "BULLISH",
    };
  }, [displayCandles, xPrice, aPrice, bPrice, cPrice, dPrice, pivotsMeta, bestMatch, priceRange]);

  const linePathD = useMemo(() => {
    if (!displayCandles.length) return "";
    return displayCandles
      .map((c, i) => `${i === 0 ? "M" : "L"} ${getCandleX(i)} ${calcY(c.close)}`)
      .join(" ");
  }, [displayCandles, priceRange]);

  const priceTicks = useMemo(() => {
    if (priceRange <= 0) return [];
    const ticks = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      ticks.push(minPrice + (priceRange * i) / count);
    }
    return ticks;
  }, [minPrice, priceRange]);

  const activeCandle =
    hoveredIndex !== null && displayCandles[hoveredIndex]
      ? displayCandles[hoveredIndex]
      : displayCandles[displayCandles.length - 1];

  const candleChange = activeCandle ? activeCandle.close - activeCandle.open : 0;
  const candleChangePct = activeCandle && activeCandle.open > 0 ? (candleChange / activeCandle.open) * 100 : 0;

  return (
    <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden my-3">
      <div className="card-header bg-dark text-white p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="fs-5">🕯️</span>
          <div>
            <h6 className="fw-bold mb-0 text-white">
              Harmonic Wave Candlestick Overlay • {symbol} ({timeframe})
            </h6>
            <span className="small text-white text-opacity-75" style={{ fontSize: "11px" }}>
              Live Price Action • Candlestick & Pattern Confluence • Recent {displayCandles.length} Candles
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {activeCandle && (
            <div className="d-none d-md-flex align-items-center gap-2 bg-black bg-opacity-30 px-3 py-1 rounded-3 font-monospace small" style={{ fontSize: "11px" }}>
              <span className="text-secondary">{activeCandle.time.slice(5, 16)}</span>
              <span>O: ₹{activeCandle.open.toFixed(1)}</span>
              <span>H: ₹{activeCandle.high.toFixed(1)}</span>
              <span>L: ₹{activeCandle.low.toFixed(1)}</span>
              <span className={candleChange >= 0 ? "text-success fw-bold" : "text-danger fw-bold"}>
                C: ₹{activeCandle.close.toFixed(1)} ({candleChange >= 0 ? "+" : ""}{candleChange.toFixed(1)} / {candleChangePct.toFixed(2)}%)
              </span>
            </div>
          )}

          <div className="btn-group btn-group-sm p-1 bg-white bg-opacity-10 rounded-3">
            <button
              type="button"
              className={`btn btn-sm ${chartType === "candle" ? "btn-primary shadow-sm fw-bold" : "btn-link text-white text-decoration-none"}`}
              onClick={() => setChartType("candle")}
            >
              🕯️ Candles
            </button>
            <button
              type="button"
              className={`btn btn-sm ${chartType === "line" ? "btn-primary shadow-sm fw-bold" : "btn-link text-white text-decoration-none"}`}
              onClick={() => setChartType("line")}
            >
              📈 Line
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="p-2 position-relative overflow-x-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${chartHeight}`}
          className="w-100"
          style={{ minWidth: "540px", maxHeight: "320px" }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {priceTicks.map((p, idx) => {
            const yPos = calcY(p);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={svgWidth - paddingRight}
                  y2={yPos}
                  stroke="rgba(0,0,0,0.05)"
                  strokeDasharray="2,3"
                />
                <text
                  x={svgWidth - paddingRight + 6}
                  y={yPos + 3.5}
                  fontSize="9.5"
                  fill="#6c757d"
                  fontFamily="monospace"
                >
                  ₹{p.toFixed(1)}
                </text>
              </g>
            );
          })}

          {harmonicPoints && (
            <>
              <polygon
                points={`${harmonicPoints.ptX.x},${harmonicPoints.ptX.y} ${harmonicPoints.ptA.x},${harmonicPoints.ptA.y} ${harmonicPoints.ptB.x},${harmonicPoints.ptB.y}`}
                fill="rgba(13, 110, 253, 0.12)"
                stroke="rgba(13, 110, 253, 0.35)"
                strokeWidth="1.2"
              />

              <polygon
                points={`${harmonicPoints.ptB.x},${harmonicPoints.ptB.y} ${harmonicPoints.ptC.x},${harmonicPoints.ptC.y} ${harmonicPoints.ptD.x},${harmonicPoints.ptD.y}`}
                fill={
                  harmonicPoints.isBullish
                    ? "rgba(25, 135, 84, 0.14)"
                    : "rgba(220, 53, 69, 0.14)"
                }
                stroke={
                  harmonicPoints.isBullish
                    ? "rgba(25, 135, 84, 0.4)"
                    : "rgba(220, 53, 69, 0.4)"
                }
                strokeWidth="1.2"
              />

              <polyline
                fill="none"
                stroke="#0d6efd"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={`${harmonicPoints.ptX.x},${harmonicPoints.ptX.y} ${harmonicPoints.ptA.x},${harmonicPoints.ptA.y} ${harmonicPoints.ptB.x},${harmonicPoints.ptB.y} ${harmonicPoints.ptC.x},${harmonicPoints.ptC.y}`}
              />

              <line
                x1={harmonicPoints.ptC.x}
                y1={harmonicPoints.ptC.y}
                x2={harmonicPoints.ptD.x}
                y2={harmonicPoints.ptD.y}
                stroke={harmonicPoints.isBullish ? "#198754" : "#dc3545"}
                strokeWidth="2.5"
                strokeDasharray={dPrice === "" ? "5,3" : "none"}
                strokeLinecap="round"
              />
            </>
          )}

          {chartType === "line" && (
            <>
              <path
                d={`${linePathD} L ${getCandleX(displayCandles.length - 1)} ${calcY(minPrice)} L ${getCandleX(0)} ${calcY(minPrice)} Z`}
                fill="url(#lineGrad)"
              />
              <path
                d={linePathD}
                fill="none"
                stroke="#0d6efd"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </>
          )}

          {chartType === "candle" &&
            displayCandles.map((c, idx) => {
              const cx = getCandleX(idx);
              const isUp = c.close >= c.open;
              const openY = calcY(c.open);
              const closeY = calcY(c.close);
              const highY = calcY(c.high);
              const lowY = calcY(c.low);
              const bodyY = Math.min(openY, closeY);
              const bodyH = Math.max(Math.abs(closeY - openY), 1.5);
              const candleColor = isUp ? "#198754" : "#dc3545";
              const isHovered = hoveredIndex === idx;

              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                >
                  <line
                    x1={cx}
                    y1={highY}
                    x2={cx}
                    y2={lowY}
                    stroke={candleColor}
                    strokeWidth={isHovered ? "1.8" : "1.2"}
                  />
                  <rect
                    x={cx - candleWidth / 2}
                    y={bodyY}
                    width={candleWidth}
                    height={bodyH}
                    fill={candleColor}
                    rx="1"
                    stroke={isHovered ? "#000000" : candleColor}
                    strokeWidth={isHovered ? "1.2" : "0.5"}
                  />
                </g>
              );
            })}

          {harmonicPoints && (
            <>
              {[
                harmonicPoints.ptX,
                harmonicPoints.ptA,
                harmonicPoints.ptB,
                harmonicPoints.ptC,
              ].map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5.5"
                    fill="#0d6efd"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <rect
                    x={pt.x - 14}
                    y={pt.y - 20}
                    width="28"
                    height="14"
                    rx="3"
                    fill="#0d6efd"
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="bold"
                    fill="#ffffff"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}

              <g>
                <circle
                  cx={harmonicPoints.ptD.x}
                  cy={harmonicPoints.ptD.y}
                  r="7"
                  fill={harmonicPoints.isBullish ? "#198754" : "#dc3545"}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <rect
                  x={harmonicPoints.ptD.x - 18}
                  y={harmonicPoints.ptD.y - 22}
                  width="36"
                  height="15"
                  rx="3"
                  fill={harmonicPoints.isBullish ? "#198754" : "#dc3545"}
                />
                <text
                  x={harmonicPoints.ptD.x}
                  y={harmonicPoints.ptD.y - 11}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="bold"
                  fill="#ffffff"
                >
                  D (PRZ)
                </text>
              </g>
            </>
          )}

          {bestMatch && (
            <>
              {bestMatch.target_1 && (
                <g>
                  <line
                    x1={paddingLeft}
                    y1={calcY(bestMatch.target_1)}
                    x2={svgWidth - paddingRight}
                    y2={calcY(bestMatch.target_1)}
                    stroke="#0d6efd"
                    strokeDasharray="3,3"
                    strokeWidth="1.2"
                    opacity="0.75"
                  />
                  <text
                    x={svgWidth - paddingRight + 4}
                    y={calcY(bestMatch.target_1) + 3}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#0d6efd"
                  >
                    T1 ₹{bestMatch.target_1.toFixed(1)}
                  </text>
                </g>
              )}

              {bestMatch.target_2 && (
                <g>
                  <line
                    x1={paddingLeft}
                    y1={calcY(bestMatch.target_2)}
                    x2={svgWidth - paddingRight}
                    y2={calcY(bestMatch.target_2)}
                    stroke="#0dcaf0"
                    strokeDasharray="3,3"
                    strokeWidth="1.2"
                    opacity="0.75"
                  />
                  <text
                    x={svgWidth - paddingRight + 4}
                    y={calcY(bestMatch.target_2) + 3}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#0dcaf0"
                  >
                    T2 ₹{bestMatch.target_2.toFixed(1)}
                  </text>
                </g>
              )}

              {bestMatch.stop_loss && (
                <g>
                  <line
                    x1={paddingLeft}
                    y1={calcY(bestMatch.stop_loss)}
                    x2={svgWidth - paddingRight}
                    y2={calcY(bestMatch.stop_loss)}
                    stroke="#dc3545"
                    strokeDasharray="3,3"
                    strokeWidth="1.4"
                    opacity="0.85"
                  />
                  <text
                    x={svgWidth - paddingRight + 4}
                    y={calcY(bestMatch.stop_loss) + 3}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#dc3545"
                  >
                    SL ₹{bestMatch.stop_loss.toFixed(1)}
                  </text>
                </g>
              )}

              {/* Immediate Resistance (R1) Line */}
              {(() => {
                const immRes = bestMatch.immediate_resistance;
                if (!immRes || immRes === bestMatch.target_1 || immRes === bestMatch.target_2) return null;
                return (
                  <g>
                    <line
                      x1={paddingLeft}
                      y1={calcY(immRes)}
                      x2={svgWidth - paddingRight}
                      y2={calcY(immRes)}
                      stroke="#fd7e14"
                      strokeDasharray="2,2"
                      strokeWidth="1.2"
                      opacity="0.8"
                    />
                    <text
                      x={svgWidth - paddingRight + 4}
                      y={calcY(immRes) + 3}
                      fontSize="9"
                      fontWeight="bold"
                      fill="#fd7e14"
                    >
                      R1 ₹{immRes.toFixed(1)}
                    </text>
                  </g>
                );
              })()}

              {/* Immediate Support (S1) Line */}
              {(() => {
                const immSupp = bestMatch.immediate_support;
                if (!immSupp || immSupp === bestMatch.stop_loss) return null;
                return (
                  <g>
                    <line
                      x1={paddingLeft}
                      y1={calcY(immSupp)}
                      x2={svgWidth - paddingRight}
                      y2={calcY(immSupp)}
                      stroke="#20c997"
                      strokeDasharray="2,2"
                      strokeWidth="1.2"
                      opacity="0.8"
                    />
                    <text
                      x={svgWidth - paddingRight + 4}
                      y={calcY(immSupp) + 3}
                      fontSize="9"
                      fontWeight="bold"
                      fill="#20c997"
                    >
                      S1 ₹{immSupp.toFixed(1)}
                    </text>
                  </g>
                );
              })()}
            </>
          )}

          {cmpPrice > 0 && (
            <g>
              <line
                x1={paddingLeft}
                y1={calcY(cmpPrice)}
                x2={svgWidth - paddingRight}
                y2={calcY(cmpPrice)}
                stroke="#ffc107"
                strokeDasharray="4,3"
                strokeWidth="1.6"
                opacity="0.9"
              />

              <g transform={`translate(${getCandleX(displayCandles.length - 1)}, ${calcY(cmpPrice)})`}>
                <circle r="10" fill="rgba(255, 193, 7, 0.3)">
                  <animate attributeName="r" values="6;14;6" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle r="5" fill="#ffc107" stroke="#ffffff" strokeWidth="2" />
              </g>

              <g transform={`translate(${svgWidth - paddingRight + 2}, ${calcY(cmpPrice) - 8})`}>
                <rect x="0" y="0" width="60" height="16" rx="3" fill="#ffc107" stroke="#ffffff" strokeWidth="1" />
                <text x="30" y="11" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#000000">
                  LTP ₹{cmpPrice.toFixed(1)}
                </text>
              </g>
            </g>
          )}

          {hoveredIndex !== null && (
            <line
              x1={getCandleX(hoveredIndex)}
              y1={paddingTop}
              x2={getCandleX(hoveredIndex)}
              y2={chartHeight - paddingBottom}
              stroke="#6c757d"
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          )}
        </svg>
      </div>

      <div className="card-footer bg-light py-2 px-3 d-flex flex-wrap justify-content-between align-items-center small text-secondary">
        <div className="d-flex align-items-center gap-3 flex-wrap" style={{ fontSize: "11.5px" }}>
          <span className="d-flex align-items-center gap-1">
            <span className="badge bg-success p-1 rounded-circle" style={{ width: "8px", height: "8px" }} />
            Bullish Candle
          </span>
          <span className="d-flex align-items-center gap-1">
            <span className="badge bg-danger p-1 rounded-circle" style={{ width: "8px", height: "8px" }} />
            Bearish Candle
          </span>
          <span className="d-flex align-items-center gap-1 fw-bold text-dark">
            <span className="badge bg-warning p-1 rounded-circle" style={{ width: "8px", height: "8px" }} />
            🟡 Live LTP / CMP
          </span>
          <span className="d-flex align-items-center gap-1 text-primary">
            <span className="badge bg-primary p-1 rounded-circle" style={{ width: "8px", height: "8px" }} />
            Harmonic Geometry
          </span>
          <span className="d-flex align-items-center gap-1 text-info">
            <span className="badge bg-info p-1 rounded-circle" style={{ width: "8px", height: "8px" }} />
            Profit Targets
          </span>
          <span className="d-flex align-items-center gap-1 text-danger">
            <span className="badge bg-danger p-1 rounded-circle" style={{ width: "8px", height: "8px" }} />
            Stop Loss
          </span>
          <span className="d-flex align-items-center gap-1" style={{ color: "#20c997" }}>
            <span className="badge p-1 rounded-circle" style={{ backgroundColor: "#20c997", width: "8px", height: "8px" }} />
            S₁ Support
          </span>
          <span className="d-flex align-items-center gap-1" style={{ color: "#fd7e14" }}>
            <span className="badge p-1 rounded-circle" style={{ backgroundColor: "#fd7e14", width: "8px", height: "8px" }} />
            R₁ Resistance
          </span>
        </div>

        <span className="font-monospace small text-muted" style={{ fontSize: "10.5px" }}>
          Hover candles for OHLC inspect
        </span>
      </div>
    </div>
  );
}

export default HarmonicCandleWaveChart;
