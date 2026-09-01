import {
  ClassicalPatternMatch,
  EngineCandle,
  HarmonicPatternMatch,
  PivotPoint
} from './types';
import { evaluateHarmonicPattern } from './harmonicRules';

/**
 * Extracts high/low swing pivot points using a rolling window
 */
export function findSwingPivots(candles: EngineCandle[], leftBars: number = 3, rightBars: number = 3): PivotPoint[] {
  if (!candles || candles.length < leftBars + rightBars + 1) return [];

  const rawPivots: PivotPoint[] = [];

  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= leftBars; j++) {
      if (candles[i - j].high >= currentHigh) isHigh = false;
      if (candles[i - j].low <= currentLow) isLow = false;
    }

    for (let j = 1; j <= rightBars; j++) {
      if (candles[i + j].high > currentHigh) isHigh = false;
      if (candles[i + j].low < currentLow) isLow = false;
    }

    if (isHigh) {
      rawPivots.push({ index: i, time: candles[i].time, price: currentHigh, type: 'high' });
    }
    if (isLow) {
      rawPivots.push({ index: i, time: candles[i].time, price: currentLow, type: 'low' });
    }
  }

  // Filter consecutive highs or lows to keep the most prominent extreme
  const pivots: PivotPoint[] = [];
  for (const p of rawPivots) {
    if (pivots.length === 0) {
      pivots.push(p);
      continue;
    }

    const last = pivots[pivots.length - 1];
    if (last.type === p.type) {
      if (p.type === 'high' && p.price > last.price) {
        pivots[pivots.length - 1] = p;
      } else if (p.type === 'low' && p.price < last.price) {
        pivots[pivots.length - 1] = p;
      }
    } else {
      pivots.push(p);
    }
  }

  return pivots;
}

/**
 * Scans candlestick series for all matching Harmonic Patterns automatically on the client
 */
export function detectHarmonicPatterns(candles: EngineCandle[], customPivots?: PivotPoint[]): HarmonicPatternMatch[] {
  if (!candles || candles.length < 20) return [];
  const currentPrice = candles[candles.length - 1].close;

  const matches: HarmonicPatternMatch[] = [];
  const seenIds = new Set<string>();

  // If custom pivots provided, scan that set; otherwise scan multi-depth pivot resolutions
  const pivotSets: PivotPoint[][] = customPivots
    ? [customPivots]
    : [
        findSwingPivots(candles, 3, 3),
        findSwingPivots(candles, 2, 2),
        findSwingPivots(candles, 4, 4),
        findSwingPivots(candles, 5, 5)
      ];

  for (const swingPivots of pivotSets) {
    if (swingPivots.length < 5) continue;

    // Check 5 consecutive alternating pivots (X, A, B, C, D)
    for (let i = 0; i <= swingPivots.length - 5; i++) {
      const pX = swingPivots[i];
      const pA = swingPivots[i + 1];
      const pB = swingPivots[i + 2];
      const pC = swingPivots[i + 3];
      const pD = swingPivots[i + 4];

      // Check alternating high-low structure
      const isAlternating =
        (pX.type !== pA.type) &&
        (pA.type !== pB.type) &&
        (pB.type !== pC.type) &&
        (pC.type !== pD.type);

      if (!isAlternating) continue;

      const points = {
        X: { label: 'X' as const, index: pX.index, time: pX.time, price: pX.price },
        A: { label: 'A' as const, index: pA.index, time: pA.time, price: pA.price },
        B: { label: 'B' as const, index: pB.index, time: pB.time, price: pB.price },
        C: { label: 'C' as const, index: pC.index, time: pC.time, price: pC.price },
        D: { label: 'D' as const, index: pD.index, time: pD.time, price: pD.price },
        O: i > 0 ? { label: '0' as const, index: swingPivots[i - 1].index, time: swingPivots[i - 1].time, price: swingPivots[i - 1].price } : undefined
      };

      const pattern = evaluateHarmonicPattern(points, currentPrice);
      if (pattern) {
        // Unique signature based on pattern type and vertex D index
        const signature = `${pattern.patternType}-${pattern.orientation}-${pattern.points.D.index}-${pattern.points.X.index}`;
        if (!seenIds.has(signature)) {
          seenIds.add(signature);
          matches.push(pattern);
        }
      }
    }
  }

  // Sort by highest confidence score and closeness of point D to current candle
  return matches.sort((a, b) => {
    const recencyA = a.points.D.index / candles.length;
    const recencyB = b.points.D.index / candles.length;
    const scoreA = a.confidenceScore * 0.7 + recencyA * 30;
    const scoreB = b.confidenceScore * 0.7 + recencyB * 30;
    return scoreB - scoreA;
  });
}

/**
 * Scans candlestick series for Classical Patterns (Double Bottoms/Tops, Head & Shoulders, Triangles)
 */
export function detectClassicalPatterns(candles: EngineCandle[], pivots?: PivotPoint[]): ClassicalPatternMatch[] {
  if (!candles || candles.length < 25) return [];
  const currentPrice = candles[candles.length - 1].close;
  const swingPivots = pivots || findSwingPivots(candles, 3, 3);
  if (swingPivots.length < 4) return [];

  const patterns: ClassicalPatternMatch[] = [];
  const recentPivots = swingPivots.slice(-12);

  // 1. Double Bottom (Bullish Reversal) & Double Top (Bearish Reversal)
  for (let i = 0; i <= recentPivots.length - 4; i++) {
    const p1 = recentPivots[i];
    const p2 = recentPivots[i + 1];
    const p3 = recentPivots[i + 2];

    // Double Bottom: Low, High, Low
    if (p1.type === 'low' && p2.type === 'high' && p3.type === 'low') {
      const lowDiff = Math.abs(p1.price - p3.price) / p1.price;
      if (lowDiff < 0.025) { // Within 2.5% tolerance
        const neckline = p2.price;
        const patternHeight = neckline - Math.min(p1.price, p3.price);
        const target = neckline + patternHeight;
        const stopLoss = Math.min(p1.price, p3.price) * 0.995;
        const slDist = neckline - stopLoss;
        const rr = Number((patternHeight / (slDist || 1)).toFixed(2));

        patterns.push({
          id: `classic-db-${p1.time}-${p3.time}`,
          name: 'Double Bottom',
          category: 'Bullish Reversal',
          orientation: 'Bullish',
          action: 'BUY',
          breakoutPrice: Number(neckline.toFixed(4)),
          stopLossPrice: Number(stopLoss.toFixed(4)),
          targetPrice: Number(target.toFixed(4)),
          confidenceScore: 88,
          status: currentPrice >= neckline ? 'Breakout' : 'Forming',
          keyPoints: [
            { time: p1.time, price: p1.price, label: 'Bottom 1', index: p1.index },
            { time: p2.time, price: p2.price, label: 'Neckline', index: p2.index },
            { time: p3.time, price: p3.price, label: 'Bottom 2', index: p3.index }
          ],
          trendlines: [
            { x1Time: p1.time, y1Price: neckline, x2Time: candles[candles.length - 1].time, y2Price: neckline, label: 'Neckline Resistance' }
          ],
          riskRewardRatio: rr,
          ruleDescription: 'Bullish Reversal: Buy on breakout above Neckline. Stop Loss below lowest trough, Target = Height projected from Neckline.'
        });
      }
    }

    // Double Top: High, Low, High
    if (p1.type === 'high' && p2.type === 'low' && p3.type === 'high') {
      const highDiff = Math.abs(p1.price - p3.price) / p1.price;
      if (highDiff < 0.025) {
        const neckline = p2.price;
        const patternHeight = Math.max(p1.price, p3.price) - neckline;
        const target = neckline - patternHeight;
        const stopLoss = Math.max(p1.price, p3.price) * 1.005;
        const slDist = stopLoss - neckline;
        const rr = Number((patternHeight / (slDist || 1)).toFixed(2));

        patterns.push({
          id: `classic-dt-${p1.time}-${p3.time}`,
          name: 'Double Top',
          category: 'Bearish Reversal',
          orientation: 'Bearish',
          action: 'SELL',
          breakoutPrice: Number(neckline.toFixed(4)),
          stopLossPrice: Number(stopLoss.toFixed(4)),
          targetPrice: Number(target.toFixed(4)),
          confidenceScore: 87,
          status: currentPrice <= neckline ? 'Breakout' : 'Forming',
          keyPoints: [
            { time: p1.time, price: p1.price, label: 'Top 1', index: p1.index },
            { time: p2.time, price: p2.price, label: 'Neckline', index: p2.index },
            { time: p3.time, price: p3.price, label: 'Top 2', index: p3.index }
          ],
          trendlines: [
            { x1Time: p1.time, y1Price: neckline, x2Time: candles[candles.length - 1].time, y2Price: neckline, label: 'Neckline Support' }
          ],
          riskRewardRatio: rr,
          ruleDescription: 'Bearish Reversal: Sell on breakdown below Neckline. Stop Loss above highest peak, Target = Height projected downward.'
        });
      }
    }
  }

  // 2. Head and Shoulders / Inverted Head and Shoulders
  for (let i = 0; i <= recentPivots.length - 5; i++) {
    const p1 = recentPivots[i];
    const p2 = recentPivots[i + 1];
    const p3 = recentPivots[i + 2];
    const p4 = recentPivots[i + 3];
    const p5 = recentPivots[i + 4];

    // Standard Head & Shoulders: High, Low, Higher High (Head), Low, Lower High
    if (p1.type === 'high' && p2.type === 'low' && p3.type === 'high' && p4.type === 'low' && p5.type === 'high') {
      if (p3.price > p1.price && p3.price > p5.price && Math.abs(p1.price - p5.price) / p1.price < 0.05) {
        const neckline = (p2.price + p4.price) / 2;
        const patternHeight = p3.price - neckline;
        const target = neckline - patternHeight;
        const stopLoss = p5.price * 1.005;
        const rr = Number((patternHeight / (stopLoss - neckline || 1)).toFixed(2));

        patterns.push({
          id: `classic-hs-${p1.time}-${p5.time}`,
          name: 'Head & Shoulders',
          category: 'Bearish Reversal',
          orientation: 'Bearish',
          action: 'SELL',
          breakoutPrice: Number(neckline.toFixed(4)),
          stopLossPrice: Number(stopLoss.toFixed(4)),
          targetPrice: Number(target.toFixed(4)),
          confidenceScore: 92,
          status: currentPrice <= neckline ? 'Breakout' : 'Forming',
          keyPoints: [
            { time: p1.time, price: p1.price, label: 'Left Shoulder', index: p1.index },
            { time: p3.time, price: p3.price, label: 'Head', index: p3.index },
            { time: p5.time, price: p5.price, label: 'Right Shoulder', index: p5.index }
          ],
          trendlines: [
            { x1Time: p2.time, y1Price: p2.price, x2Time: p4.time, y2Price: p4.price, label: 'Neckline' }
          ],
          riskRewardRatio: rr,
          ruleDescription: 'Classic Bearish Reversal: Sell on Neckline break. Target equals Head-to-Neckline height projected down.'
        });
      }
    }

    // Inverted Head & Shoulders
    if (p1.type === 'low' && p2.type === 'high' && p3.type === 'low' && p4.type === 'high' && p5.type === 'low') {
      if (p3.price < p1.price && p3.price < p5.price && Math.abs(p1.price - p5.price) / p1.price < 0.05) {
        const neckline = (p2.price + p4.price) / 2;
        const patternHeight = neckline - p3.price;
        const target = neckline + patternHeight;
        const stopLoss = p5.price * 0.995;
        const rr = Number((patternHeight / (neckline - stopLoss || 1)).toFixed(2));

        patterns.push({
          id: `classic-ihs-${p1.time}-${p5.time}`,
          name: 'Inverted Head & Shoulders',
          category: 'Bullish Reversal',
          orientation: 'Bullish',
          action: 'BUY',
          breakoutPrice: Number(neckline.toFixed(4)),
          stopLossPrice: Number(stopLoss.toFixed(4)),
          targetPrice: Number(target.toFixed(4)),
          confidenceScore: 93,
          status: currentPrice >= neckline ? 'Breakout' : 'Forming',
          keyPoints: [
            { time: p1.time, price: p1.price, label: 'Left Shoulder', index: p1.index },
            { time: p3.time, price: p3.price, label: 'Inverted Head', index: p3.index },
            { time: p5.time, price: p5.price, label: 'Right Shoulder', index: p5.index }
          ],
          trendlines: [
            { x1Time: p2.time, y1Price: p2.price, x2Time: p4.time, y2Price: p4.price, label: 'Neckline' }
          ],
          riskRewardRatio: rr,
          ruleDescription: 'Bullish Reversal: Buy on breakout above Neckline. Stop Loss below Right Shoulder.'
        });
      }
    }
  }

  // 3. Ascending Triangle & Descending Triangle
  const highs = recentPivots.filter(p => p.type === 'high');
  const lows = recentPivots.filter(p => p.type === 'low');

  if (highs.length >= 2 && lows.length >= 2) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];

    // Ascending Triangle: Flat highs, higher lows
    const isFlatHigh = Math.abs(h1.price - h2.price) / h1.price < 0.015;
    const isHigherLow = l2.price > l1.price;

    if (isFlatHigh && isHigherLow) {
      const resistance = Math.max(h1.price, h2.price);
      const height = resistance - l1.price;
      const target = resistance + height;
      const stopLoss = l2.price * 0.996;
      const rr = Number((height / (resistance - stopLoss || 1)).toFixed(2));

      patterns.push({
        id: `classic-at-${h1.time}-${h2.time}`,
        name: 'Ascending Triangle',
        category: 'Bullish Continuation',
        orientation: 'Bullish',
        action: 'BUY',
        breakoutPrice: Number(resistance.toFixed(4)),
        stopLossPrice: Number(stopLoss.toFixed(4)),
        targetPrice: Number(target.toFixed(4)),
        confidenceScore: 89,
        status: currentPrice >= resistance ? 'Breakout' : 'Forming',
        keyPoints: [
          { time: h1.time, price: h1.price, label: 'Resistance 1', index: h1.index },
          { time: h2.time, price: h2.price, label: 'Resistance 2', index: h2.index },
          { time: l1.time, price: l1.price, label: 'Support 1', index: l1.index },
          { time: l2.time, price: l2.price, label: 'Support 2', index: l2.index }
        ],
        trendlines: [
          { x1Time: h1.time, y1Price: resistance, x2Time: candles[candles.length - 1].time, y2Price: resistance, label: 'Flat Resistance' },
          { x1Time: l1.time, y1Price: l1.price, x2Time: l2.time, y2Price: l2.price, label: 'Ascending Trendline' }
        ],
        riskRewardRatio: rr,
        ruleDescription: 'Bullish Continuation: Buy upon upside breakout above horizontal ceiling. Stop Loss below higher low.'
      });
    }

    // Descending Triangle: Flat lows, lower highs
    const isFlatLow = Math.abs(l1.price - l2.price) / l1.price < 0.015;
    const isLowerHigh = h2.price < h1.price;

    if (isFlatLow && isLowerHigh) {
      const support = Math.min(l1.price, l2.price);
      const height = h1.price - support;
      const target = support - height;
      const stopLoss = h2.price * 1.004;
      const rr = Number((height / (stopLoss - support || 1)).toFixed(2));

      patterns.push({
        id: `classic-dtri-${l1.time}-${l2.time}`,
        name: 'Descending Triangle',
        category: 'Bearish Continuation',
        orientation: 'Bearish',
        action: 'SELL',
        breakoutPrice: Number(support.toFixed(4)),
        stopLossPrice: Number(stopLoss.toFixed(4)),
        targetPrice: Number(target.toFixed(4)),
        confidenceScore: 88,
        status: currentPrice <= support ? 'Breakout' : 'Forming',
        keyPoints: [
          { time: l1.time, price: l1.price, label: 'Support 1', index: l1.index },
          { time: l2.time, price: l2.price, label: 'Support 2', index: l2.index },
          { time: h1.time, price: h1.price, label: 'Lower High 1', index: h1.index },
          { time: h2.time, price: h2.price, label: 'Lower High 2', index: h2.index }
        ],
        trendlines: [
          { x1Time: l1.time, y1Price: support, x2Time: candles[candles.length - 1].time, y2Price: support, label: 'Flat Support' },
          { x1Time: h1.time, y1Price: h1.price, x2Time: h2.time, y2Price: h2.price, label: 'Descending Resistance' }
        ],
        riskRewardRatio: rr,
        ruleDescription: 'Bearish Continuation: Short upon breakdown below flat support floor. Stop Loss above lower high.'
      });
    }
  }

  return patterns;
}
