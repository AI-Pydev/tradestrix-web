"use client";

import { useEffect, useMemo, useRef } from "react";

import type {
  UpstoxBacktestChartCandle,
  UpstoxOptionChainBacktestTrade,
} from "@/lib/api";

function toMs(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function fmt(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

/** Index of the candle whose timestamp is the closest match for an event time. */
function nearestIndex(candleMs: number[], targetMs: number): number {
  if (!candleMs.length) return -1;
  let lo = 0;
  let hi = candleMs.length - 1;
  if (targetMs <= candleMs[0]) return 0;
  if (targetMs >= candleMs[hi]) return hi;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (candleMs[mid] === targetMs) return mid;
    if (candleMs[mid] < targetMs) lo = mid + 1;
    else hi = mid - 1;
  }
  // lo is first index > target; pick the closer of lo / lo-1.
  const prev = Math.max(0, lo - 1);
  return Math.abs(candleMs[lo] - targetMs) < Math.abs(candleMs[prev] - targetMs) ? lo : prev;
}

type Props = {
  candles: UpstoxBacktestChartCandle[];
  trades: UpstoxOptionChainBacktestTrade[];
  focusTime?: string | null;
  instrumentName: string;
  modeLabel: string;
};

export function BacktestTradeChart({
  candles,
  trades,
  focusTime,
  instrumentName,
  modeLabel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const step = 14;
  const bodyWidth = 7;
  const topPadding = 24;
  const bottomPadding = 40;
  const height = 460;
  const plotHeight = height - topPadding - bottomPadding;

  const candleMs = useMemo(() => candles.map((c) => toMs(c.close_time)), [candles]);

  const { minLow, range } = useMemo(() => {
    if (!candles.length) return { minLow: 0, range: 1 };
    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    const lo = Math.min(...lows);
    const hi = Math.max(...highs);
    return { minLow: lo, range: Math.max(hi - lo, hi * 0.002, 1) };
  }, [candles]);

  const y = (price: number) => topPadding + ((minLow + range - price) / range) * plotHeight;
  const xCenter = (index: number) => index * step + step / 2;
  const width = Math.max(candles.length * step, 320);

  const markers = useMemo(() => {
    return trades
      .map((trade, tradeIndex) => {
        const entryIdx = nearestIndex(candleMs, toMs(trade.entry_time));
        const exitIdx = trade.exit_time ? nearestIndex(candleMs, toMs(trade.exit_time)) : -1;
        if (entryIdx < 0) return null;
        const win = (trade.pnl_amount ?? 0) >= 0;
        return { trade, tradeIndex, entryIdx, exitIdx, win };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [trades, candleMs]);

  const focusIdx = useMemo(() => {
    if (!focusTime) return -1;
    return nearestIndex(candleMs, toMs(focusTime));
  }, [focusTime, candleMs]);

  useEffect(() => {
    if (focusIdx < 0 || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollLeft = Math.max(0, xCenter(focusIdx) - el.clientWidth / 2);
    // xCenter is stable for a given step; intentionally only re-run on focus/data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIdx, candles.length]);

  if (!candles.length) {
    return (
      <div style={{ padding: 24, color: "#94a3b8" }}>
        No candles available for this window.
      </div>
    );
  }

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ color: "#e2e8f0" }}>{instrumentName}</strong>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>
          {modeLabel} · {candles.length} candles · ▲ entry / ▼ exit (green win, red loss)
        </span>
      </div>
      <div
        ref={scrollRef}
        style={{ overflowX: "auto", overflowY: "hidden", border: "1px solid #1e293b", borderRadius: 8, background: "#0b1220" }}
      >
        <svg width={width} height={height} style={{ display: "block" }}>
          {gridLevels.map((level) => {
            const gy = topPadding + plotHeight * level;
            const labelPrice = minLow + range * (1 - level);
            return (
              <g key={level}>
                <line x1={0} x2={width} y1={gy} y2={gy} stroke="#1e293b" strokeWidth={1} />
                <text x={6} y={gy - 3} fill="#475569" fontSize={10}>
                  {fmt(labelPrice)}
                </text>
              </g>
            );
          })}

          {candles.map((candle, index) => {
            const cx = xCenter(index);
            const up = candle.close >= candle.open;
            const color = up ? "#22c55e" : "#ef4444";
            const bodyTop = y(Math.max(candle.open, candle.close));
            const bodyBottom = y(Math.min(candle.open, candle.close));
            return (
              <g key={`${candle.close_time}-${index}`}>
                <line x1={cx} x2={cx} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth={1} />
                <rect
                  x={cx - bodyWidth / 2}
                  y={bodyTop}
                  width={bodyWidth}
                  height={Math.max(bodyBottom - bodyTop, 1.5)}
                  fill={color}
                />
              </g>
            );
          })}

          {markers.map(({ trade, tradeIndex, entryIdx, exitIdx, win }) => {
            const ex = xCenter(entryIdx);
            const ey = y(candles[entryIdx].low) + 14;
            const exitColor = win ? "#22c55e" : "#ef4444";
            const tip =
              `Entry ${trade.entry_time} @ ${fmt(trade.entry_underlying)}` +
              (trade.entry_reason ? `\n${trade.entry_reason}` : "") +
              (trade.exit_time
                ? `\nExit ${trade.exit_time} @ ${fmt(trade.exit_underlying ?? 0)} · ${trade.reason}` +
                  (trade.loss_reason ? `\n${trade.loss_reason}` : "") +
                  `\nPnL ${fmt(trade.pnl_amount)}`
                : "");
            const focused = entryIdx === focusIdx;
            return (
              <g key={`m-${tradeIndex}`}>
                <title>{tip}</title>
                {exitIdx >= 0 && (
                  <line
                    x1={ex}
                    y1={y(candles[entryIdx].close)}
                    x2={xCenter(exitIdx)}
                    y2={y(candles[exitIdx].close)}
                    stroke={exitColor}
                    strokeWidth={focused ? 1.6 : 0.8}
                    strokeDasharray="3 3"
                    opacity={0.7}
                  />
                )}
                {/* entry ▲ below the entry candle */}
                <polygon
                  points={`${ex},${ey - 9} ${ex - 6},${ey + 3} ${ex + 6},${ey + 3}`}
                  fill="#38bdf8"
                  stroke={focused ? "#e2e8f0" : "none"}
                  strokeWidth={focused ? 1.5 : 0}
                />
                {exitIdx >= 0 && (
                  <polygon
                    points={`${xCenter(exitIdx)},${y(candles[exitIdx].high) - 3 + 9} ${
                      xCenter(exitIdx) - 6
                    },${y(candles[exitIdx].high) - 3 - 3} ${xCenter(exitIdx) + 6},${
                      y(candles[exitIdx].high) - 3 - 3
                    }`}
                    fill={exitColor}
                    stroke={focused ? "#e2e8f0" : "none"}
                    strokeWidth={focused ? 1.5 : 0}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default BacktestTradeChart;
