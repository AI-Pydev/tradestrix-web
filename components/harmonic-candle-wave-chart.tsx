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
  direction?: "AUTO" | "BULLISH" | "BEARISH";
  isBullishOverride?: boolean;
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
  direction = "AUTO",
  isBullishOverride,
}: HarmonicCandleWaveChartProps) {
  const [chartType, setChartType] = useState<"candle" | "line">("candle");
  const [displayMode, setDisplayMode] = useState<"dual" | "forming" | "reversal">("dual");
  const [hoveredIndex1, setHoveredIndex1] = useState<number | null>(null);
  const [hoveredIndex2, setHoveredIndex2] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Resolved Bullish vs Bearish orientation
  const isBullish = useMemo(() => {
    if (typeof isBullishOverride === "boolean") return isBullishOverride;
    if (direction === "BULLISH") return true;
    if (direction === "BEARISH") return false;
    if (bestMatch?.direction) {
      return bestMatch.direction.toUpperCase() === "BULLISH";
    }
    return aPrice > xPrice;
  }, [isBullishOverride, direction, bestMatch, aPrice, xPrice]);

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

      const noise =
        (Math.sin(i * 1.3) * 0.003 + (Math.random() - 0.5) * 0.005) * targetPrice;
      const open = i === 0 ? xPrice : synth[i - 1].close;
      const close = targetPrice + noise;
      const high =
        Math.max(open, close) + Math.abs(noise * 0.8) + targetPrice * 0.002;
      const low =
        Math.min(open, close) - Math.abs(noise * 0.8) - targetPrice * 0.002;

      const candleTime = new Date(
        now.getTime() -
          (numPoints - i) * (timeframe === "1d" ? 86400000 : 3600000)
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

  const chartHeight = 270;
  const paddingRight = 65;
  const paddingLeft = 15;
  const paddingTop = 28;
  const paddingBottom = 28;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const candleCount = displayCandles.length;
  const candleStep = 13;
  const candleWidth = 7;
  const svgWidth = Math.max(candleCount * candleStep + paddingLeft + paddingRight, 540);

  // Common price boundaries calculation
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

  // Harmonic coordinates mapped to candles
  const harmonicPoints = useMemo(() => {
    if (!displayCandles.length) return null;

    const findBestIndex = (
      targetPrice: number,
      targetTime?: string,
      defaultIdx: number = 0
    ) => {
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

    if (idxA <= idxX)
      idxA = Math.min(len - 4, idxX + Math.max(1, Math.floor((len - idxX) * 0.25)));
    if (idxB <= idxA)
      idxB = Math.min(len - 3, idxA + Math.max(1, Math.floor((len - idxA) * 0.33)));
    if (idxC <= idxB)
      idxC = Math.min(len - 2, idxB + Math.max(1, Math.floor((len - idxB) * 0.5)));
    if (idxD <= idxC) idxD = len - 1;

    // Progression node for live CMP along C -> D
    const cdDistance = Math.abs(dVal - cPrice) || 1.0;
    const progressFrac = Math.min(
      1.0,
      Math.max(0.0, Math.abs(cmpPrice - cPrice) / cdDistance)
    );
    const cmpIdx = Math.min(
      len - 1,
      Math.max(idxC, Math.round(idxC + (idxD - idxC) * progressFrac))
    );

    return {
      ptX: { x: getCandleX(idxX), y: calcY(xPrice), price: xPrice, label: "X", idx: idxX },
      ptA: { x: getCandleX(idxA), y: calcY(aPrice), price: aPrice, label: "A", idx: idxA },
      ptB: { x: getCandleX(idxB), y: calcY(bPrice), price: bPrice, label: "B", idx: idxB },
      ptC: { x: getCandleX(idxC), y: calcY(cPrice), price: cPrice, label: "C", idx: idxC },
      ptD: { x: getCandleX(idxD), y: calcY(dVal), price: dVal, label: "D", idx: idxD },
      ptCmp: {
        x: getCandleX(cmpIdx),
        y: calcY(cmpPrice),
        price: cmpPrice,
        label: "LTP",
        idx: cmpIdx,
      },
      isBullish,
      dVal,
    };
  }, [
    displayCandles,
    xPrice,
    aPrice,
    bPrice,
    cPrice,
    dPrice,
    pivotsMeta,
    bestMatch,
    priceRange,
    cmpPrice,
    isBullish,
  ]);

  // Stage 1 Forming targets calculation (C -> D momentum scalp)
  const formingData = useMemo(() => {
    const dVal =
      dPrice !== ""
        ? parseFloat(dPrice)
        : bestMatch?.predicted_d_mid || bestMatch?.target_3 || cPrice;

    const formingAction = isBullish ? "SHORT / PUT" : "LONG / CALL";
    const formingDirectionBadge = isBullish ? "BEARISH C→D SCALP" : "BULLISH C→D SCALP";

    const formingT1 = isBullish
      ? cPrice - Math.abs(cPrice - dVal) * 0.5
      : cPrice + Math.abs(dVal - cPrice) * 0.5;
    const formingT2 = dVal;

    const cBuffer = Math.abs(cPrice - bPrice) * 0.1 || cPrice * 0.01;
    const formingSL = isBullish ? cPrice + cBuffer : cPrice - cBuffer;

    const formingT1Pts = isBullish
      ? Math.max(0, cmpPrice - formingT1)
      : Math.max(0, formingT1 - cmpPrice);
    const formingT1Pct = cmpPrice > 0 ? (formingT1Pts / cmpPrice) * 100 : 0;

    const formingT2Pts = isBullish
      ? Math.max(0, cmpPrice - formingT2)
      : Math.max(0, formingT2 - cmpPrice);
    const formingT2Pct = cmpPrice > 0 ? (formingT2Pts / cmpPrice) * 100 : 0;

    const formingSlPts = isBullish
      ? Math.max(0, formingSL - cmpPrice)
      : Math.max(0, cmpPrice - formingSL);
    const formingSlPct = cmpPrice > 0 ? (formingSlPts / cmpPrice) * 100 : 0;

    const cdSpread = Math.abs(dVal - cPrice) || 1.0;
    const progressPct = Math.round(
      Math.min(1.0, Math.max(0.0, Math.abs(cmpPrice - cPrice) / cdSpread)) * 100
    );
    const ptsToD = Math.abs(dVal - cmpPrice);

    return {
      formingAction,
      formingDirectionBadge,
      formingT1,
      formingT2,
      formingSL,
      formingT1Pts,
      formingT1Pct,
      formingT2Pts,
      formingT2Pct,
      formingSlPts,
      formingSlPct,
      progressPct,
      ptsToD,
      dVal,
    };
  }, [bestMatch, dPrice, cPrice, bPrice, cmpPrice, isBullish]);

  // Stage 2 Reversal targets calculation (D -> T1 -> T2 -> T3)
  const reversalData = useMemo(() => {
    const dVal =
      dPrice !== ""
        ? parseFloat(dPrice)
        : bestMatch?.predicted_d_mid || bestMatch?.target_3 || cPrice;

    const reversalAction = isBullish ? "BUY / LONG" : "SELL / SHORT";
    const reversalDirectionBadge = isBullish
      ? "BULLISH PRZ REVERSAL"
      : "BEARISH PRZ REVERSAL";

    const cdMove = Math.abs(dVal - cPrice);
    const t1Val =
      bestMatch?.target_1 ||
      (isBullish ? dVal + cdMove * 0.382 : dVal - cdMove * 0.382);
    const t2Val =
      bestMatch?.target_2 ||
      (isBullish ? dVal + cdMove * 0.618 : dVal - cdMove * 0.618);
    const t3Val =
      bestMatch?.target_3 ||
      (isBullish ? dVal + cdMove * 1.0 : dVal - cdMove * 1.0);
    const slVal =
      bestMatch?.stop_loss ||
      (isBullish ? dVal - cdMove * 0.15 : dVal + cdMove * 0.15);

    const t1Pts = bestMatch?.t1_reward_points || Math.abs(t1Val - dVal);
    const t1Pct =
      bestMatch?.t1_reward_pct || (dVal > 0 ? (t1Pts / dVal) * 100 : 0);

    const t2Pts = bestMatch?.t2_reward_points || Math.abs(t2Val - dVal);
    const t2Pct =
      bestMatch?.t2_reward_pct || (dVal > 0 ? (t2Pts / dVal) * 100 : 0);

    const slPts = bestMatch?.sl_risk_points || Math.abs(dVal - slVal);
    const slPct =
      bestMatch?.sl_risk_pct || (dVal > 0 ? (slPts / dVal) * 100 : 0);

    const rrRatio =
      bestMatch?.live_rr_ratio ||
      (slPts > 0 ? (t1Pts / slPts).toFixed(2) : "2.0");

    const immSupp = bestMatch?.immediate_support;
    const immRes = bestMatch?.immediate_resistance;

    return {
      reversalAction,
      reversalDirectionBadge,
      t1Val,
      t2Val,
      t3Val,
      slVal,
      t1Pts,
      t1Pct,
      t2Pts,
      t2Pct,
      slPts,
      slPct,
      rrRatio,
      immSupp,
      immRes,
      dVal,
    };
  }, [bestMatch, dPrice, cPrice]);

  const linePathD = useMemo(() => {
    if (!displayCandles.length) return "";
    return displayCandles
      .map((c, i) => `${i === 0 ? "M" : "L"} ${getCandleX(i)} ${calcY(c.close)}`)
      .join(" ");
  }, [displayCandles, priceRange]);

  const priceTicks = useMemo(() => {
    if (priceRange <= 0) return [];
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      ticks.push(minPrice + (priceRange * i) / count);
    }
    return ticks;
  }, [minPrice, priceRange]);

  const activeCandle1 =
    hoveredIndex1 !== null && displayCandles[hoveredIndex1]
      ? displayCandles[hoveredIndex1]
      : displayCandles[displayCandles.length - 1];

  const activeCandle2 =
    hoveredIndex2 !== null && displayCandles[hoveredIndex2]
      ? displayCandles[hoveredIndex2]
      : displayCandles[displayCandles.length - 1];

  return (
    <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden my-3">
      {/* Top Main Toolbar */}
      <div className="card-header bg-dark text-white p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <span className="fs-5">🕯️</span>
          <div>
            <h6 className="fw-bold mb-0 text-white">
              Harmonic Wave Candlestick Overlay • {symbol} ({timeframe})
            </h6>
            <span
              className="small text-white text-opacity-75"
              style={{ fontSize: "11px" }}
            >
              Dual-Stage Price Action • Candlestick & Pattern Confluence •{" "}
              {displayCandles.length} Candles
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Dual vs Tab View Switcher */}
          <div className="btn-group btn-group-sm p-1 bg-white bg-opacity-10 rounded-3">
            <button
              type="button"
              className={`btn btn-sm ${
                displayMode === "dual"
                  ? "btn-primary shadow-sm fw-bold"
                  : "btn-link text-white text-decoration-none"
              }`}
              onClick={() => setDisplayMode("dual")}
            >
              ⚡ Dual Split View
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                displayMode === "forming"
                  ? "btn-warning text-dark shadow-sm fw-bold"
                  : "btn-link text-white text-decoration-none"
              }`}
              onClick={() => setDisplayMode("forming")}
            >
              🟡 Stage 1: Forming
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                displayMode === "reversal"
                  ? "btn-success shadow-sm fw-bold"
                  : "btn-link text-white text-decoration-none"
              }`}
              onClick={() => setDisplayMode("reversal")}
            >
              🎯 Stage 2: Targets
            </button>
          </div>

          {/* Candle vs Line Chart Type Switcher */}
          <div className="btn-group btn-group-sm p-1 bg-white bg-opacity-10 rounded-3">
            <button
              type="button"
              className={`btn btn-sm ${
                chartType === "candle"
                  ? "btn-light shadow-sm fw-bold text-dark"
                  : "btn-link text-white text-decoration-none"
              }`}
              onClick={() => setChartType("candle")}
            >
              🕯️ Candles
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                chartType === "line"
                  ? "btn-light shadow-sm fw-bold text-dark"
                  : "btn-link text-white text-decoration-none"
              }`}
              onClick={() => setChartType("line")}
            >
              📈 Line
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 bg-light bg-opacity-50">
        <div className="row g-3">
          {/* ========================================================================= */}
          {/* STAGE 1 CANDLESTICK OVERLAY: ACTIVE FORMING WAVE (C -> D PRZ EXPANSION)   */}
          {/* ========================================================================= */}
          {(displayMode === "dual" || displayMode === "forming") && (
            <div className={displayMode === "dual" ? "col-12 col-xl-6" : "col-12"}>
              <div className="card h-100 border rounded-4 bg-white shadow-sm overflow-hidden">
                {/* Sub-Card Header */}
                <div className="card-header bg-white py-2 px-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle fw-bold">
                      🟡 Stage 1: Active Forming Phase (C → D)
                    </span>
                    <span className="badge bg-light text-dark border font-monospace small">
                      {formingData.progressPct}% to PRZ D
                    </span>
                  </div>

                  {activeCandle1 && (
                    <div
                      className="d-none d-sm-flex align-items-center gap-2 font-monospace small text-muted"
                      style={{ fontSize: "10.5px" }}
                    >
                      <span>O: ₹{activeCandle1.open.toFixed(1)}</span>
                      <span>H: ₹{activeCandle1.high.toFixed(1)}</span>
                      <span>L: ₹{activeCandle1.low.toFixed(1)}</span>
                      <span
                        className={
                          activeCandle1.close >= activeCandle1.open
                            ? "text-success fw-bold"
                            : "text-danger fw-bold"
                        }
                      >
                        C: ₹{activeCandle1.close.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* SVG Candlestick Viewport */}
                <div
                  className="p-2 position-relative overflow-x-auto"
                  style={{ scrollbarWidth: "thin" }}
                >
                  <svg
                    viewBox={`0 0 ${svgWidth} ${chartHeight}`}
                    className="w-100"
                    style={{ minWidth: "480px", maxHeight: "270px" }}
                    onMouseLeave={() => setHoveredIndex1(null)}
                  >
                    <defs>
                      <linearGradient id="lineGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {/* Price Ticks */}
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
                            fontSize="9"
                            fill="#6c757d"
                            fontFamily="monospace"
                          >
                            ₹{p.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Forming Target Lines: T1, T2 (PRZ D), SL */}
                    {formingData && (
                      <>
                        {/* Forming T1 Line (50% Midway) */}
                        <line
                          x1={paddingLeft}
                          y1={calcY(formingData.formingT1)}
                          x2={svgWidth - paddingRight}
                          y2={calcY(formingData.formingT1)}
                          stroke="#fd7e14"
                          strokeDasharray="3,3"
                          strokeWidth="1.2"
                          opacity="0.8"
                        />
                        <text
                          x={svgWidth - paddingRight + 4}
                          y={calcY(formingData.formingT1) + 3}
                          fontSize="8.5"
                          fontWeight="bold"
                          fill="#fd7e14"
                        >
                          T1 ₹{formingData.formingT1.toFixed(1)}
                        </text>

                        {/* Forming T2 Line (Point D PRZ) */}
                        <line
                          x1={paddingLeft}
                          y1={calcY(formingData.formingT2)}
                          x2={svgWidth - paddingRight}
                          y2={calcY(formingData.formingT2)}
                          stroke={harmonicPoints?.isBullish ? "#198754" : "#dc3545"}
                          strokeDasharray="3,3"
                          strokeWidth="1.4"
                          opacity="0.85"
                        />
                        <text
                          x={svgWidth - paddingRight + 4}
                          y={calcY(formingData.formingT2) + 3}
                          fontSize="8.5"
                          fontWeight="bold"
                          fill={harmonicPoints?.isBullish ? "#198754" : "#dc3545"}
                        >
                          PRZ D ₹{formingData.formingT2.toFixed(1)}
                        </text>

                        {/* Forming SL Line (Point C Invalidation) */}
                        <line
                          x1={paddingLeft}
                          y1={calcY(formingData.formingSL)}
                          x2={svgWidth - paddingRight}
                          y2={calcY(formingData.formingSL)}
                          stroke="#dc3545"
                          strokeDasharray="2,2"
                          strokeWidth="1.2"
                          opacity="0.75"
                        />
                        <text
                          x={svgWidth - paddingRight + 4}
                          y={calcY(formingData.formingSL) + 3}
                          fontSize="8.5"
                          fontWeight="bold"
                          fill="#dc3545"
                        >
                          SL ₹{formingData.formingSL.toFixed(1)}
                        </text>
                      </>
                    )}

                    {/* Harmonic Forming Wings Overlay */}
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

                        {/* Polyline X -> A -> B -> C */}
                        <polyline
                          fill="none"
                          stroke="#0d6efd"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={`${harmonicPoints.ptX.x},${harmonicPoints.ptX.y} ${harmonicPoints.ptA.x},${harmonicPoints.ptA.y} ${harmonicPoints.ptB.x},${harmonicPoints.ptB.y} ${harmonicPoints.ptC.x},${harmonicPoints.ptC.y}`}
                        />

                        {/* Active C -> CMP Leg */}
                        <line
                          x1={harmonicPoints.ptC.x}
                          y1={harmonicPoints.ptC.y}
                          x2={harmonicPoints.ptCmp.x}
                          y2={harmonicPoints.ptCmp.y}
                          stroke="#ffc107"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />

                        {/* Projected CMP -> D Dashed Ray */}
                        <line
                          x1={harmonicPoints.ptCmp.x}
                          y1={harmonicPoints.ptCmp.y}
                          x2={harmonicPoints.ptD.x}
                          y2={harmonicPoints.ptD.y}
                          stroke={harmonicPoints.isBullish ? "#198754" : "#dc3545"}
                          strokeWidth="2.2"
                          strokeDasharray="5,3"
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {/* Line Chart Mode */}
                    {chartType === "line" && (
                      <>
                        <path
                          d={`${linePathD} L ${getCandleX(
                            displayCandles.length - 1
                          )} ${calcY(minPrice)} L ${getCandleX(0)} ${calcY(
                            minPrice
                          )} Z`}
                          fill="url(#lineGrad1)"
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

                    {/* Candlestick Chart Mode */}
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
                        const isHovered = hoveredIndex1 === idx;

                        return (
                          <g
                            key={idx}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIndex1(idx)}
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

                    {/* Nodes X, A, B, C & D */}
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
                              r="5"
                              fill="#0d6efd"
                              stroke="#ffffff"
                              strokeWidth="2"
                            />
                            <text
                              x={pt.x}
                              y={pt.y - 8}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="bold"
                              fill="#0d6efd"
                            >
                              {pt.label}
                            </text>
                          </g>
                        ))}

                        {/* Point D PRZ Target Node */}
                        <circle
                          cx={harmonicPoints.ptD.x}
                          cy={harmonicPoints.ptD.y}
                          r="6.5"
                          fill={harmonicPoints.isBullish ? "#198754" : "#dc3545"}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={harmonicPoints.ptD.x}
                          y={harmonicPoints.ptD.y - 10}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="bold"
                          fill={harmonicPoints.isBullish ? "#198754" : "#dc3545"}
                        >
                          D (PRZ)
                        </text>

                        {/* 🟡 Live Current LTP Marker */}
                        {cmpPrice > 0 && harmonicPoints.ptCmp && (
                          <g
                            transform={`translate(${harmonicPoints.ptCmp.x}, ${harmonicPoints.ptCmp.y})`}
                          >
                            <circle r="9" fill="rgba(255, 193, 7, 0.35)">
                              <animate
                                attributeName="r"
                                values="5;12;5"
                                dur="1.8s"
                                repeatCount="indefinite"
                              />
                            </circle>
                            <circle
                              r="4.5"
                              fill="#ffc107"
                              stroke="#ffffff"
                              strokeWidth="2"
                            />
                          </g>
                        )}
                      </>
                    )}

                    {/* Hover Crosshair */}
                    {hoveredIndex1 !== null && (
                      <line
                        x1={getCandleX(hoveredIndex1)}
                        y1={paddingTop}
                        x2={getCandleX(hoveredIndex1)}
                        y2={chartHeight - paddingBottom}
                        stroke="#6c757d"
                        strokeDasharray="2,2"
                        strokeWidth="1"
                      />
                    )}
                  </svg>
                </div>

                {/* Sub-Card Footer: Forming Stage Metrics */}
                <div className="card-footer bg-white border-top p-2.5">
                  <div className="d-flex justify-content-between align-items-center small mb-1">
                    <span className="text-secondary" style={{ fontSize: "10.5px" }}>
                      Trajectory to PRZ D:
                    </span>
                    <span
                      className="fw-bold font-monospace text-dark"
                      style={{ fontSize: "10.5px" }}
                    >
                      {formingData.ptsToD.toFixed(1)} pts ({formingData.progressPct}% done)
                    </span>
                  </div>
                  <div className="progress mb-2" style={{ height: "4px" }}>
                    <div
                      className="progress-bar bg-warning progress-bar-striped progress-bar-animated"
                      role="progressbar"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, formingData.progressPct)
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="row g-1 text-center" style={{ fontSize: "10px" }}>
                    <div className="col-4">
                      <div className="p-1 bg-light rounded border">
                        <span className="text-warning-emphasis fw-bold d-block">
                          T1 (50%)
                        </span>
                        <span className="font-monospace fw-bold text-dark">
                          ₹{formingData.formingT1.toFixed(1)}
                        </span>
                        <span className="text-success small d-block font-monospace">
                          +{formingData.formingT1Pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1 bg-light rounded border">
                        <span className="text-primary fw-bold d-block">
                          T2 (PRZ D)
                        </span>
                        <span className="font-monospace fw-bold text-dark">
                          ₹{formingData.formingT2.toFixed(1)}
                        </span>
                        <span className="text-success small d-block font-monospace">
                          +{formingData.formingT2Pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1 bg-light rounded border">
                        <span className="text-danger fw-bold d-block">SL (C)</span>
                        <span className="font-monospace fw-bold text-dark">
                          ₹{formingData.formingSL.toFixed(1)}
                        </span>
                        <span className="text-danger small d-block font-monospace">
                          -{formingData.formingSlPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 2 CANDLESTICK OVERLAY: COMPLETED PATTERN & REVERSAL TARGET ROADMAP   */}
          {/* ========================================================================= */}
          {(displayMode === "dual" || displayMode === "reversal") && (
            <div className={displayMode === "dual" ? "col-12 col-xl-6" : "col-12"}>
              <div className="card h-100 border rounded-4 bg-white shadow-sm overflow-hidden">
                {/* Sub-Card Header */}
                <div className="card-header bg-white py-2 px-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-success-subtle text-success border border-success-subtle fw-bold">
                      🎯 Stage 2: Target Roadmap & Reversal
                    </span>
                    <span className="badge bg-light text-dark border font-monospace small">
                      R:R 1 : {reversalData.rrRatio}
                    </span>
                  </div>

                  {activeCandle2 && (
                    <div
                      className="d-none d-sm-flex align-items-center gap-2 font-monospace small text-muted"
                      style={{ fontSize: "10.5px" }}
                    >
                      <span>O: ₹{activeCandle2.open.toFixed(1)}</span>
                      <span>H: ₹{activeCandle2.high.toFixed(1)}</span>
                      <span>L: ₹{activeCandle2.low.toFixed(1)}</span>
                      <span
                        className={
                          activeCandle2.close >= activeCandle2.open
                            ? "text-success fw-bold"
                            : "text-danger fw-bold"
                        }
                      >
                        C: ₹{activeCandle2.close.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* SVG Candlestick Viewport */}
                <div
                  className="p-2 position-relative overflow-x-auto"
                  style={{ scrollbarWidth: "thin" }}
                >
                  <svg
                    viewBox={`0 0 ${svgWidth} ${chartHeight}`}
                    className="w-100"
                    style={{ minWidth: "480px", maxHeight: "270px" }}
                    onMouseLeave={() => setHoveredIndex2(null)}
                  >
                    <defs>
                      <linearGradient id="lineGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#198754" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#198754" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {/* Price Ticks */}
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
                            fontSize="9"
                            fill="#6c757d"
                            fontFamily="monospace"
                          >
                            ₹{p.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Reversal Target Lines: T1, T2, SL, S1, R1 */}
                    {reversalData && (
                      <>
                        {/* Target 1 Line (38.2%) */}
                        <line
                          x1={paddingLeft}
                          y1={calcY(reversalData.t1Val)}
                          x2={svgWidth - paddingRight}
                          y2={calcY(reversalData.t1Val)}
                          stroke="#0d6efd"
                          strokeDasharray="3,3"
                          strokeWidth="1.2"
                          opacity="0.85"
                        />
                        <text
                          x={svgWidth - paddingRight + 4}
                          y={calcY(reversalData.t1Val) + 3}
                          fontSize="8.5"
                          fontWeight="bold"
                          fill="#0d6efd"
                        >
                          T1 ₹{reversalData.t1Val.toFixed(1)}
                        </text>

                        {/* Target 2 Line (61.8%) */}
                        <line
                          x1={paddingLeft}
                          y1={calcY(reversalData.t2Val)}
                          x2={svgWidth - paddingRight}
                          y2={calcY(reversalData.t2Val)}
                          stroke="#0dcaf0"
                          strokeDasharray="3,3"
                          strokeWidth="1.2"
                          opacity="0.85"
                        />
                        <text
                          x={svgWidth - paddingRight + 4}
                          y={calcY(reversalData.t2Val) + 3}
                          fontSize="8.5"
                          fontWeight="bold"
                          fill="#0dcaf0"
                        >
                          T2 ₹{reversalData.t2Val.toFixed(1)}
                        </text>

                        {/* Stop Loss Line */}
                        <line
                          x1={paddingLeft}
                          y1={calcY(reversalData.slVal)}
                          x2={svgWidth - paddingRight}
                          y2={calcY(reversalData.slVal)}
                          stroke="#dc3545"
                          strokeDasharray="3,3"
                          strokeWidth="1.4"
                          opacity="0.9"
                        />
                        <text
                          x={svgWidth - paddingRight + 4}
                          y={calcY(reversalData.slVal) + 3}
                          fontSize="8.5"
                          fontWeight="bold"
                          fill="#dc3545"
                        >
                          SL ₹{reversalData.slVal.toFixed(1)}
                        </text>

                        {/* Immediate Resistance (R1) */}
                        {reversalData.immRes &&
                          reversalData.immRes !== reversalData.t1Val &&
                          reversalData.immRes !== reversalData.t2Val && (
                            <>
                              <line
                                x1={paddingLeft}
                                y1={calcY(reversalData.immRes)}
                                x2={svgWidth - paddingRight}
                                y2={calcY(reversalData.immRes)}
                                stroke="#fd7e14"
                                strokeDasharray="2,2"
                                strokeWidth="1.1"
                                opacity="0.75"
                              />
                              <text
                                x={svgWidth - paddingRight + 4}
                                y={calcY(reversalData.immRes) + 3}
                                fontSize="8"
                                fontWeight="bold"
                                fill="#fd7e14"
                              >
                                R1 ₹{reversalData.immRes.toFixed(1)}
                              </text>
                            </>
                          )}

                        {/* Immediate Support (S1) */}
                        {reversalData.immSupp &&
                          reversalData.immSupp !== reversalData.slVal && (
                            <>
                              <line
                                x1={paddingLeft}
                                y1={calcY(reversalData.immSupp)}
                                x2={svgWidth - paddingRight}
                                y2={calcY(reversalData.immSupp)}
                                stroke="#20c997"
                                strokeDasharray="2,2"
                                strokeWidth="1.1"
                                opacity="0.75"
                              />
                              <text
                                x={svgWidth - paddingRight + 4}
                                y={calcY(reversalData.immSupp) + 3}
                                fontSize="8"
                                fontWeight="bold"
                                fill="#20c997"
                              >
                                S1 ₹{reversalData.immSupp.toFixed(1)}
                              </text>
                            </>
                          )}
                      </>
                    )}

                    {/* Completed Harmonic Pattern Overlay & Reversal Projection */}
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

                        {/* Full Harmonic Polyline X -> A -> B -> C -> D */}
                        <polyline
                          fill="none"
                          stroke="#0d6efd"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={`${harmonicPoints.ptX.x},${harmonicPoints.ptX.y} ${harmonicPoints.ptA.x},${harmonicPoints.ptA.y} ${harmonicPoints.ptB.x},${harmonicPoints.ptB.y} ${harmonicPoints.ptC.x},${harmonicPoints.ptC.y} ${harmonicPoints.ptD.x},${harmonicPoints.ptD.y}`}
                        />

                        {/* Reversal Projection Rays: D -> T1 -> T2 */}
                        <line
                          x1={harmonicPoints.ptD.x}
                          y1={harmonicPoints.ptD.y}
                          x2={Math.min(
                            svgWidth - paddingRight - 10,
                            harmonicPoints.ptD.x + 35
                          )}
                          y2={calcY(reversalData.t1Val)}
                          stroke="#0d6efd"
                          strokeWidth="2.8"
                          strokeDasharray="4,3"
                          strokeLinecap="round"
                        />
                        <line
                          x1={Math.min(
                            svgWidth - paddingRight - 10,
                            harmonicPoints.ptD.x + 35
                          )}
                          y1={calcY(reversalData.t1Val)}
                          x2={Math.min(
                            svgWidth - paddingRight,
                            harmonicPoints.ptD.x + 65
                          )}
                          y2={calcY(reversalData.t2Val)}
                          stroke="#0dcaf0"
                          strokeWidth="2.8"
                          strokeDasharray="4,3"
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {/* Line Chart Mode */}
                    {chartType === "line" && (
                      <>
                        <path
                          d={`${linePathD} L ${getCandleX(
                            displayCandles.length - 1
                          )} ${calcY(minPrice)} L ${getCandleX(0)} ${calcY(
                            minPrice
                          )} Z`}
                          fill="url(#lineGrad2)"
                        />
                        <path
                          d={linePathD}
                          fill="none"
                          stroke="#198754"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {/* Candlestick Chart Mode */}
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
                        const isHovered = hoveredIndex2 === idx;

                        return (
                          <g
                            key={idx}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIndex2(idx)}
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

                    {/* Nodes X, A, B, C & Point D Entry */}
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
                              r="4.5"
                              fill="#0d6efd"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                            <text
                              x={pt.x}
                              y={pt.y - 8}
                              textAnchor="middle"
                              fontSize="8.5"
                              fontWeight="bold"
                              fill="#0d6efd"
                            >
                              {pt.label}
                            </text>
                          </g>
                        ))}

                        {/* Point D Entry Node */}
                        <circle
                          cx={harmonicPoints.ptD.x}
                          cy={harmonicPoints.ptD.y}
                          r="6"
                          fill="#ffc107"
                          stroke="#000000"
                          strokeWidth="1.5"
                        />
                        <text
                          x={harmonicPoints.ptD.x}
                          y={harmonicPoints.ptD.y - 10}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill="#000000"
                        >
                          D (Entry)
                        </text>
                      </>
                    )}

                    {/* Hover Crosshair */}
                    {hoveredIndex2 !== null && (
                      <line
                        x1={getCandleX(hoveredIndex2)}
                        y1={paddingTop}
                        x2={getCandleX(hoveredIndex2)}
                        y2={chartHeight - paddingBottom}
                        stroke="#6c757d"
                        strokeDasharray="2,2"
                        strokeWidth="1"
                      />
                    )}
                  </svg>
                </div>

                {/* Sub-Card Footer: Reversal Targets Metrics */}
                <div className="card-footer bg-white border-top p-2.5">
                  <div className="d-flex justify-content-between align-items-center small mb-1">
                    <span className="text-secondary" style={{ fontSize: "10.5px" }}>
                      Reversal Risk / Reward:
                    </span>
                    <span
                      className="badge bg-success font-monospace"
                      style={{ fontSize: "10px" }}
                    >
                      1 : {reversalData.rrRatio} (Breakeven at T1)
                    </span>
                  </div>

                  <div className="row g-1 text-center" style={{ fontSize: "10px" }}>
                    <div className="col-4">
                      <div className="p-1 bg-light rounded border">
                        <span className="text-primary fw-bold d-block">
                          T1 (38.2%)
                        </span>
                        <span className="font-monospace fw-bold text-dark">
                          ₹{reversalData.t1Val.toFixed(1)}
                        </span>
                        <span className="text-success small d-block font-monospace">
                          +{reversalData.t1Pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1 bg-light rounded border">
                        <span className="text-info fw-bold d-block">
                          T2 (61.8%)
                        </span>
                        <span className="font-monospace fw-bold text-dark">
                          ₹{reversalData.t2Val.toFixed(1)}
                        </span>
                        <span className="text-success small d-block font-monospace">
                          +{reversalData.t2Pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1 bg-light rounded border">
                        <span className="text-danger fw-bold d-block">Reversal SL</span>
                        <span className="font-monospace fw-bold text-dark">
                          ₹{reversalData.slVal.toFixed(1)}
                        </span>
                        <span className="text-danger small d-block font-monospace">
                          -{reversalData.slPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Bottom Legend Bar */}
      <div className="card-footer bg-light py-2 px-3 d-flex flex-wrap justify-content-between align-items-center small text-secondary">
        <div
          className="d-flex align-items-center gap-3 flex-wrap"
          style={{ fontSize: "11px" }}
        >
          <span className="d-flex align-items-center gap-1">
            <span
              className="badge bg-success p-1 rounded-circle"
              style={{ width: "7px", height: "7px" }}
            />
            Bullish
          </span>
          <span className="d-flex align-items-center gap-1">
            <span
              className="badge bg-danger p-1 rounded-circle"
              style={{ width: "7px", height: "7px" }}
            />
            Bearish
          </span>
          <span className="d-flex align-items-center gap-1 fw-bold text-dark">
            <span
              className="badge bg-warning p-1 rounded-circle"
              style={{ width: "7px", height: "7px" }}
            />
            🟡 Live LTP / CMP
          </span>
          <span className="d-flex align-items-center gap-1 text-primary">
            <span
              className="badge bg-primary p-1 rounded-circle"
              style={{ width: "7px", height: "7px" }}
            />
            Harmonic Geometry
          </span>
          <span className="d-flex align-items-center gap-1 text-info">
            <span
              className="badge bg-info p-1 rounded-circle"
              style={{ width: "7px", height: "7px" }}
            />
            Profit Targets (T1 / T2)
          </span>
          <span className="d-flex align-items-center gap-1 text-danger">
            <span
              className="badge bg-danger p-1 rounded-circle"
              style={{ width: "7px", height: "7px" }}
            />
            Stop Loss (SL)
          </span>
          <span className="d-flex align-items-center gap-1" style={{ color: "#20c997" }}>
            <span
              className="badge p-1 rounded-circle"
              style={{ backgroundColor: "#20c997", width: "7px", height: "7px" }}
            />
            S₁ Support
          </span>
          <span className="d-flex align-items-center gap-1" style={{ color: "#fd7e14" }}>
            <span
              className="badge p-1 rounded-circle"
              style={{ backgroundColor: "#fd7e14", width: "7px", height: "7px" }}
            />
            R₁ Resistance
          </span>
        </div>

        <span
          className="font-monospace small text-muted"
          style={{ fontSize: "10px" }}
        >
          Hover candles for OHLC inspect • Switch views via top tabs
        </span>
      </div>
    </div>
  );
}

export default HarmonicCandleWaveChart;
