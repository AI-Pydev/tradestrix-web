import {
    HarmonicPatternMatch,
    HarmonicPatternType,
    HarmonicPoint,
    PatternOrientation,
    RatioMeasurement,
    TakeProfitTarget
} from './types';

interface PatternRuleDef {
  name: HarmonicPatternType;
  description: string;
  pdfChapter: string;
  ab_xa: { min: number; max: number; ideal: number; formula: string };
  bc_ab?: { min: number; max: number; ideal: number; formula: string };
  cd_ab?: { min: number; max: number; ideal: number; formula: string };
  cd_xa?: { min: number; max: number; ideal: number; formula: string };
  cd_xc?: { min: number; max: number; ideal: number; formula: string };
  bc_0x?: { min: number; max: number; ideal: number; formula: string };
  cd_bc?: { min: number; max: number; ideal: number; formula: string };
  stopLossRule: string;
  tpRules: Array<{ name: string; description: string; ruleKey: string }>;
  trailingRule: string;
}

export const HARMONIC_RULES: Record<HarmonicPatternType, PatternRuleDef> = {
  Butterfly: {
    name: 'Butterfly',
    description: 'A 4-leg reversal pattern with a deep 78.6% B-point and PRZ extending beyond X to 1.272-1.618.',
    pdfChapter: 'Chapter 1: Butterfly Harmonic Pattern Strategy',
    ab_xa: { min: 0.72, max: 0.85, ideal: 0.786, formula: 'AB = 0.786 (78.6%) retracement of XA' },
    bc_ab: { min: 0.35, max: 0.92, ideal: 0.886, formula: 'BC = 38.2% – 88.6% of AB leg' },
    cd_ab: { min: 1.55, max: 2.70, ideal: 1.618, formula: 'CD = 1.618 – 2.618 extension of AB' },
    cd_xa: { min: 1.22, max: 1.68, ideal: 1.272, formula: 'CD = 1.272 – 1.618 extension of XA' },
    stopLossRule: 'Place protective Stop Loss below/above the 1.618 Fibonacci extension of XA leg.',
    tpRules: [
      { name: 'TP 1 (Point B)', description: 'Conservative partial target established at Point B swing resistance/support', ruleKey: 'pointB' },
      { name: 'TP 2 (0.618 CD)', description: '0.618 Fibonacci retracement of the CD swing leg (or retest of Point A)', ruleKey: 'fib618_cd' }
    ],
    trailingRule: 'Trail protective stop loss as price advances past Point B towards Point A.'
  },

  Cypher: {
    name: 'Cypher',
    description: 'High win-rate harmonic pattern with extended C-point (1.272-1.414 XA) and sharp 0.786 XC retracement entry at D.',
    pdfChapter: 'Chapter 2: Cypher Pattern Trading Strategy',
    ab_xa: { min: 0.35, max: 0.65, ideal: 0.382, formula: 'AB = 0.382 to 0.618 retracement of XA' },
    bc_ab: { min: 1.22, max: 1.48, ideal: 1.272, formula: 'BC = 1.272 to 1.414 extension of XA leg' },
    cd_xc: { min: 0.74, max: 0.82, ideal: 0.786, formula: 'CD = 0.786 (78.6%) retracement of XC leg' },
    stopLossRule: 'Place protective Stop Loss safely below/above Wave X swing extreme.',
    tpRules: [
      { name: 'TP 1 (Point A)', description: 'Target Point A high/low for conservative high-probability profit capture', ruleKey: 'pointA' }
    ],
    trailingRule: 'Lock in partial gains early to give room for price action to breathe and retest Point A.'
  },

  Bat: {
    name: 'Bat',
    description: 'Precision harmonic pattern with shallow B-point (<50% XA) and deep 88.6% PRZ entry at D giving high R:R.',
    pdfChapter: 'Chapter 3: Harmonic Bat Pattern Strategy',
    ab_xa: { min: 0.35, max: 0.53, ideal: 0.50, formula: 'AB = 38.2% to 50% retracement of XA (must NOT exceed 0.618)' },
    bc_ab: { min: 0.35, max: 0.92, ideal: 0.886, formula: 'BC = 38.2% to 88.6% retracement of AB' },
    cd_xa: { min: 0.84, max: 0.93, ideal: 0.886, formula: 'CD = 88.6% (0.886) retracement of XA leg' },
    cd_ab: { min: 1.55, max: 2.70, ideal: 2.00, formula: 'CD = 1.618 – 2.618 extension of AB leg' },
    stopLossRule: 'Place protective Stop Loss below/above Wave X pivot point.',
    tpRules: [
      { name: 'TP 1 (Wave C)', description: 'Take 50% partial profit once price hits Wave C level', ruleKey: 'pointC' },
      { name: 'TP 2 (Wave A)', description: 'Close remainder once price breaks above/below Wave A level', ruleKey: 'pointA' }
    ],
    trailingRule: 'Important: Move your Stop Loss to Breakeven (BE) immediately once TP1 (Wave C) is hit!'
  },

  Gartley: {
    name: 'Gartley',
    description: 'The classic 222 pattern characterized by a crisp 61.8% B-point retracement and balanced AB=CD symmetry.',
    pdfChapter: 'Chapter 4: Gartley Harmonic Pattern Trading Strategy',
    ab_xa: { min: 0.58, max: 0.66, ideal: 0.618, formula: 'AB = 0.618 (61.8%) retracement of XA leg' },
    bc_ab: { min: 0.35, max: 0.82, ideal: 0.618, formula: 'BC = 38.2% to 78.6% retracement of AB' },
    cd_ab: { min: 1.22, max: 1.68, ideal: 1.272, formula: 'CD = 1.272 – 1.618 extension of AB' },
    cd_xa: { min: 0.74, max: 0.82, ideal: 0.786, formula: 'CD = 0.786 retracement of XA leg' },
    stopLossRule: 'Place protective Stop Loss strictly below/above Wave X.',
    tpRules: [
      { name: 'TP 1 (XA Length)', description: 'Equal price distance of XA swing leg projected from Point D', ruleKey: 'xaProjection' },
      { name: 'TP 2 (0.618 CD)', description: '0.618 Fibonacci retracement of CD or test of Point A', ruleKey: 'fib618_cd' }
    ],
    trailingRule: 'Trail Stop Loss behind swing pivots as fractal symmetry unfolds.'
  },

  Crab: {
    name: 'Crab',
    description: 'Extreme harmonic reversal pattern with explosive 1.618 XA extension and 2.24-3.618 AB extension.',
    pdfChapter: 'Chapter 5: Crab Pattern Harmonic Trading Strategy',
    ab_xa: { min: 0.35, max: 0.65, ideal: 0.50, formula: 'AB = 38.2% – 61.8% retracement of XA leg' },
    bc_ab: { min: 0.35, max: 0.92, ideal: 0.618, formula: 'BC = 38.2% – 88.6% retracement of AB leg' },
    cd_ab: { min: 2.15, max: 3.70, ideal: 2.618, formula: 'CD = 2.24 – 3.618 extension of AB leg' },
    cd_xa: { min: 1.55, max: 1.70, ideal: 1.618, formula: 'CD = 1.618 extension of XA leg' },
    stopLossRule: 'Initial Stop Loss above/below 3.618 Fib extension; trail below/above Point D once moving in favor.',
    tpRules: [
      { name: 'TP 1 (0.618 CD)', description: '0.618 Golden Ratio Fibonacci retracement of the deep CD leg', ruleKey: 'fib618_cd' },
      { name: 'TP 2 (Break of A)', description: 'Target the complete break beyond Point A swing extreme', ruleKey: 'beyondA' }
    ],
    trailingRule: 'Trail SL aggressively right below/above Point D as soon as the PRZ reversal takes off.'
  },

  Shark: {
    name: 'Shark',
    description: '5-leg emerging structure (0XABC) with 1.13-1.618 AB extension and 1.13 0X extension target at Point D.',
    pdfChapter: 'Chapter 6: Shark Harmonic Trading Strategy',
    ab_xa: { min: 1.08, max: 1.68, ideal: 1.13, formula: 'AB = 1.13 – 1.618 extension of XA leg' },
    bc_0x: { min: 1.08, max: 1.20, ideal: 1.13, formula: 'BC = 113% (1.13) Fibonacci extension of 0X leg' },
    cd_bc: { min: 0.45, max: 0.55, ideal: 0.50, formula: 'CD = 50% Fibonacci retracement of BC leg' },
    stopLossRule: 'Place tight protective Stop Loss below/above 1.150 Fibonacci extension of XA (or 2.618 AB).',
    tpRules: [
      { name: 'TP 1 (50% CD)', description: '50% Fibonacci retracement of the CD swing leg', ruleKey: 'fib50_cd' },
      { name: 'TP 2 (Point C High/Low)', description: '100% retracement retesting the Point C swing extreme', ruleKey: 'pointC' }
    ],
    trailingRule: 'Move Stop Loss to completion of D leg once market starts advancing toward TP1.'
  }
};

/**
 * Calculates all Fib measurements and dynamic targets/SL for 5 swing points (X, A, B, C, D)
 */
export function evaluateHarmonicPattern(
  points: { X: HarmonicPoint; A: HarmonicPoint; B: HarmonicPoint; C: HarmonicPoint; D: HarmonicPoint; O?: HarmonicPoint },
  currentPrice: number
): HarmonicPatternMatch | null {
  const { X, A, B, C, D } = points;
  const isBullish = A.price > X.price && D.price < C.price;
  const orientation: PatternOrientation = isBullish ? 'Bullish' : 'Bearish';
  const action = isBullish ? 'BUY' : 'SELL';

  const xaDiff = Math.abs(A.price - X.price);
  if (xaDiff === 0) return null;

  const abDiff = Math.abs(B.price - A.price);
  const bcDiff = Math.abs(C.price - B.price);
  const cdDiff = Math.abs(D.price - C.price);
  const xcDiff = Math.abs(C.price - X.price);

  const ab_xa = abDiff / xaDiff;
  const bc_ab = bcDiff / (abDiff || 1);
  const cd_ab = cdDiff / (abDiff || 1);
  const cd_xa = cdDiff / xaDiff;
  const cd_xc = cdDiff / (xcDiff || 1);

  // Score against each harmonic pattern
  let bestMatch: { type: HarmonicPatternType; score: number; ratios: Record<string, RatioMeasurement> } | null = null;

  for (const [typeKey, rule] of Object.entries(HARMONIC_RULES) as [HarmonicPatternType, PatternRuleDef][]) {
    let score = 0;
    let checks = 0;
    const ratioMap: Record<string, RatioMeasurement> = {};

    // Check AB/XA
    const abValid = ab_xa >= rule.ab_xa.min && ab_xa <= rule.ab_xa.max;
    const abDiffIdeal = Math.abs(ab_xa - rule.ab_xa.ideal);
    score += abValid ? Math.max(0, 100 - abDiffIdeal * 150) : Math.max(0, 50 - abDiffIdeal * 200);
    checks++;
    ratioMap.ab_xa = {
      name: 'AB / XA',
      actual: Number(ab_xa.toFixed(3)),
      expectedMin: rule.ab_xa.min,
      expectedMax: rule.ab_xa.max,
      ideal: rule.ab_xa.ideal,
      formula: rule.ab_xa.formula,
      isValid: abValid
    };

    // Check BC/AB
    if (rule.bc_ab) {
      const bcValid = bc_ab >= rule.bc_ab.min && bc_ab <= rule.bc_ab.max;
      const bcDiffIdeal = Math.abs(bc_ab - rule.bc_ab.ideal);
      score += bcValid ? Math.max(0, 100 - bcDiffIdeal * 100) : Math.max(0, 40 - bcDiffIdeal * 150);
      checks++;
      ratioMap.bc_ab = {
        name: 'BC / AB',
        actual: Number(bc_ab.toFixed(3)),
        expectedMin: rule.bc_ab.min,
        expectedMax: rule.bc_ab.max,
        ideal: rule.bc_ab.ideal,
        formula: rule.bc_ab.formula,
        isValid: bcValid
      };
    }

    // Check CD / XA or CD / XC or CD / AB
    if (rule.cd_xa) {
      const cdXaValid = cd_xa >= rule.cd_xa.min && cd_xa <= rule.cd_xa.max;
      score += cdXaValid ? 100 : Math.max(0, 40 - Math.abs(cd_xa - rule.cd_xa.ideal) * 100);
      checks++;
      ratioMap.cd_xa = {
        name: 'CD / XA',
        actual: Number(cd_xa.toFixed(3)),
        expectedMin: rule.cd_xa.min,
        expectedMax: rule.cd_xa.max,
        ideal: rule.cd_xa.ideal,
        formula: rule.cd_xa.formula,
        isValid: cdXaValid
      };
    }

    if (rule.cd_xc) {
      const cdXcValid = cd_xc >= rule.cd_xc.min && cd_xc <= rule.cd_xc.max;
      score += cdXcValid ? 100 : Math.max(0, 30 - Math.abs(cd_xc - rule.cd_xc.ideal) * 150);
      checks++;
      ratioMap.cd_xc = {
        name: 'CD / XC',
        actual: Number(cd_xc.toFixed(3)),
        expectedMin: rule.cd_xc.min,
        expectedMax: rule.cd_xc.max,
        ideal: rule.cd_xc.ideal,
        formula: rule.cd_xc.formula,
        isValid: cdXcValid
      };
    }

    if (rule.cd_ab && !rule.cd_xc) {
      const cdAbValid = cd_ab >= rule.cd_ab.min && cd_ab <= rule.cd_ab.max;
      score += cdAbValid ? 90 : 30;
      checks++;
      ratioMap.cd_ab = {
        name: 'CD / AB',
        actual: Number(cd_ab.toFixed(3)),
        expectedMin: rule.cd_ab.min,
        expectedMax: rule.cd_ab.max,
        ideal: rule.cd_ab.ideal,
        formula: rule.cd_ab.formula,
        isValid: cdAbValid
      };
    }

    const finalScore = Math.round(score / (checks || 1));
    if (!bestMatch || finalScore > bestMatch.score) {
      bestMatch = { type: typeKey, score: finalScore, ratios: ratioMap };
    }
  }

  if (!bestMatch || bestMatch.score < 55) return null;

  const patternType = bestMatch.type;
  const ruleDef = HARMONIC_RULES[patternType];
  const entryPrice = D.price;

  // Dynamic Stop Loss Calculation according to PDF rules
  let stopLossPrice = 0;
  let stopLossReason = '';

  if (patternType === 'Butterfly') {
    stopLossPrice = isBullish ? X.price - xaDiff * 0.618 : X.price + xaDiff * 0.618;
    stopLossReason = 'Below/Above 1.618 Fib extension of XA leg';
  } else if (patternType === 'Cypher' || patternType === 'Bat' || patternType === 'Gartley') {
    const buffer = xaDiff * 0.05;
    stopLossPrice = isBullish ? X.price - buffer : X.price + buffer;
    stopLossReason = `Below/Above Point X (${patternType} Rule)`;
  } else if (patternType === 'Crab') {
    stopLossPrice = isBullish ? C.price - abDiff * 3.618 : C.price + abDiff * 3.618;
    stopLossReason = 'Beyond 3.618 Fib extension of AB leg';
  } else if (patternType === 'Shark') {
    stopLossPrice = isBullish ? X.price - xaDiff * 0.15 : X.price + xaDiff * 0.15;
    stopLossReason = 'Below/Above 1.150 Fib extension of XA';
  }

  const slDistancePoints = Math.abs(entryPrice - stopLossPrice);
  const slDistancePercent = Number(((slDistancePoints / entryPrice) * 100).toFixed(2));

  // Dynamic Take Profit Targets
  const targets: TakeProfitTarget[] = [];

  if (patternType === 'Butterfly') {
    const tp1Price = B.price;
    const tp1Pts = Math.abs(tp1Price - entryPrice);
    const tp1Pct = Number(((tp1Pts / entryPrice) * 100).toFixed(2));
    const rr1 = Number((tp1Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-1',
      name: 'TP 1 (Point B)',
      price: Number(tp1Price.toFixed(4)),
      ruleDescription: 'Conservative first target at Point B resistance/support',
      pointsFromEntry: Number(tp1Pts.toFixed(4)),
      percentFromEntry: tp1Pct,
      riskRewardRatio: rr1,
      isHit: isBullish ? currentPrice >= tp1Price : currentPrice <= tp1Price
    });

    const tp2Price = isBullish ? D.price + cdDiff * 0.618 : D.price - cdDiff * 0.618;
    const tp2Pts = Math.abs(tp2Price - entryPrice);
    const tp2Pct = Number(((tp2Pts / entryPrice) * 100).toFixed(2));
    const rr2 = Number((tp2Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-2',
      name: 'TP 2 (0.618 CD Retracement)',
      price: Number(tp2Price.toFixed(4)),
      ruleDescription: '0.618 Fibonacci retracement of the CD swing leg',
      pointsFromEntry: Number(tp2Pts.toFixed(4)),
      percentFromEntry: tp2Pct,
      riskRewardRatio: rr2,
      isHit: isBullish ? currentPrice >= tp2Price : currentPrice <= tp2Price
    });
  } else if (patternType === 'Cypher') {
    const tpPrice = A.price;
    const tpPts = Math.abs(tpPrice - entryPrice);
    const tpPct = Number(((tpPts / entryPrice) * 100).toFixed(2));
    const rr = Number((tpPts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-1',
      name: 'TP 1 (Point A)',
      price: Number(tpPrice.toFixed(4)),
      ruleDescription: 'Full target once reaching Point A swing level',
      pointsFromEntry: Number(tpPts.toFixed(4)),
      percentFromEntry: tpPct,
      riskRewardRatio: rr,
      isHit: isBullish ? currentPrice >= tpPrice : currentPrice <= tpPrice
    });
  } else if (patternType === 'Bat') {
    const tp1Price = C.price;
    const tp1Pts = Math.abs(tp1Price - entryPrice);
    const rr1 = Number((tp1Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-1',
      name: 'TP 1 (Wave C)',
      price: Number(tp1Price.toFixed(4)),
      ruleDescription: 'Take 50% partial profit at Wave C & move SL to BE',
      pointsFromEntry: Number(tp1Pts.toFixed(4)),
      percentFromEntry: Number(((tp1Pts / entryPrice) * 100).toFixed(2)),
      riskRewardRatio: rr1,
      isHit: isBullish ? currentPrice >= tp1Price : currentPrice <= tp1Price
    });

    const tp2Price = A.price;
    const tp2Pts = Math.abs(tp2Price - entryPrice);
    const rr2 = Number((tp2Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-2',
      name: 'TP 2 (Wave A)',
      price: Number(tp2Price.toFixed(4)),
      ruleDescription: 'Close remaining position once price breaks above/below Wave A',
      pointsFromEntry: Number(tp2Pts.toFixed(4)),
      percentFromEntry: Number(((tp2Pts / entryPrice) * 100).toFixed(2)),
      riskRewardRatio: rr2,
      isHit: isBullish ? currentPrice >= tp2Price : currentPrice <= tp2Price
    });
  } else if (patternType === 'Gartley') {
    const tp1Price = isBullish ? D.price + xaDiff : D.price - xaDiff;
    const tp1Pts = Math.abs(tp1Price - entryPrice);
    const rr1 = Number((tp1Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-1',
      name: 'TP 1 (XA Projection)',
      price: Number(tp1Price.toFixed(4)),
      ruleDescription: 'Fractal target: equal price distance of XA swing leg from Point D',
      pointsFromEntry: Number(tp1Pts.toFixed(4)),
      percentFromEntry: Number(((tp1Pts / entryPrice) * 100).toFixed(2)),
      riskRewardRatio: rr1,
      isHit: isBullish ? currentPrice >= tp1Price : currentPrice <= tp1Price
    });

    const tp2Price = isBullish ? D.price + cdDiff * 0.618 : D.price - cdDiff * 0.618;
    const tp2Pts = Math.abs(tp2Price - entryPrice);
    const rr2 = Number((tp2Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-2',
      name: 'TP 2 (0.618 CD)',
      price: Number(tp2Price.toFixed(4)),
      ruleDescription: '0.618 Fibonacci retracement of CD leg',
      pointsFromEntry: Number(tp2Pts.toFixed(4)),
      percentFromEntry: Number(((tp2Pts / entryPrice) * 100).toFixed(2)),
      riskRewardRatio: rr2,
      isHit: isBullish ? currentPrice >= tp2Price : currentPrice <= tp2Price
    });
  } else if (patternType === 'Crab') {
    const tp1Price = isBullish ? D.price + cdDiff * 0.618 : D.price - cdDiff * 0.618;
    const tp1Pts = Math.abs(tp1Price - entryPrice);
    const rr1 = Number((tp1Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-1',
      name: 'TP 1 (0.618 CD)',
      price: Number(tp1Price.toFixed(4)),
      ruleDescription: '0.618 Golden Ratio retracement of extreme CD swing',
      pointsFromEntry: Number(tp1Pts.toFixed(4)),
      percentFromEntry: Number(((tp1Pts / entryPrice) * 100).toFixed(2)),
      riskRewardRatio: rr1,
      isHit: isBullish ? currentPrice >= tp1Price : currentPrice <= tp1Price
    });

    const tp2Price = isBullish ? A.price + xaDiff * 0.1 : A.price - xaDiff * 0.1;
    const tp2Pts = Math.abs(tp2Price - entryPrice);
    const rr2 = Number((tp2Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-2',
      name: 'TP 2 (Break of A)',
      price: Number(tp2Price.toFixed(4)),
      ruleDescription: 'Break beyond Point A swing level',
      pointsFromEntry: Number(tp2Pts.toFixed(4)),
      percentFromEntry: Number(((tp2Pts / entryPrice) * 100).toFixed(2)),
      riskRewardRatio: rr2,
      isHit: isBullish ? currentPrice >= tp2Price : currentPrice <= tp2Price
    });
  } else if (patternType === 'Shark') {
    const tp1Price = isBullish ? D.price + cdDiff * 0.5 : D.price - cdDiff * 0.5;
    const tp1Pts = Math.abs(tp1Price - entryPrice);
    const rr1 = Number((tp1Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-1',
      name: 'TP 1 (50% CD Retracement)',
      price: Number(tp1Price.toFixed(4)),
      ruleDescription: '50% Fibonacci retracement of CD swing leg',
      pointsFromEntry: Number(tp1Pts.toFixed(4)),
      percentFromEntry: Number(((tp1Pts / entryPrice) * 100).toFixed(2)),
      riskRewardRatio: rr1,
      isHit: isBullish ? currentPrice >= tp1Price : currentPrice <= tp1Price
    });

    const tp2Price = C.price;
    const tp2Pts = Math.abs(tp2Price - entryPrice);
    const rr2 = Number((tp2Pts / (slDistancePoints || 1)).toFixed(2));
    targets.push({
      id: 'tp-2',
      name: 'TP 2 (Point C High/Low)',
      price: Number(tp2Price.toFixed(4)),
      ruleDescription: '100% Fibonacci retracement to Point C swing extreme',
      pointsFromEntry: Number(tp2Pts.toFixed(4)),
      percentFromEntry: Number(((tp2Pts / entryPrice) * 100).toFixed(2)),
      riskRewardRatio: rr2,
      isHit: isBullish ? currentPrice >= tp2Price : currentPrice <= tp2Price
    });
  }

  // PRZ Zone (Potential Reversal Zone)
  const przHigh = Math.max(D.price, isBullish ? D.price + cdDiff * 0.08 : D.price);
  const przLow = Math.min(D.price, isBullish ? D.price : D.price - cdDiff * 0.08);

  const currentDist = Number((Math.abs(currentPrice - entryPrice) / entryPrice * 100).toFixed(2));
  const isSlHit = isBullish ? currentPrice <= stopLossPrice : currentPrice >= stopLossPrice;

  let status: 'Forming' | 'Completed' | 'Triggered' | 'Invalidated' = 'Completed';
  if (isSlHit) {
    status = 'Invalidated';
  } else if (targets.some(t => t.isHit)) {
    status = 'Triggered';
  }

  return {
    id: `harmonic-${patternType.toLowerCase()}-${points.X.time}-${points.D.time}`,
    patternType,
    orientation,
    points,
    ratios: bestMatch.ratios,
    confidenceScore: bestMatch.score,
    status,
    entryZone: {
      min: przLow,
      max: przHigh,
      ideal: entryPrice,
      currentDistancePercent: currentDist
    },
    stopLoss: {
      price: Number(stopLossPrice.toFixed(4)),
      reason: stopLossReason,
      points: Number(slDistancePoints.toFixed(4)),
      percent: slDistancePercent,
      isHit: isSlHit
    },
    targets,
    przZone: {
      high: Number(przHigh.toFixed(4)),
      low: Number(przLow.toFixed(4))
    },
    trailingRule: ruleDef.trailingRule,
    pdfRuleSummary: ruleDef.pdfChapter,
    action
  };
}

