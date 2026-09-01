export type HarmonicPatternType =
  | 'Butterfly'
  | 'Cypher'
  | 'Bat'
  | 'Gartley'
  | 'Crab'
  | 'Shark';

export type ClassicalPatternType =
  | 'Double Bottom'
  | 'Double Top'
  | 'Head & Shoulders'
  | 'Inverted Head & Shoulders'
  | 'Triple Bottom'
  | 'Triple Top'
  | 'Ascending Triangle'
  | 'Descending Triangle';

export type PatternOrientation = 'Bullish' | 'Bearish';

export interface EngineCandle {
  time: number; // Unix timestamp in seconds or ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PivotPoint {
  index: number;
  time: number;
  price: number;
  type: 'high' | 'low';
}

export interface HarmonicPoint {
  label: '0' | 'X' | 'A' | 'B' | 'C' | 'D';
  index: number;
  time: number;
  price: number;
}

export interface RatioMeasurement {
  name: string;
  actual: number;
  expectedMin: number;
  expectedMax: number;
  ideal?: number;
  formula: string;
  isValid: boolean;
}

export interface TakeProfitTarget {
  id: string;
  name: string;
  price: number;
  ruleDescription: string;
  percentFromEntry: number;
  pointsFromEntry: number;
  riskRewardRatio: number;
  isHit: boolean;
}

export interface HarmonicPatternMatch {
  id: string;
  patternType: HarmonicPatternType;
  orientation: PatternOrientation;
  points: {
    X: HarmonicPoint;
    A: HarmonicPoint;
    B: HarmonicPoint;
    C: HarmonicPoint;
    D: HarmonicPoint;
    O?: HarmonicPoint;
  };
  ratios: {
    ab_xa?: RatioMeasurement;
    bc_ab?: RatioMeasurement;
    cd_ab?: RatioMeasurement;
    cd_xa?: RatioMeasurement;
    cd_xc?: RatioMeasurement;
    bc_0x?: RatioMeasurement;
    cd_bc?: RatioMeasurement;
  };
  confidenceScore: number; // 0 to 100%
  status: 'Forming' | 'Completed' | 'Triggered' | 'Invalidated';
  entryZone: {
    min: number;
    max: number;
    ideal: number;
    currentDistancePercent: number;
  };
  stopLoss: {
    price: number;
    reason: string;
    points: number;
    percent: number;
    isHit: boolean;
  };
  targets: TakeProfitTarget[];
  przZone: {
    high: number;
    low: number;
  };
  trailingRule: string;
  pdfRuleSummary: string;
  action: 'BUY' | 'SELL';
}

export interface ClassicalPatternMatch {
  id: string;
  name: ClassicalPatternType;
  category: 'Bullish Continuation' | 'Bearish Continuation' | 'Bullish Reversal' | 'Bearish Reversal';
  orientation: PatternOrientation;
  action: 'BUY' | 'SELL';
  breakoutPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  confidenceScore: number;
  status: 'Forming' | 'Breakout' | 'Completed' | 'Failed';
  keyPoints: Array<{ time: number; price: number; label: string; index: number }>;
  trendlines: Array<{ x1Time: number; y1Price: number; x2Time: number; y2Price: number; label?: string }>;
  riskRewardRatio: number;
  ruleDescription: string;
}
