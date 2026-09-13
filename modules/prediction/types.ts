/**
 * Types and interfaces for the Real-time Multi-Factor Prediction Module.
 */

export type FactorType =
  | "ORDER_FLOW"
  | "LIQUIDITY"
  | "PRICE_STRUCTURE"
  | "OPTIONS_SURFACE"
  | "CONSTITUENTS";

export type SignalDirection = "BUY" | "SELL" | "HOLD";

export interface FactorSignal {
  factor_type: FactorType | string;
  direction: SignalDirection | string;
  score: number;
  confidence: number;
  weight: number;
  rationale: string;
  metrics: Record<string, unknown>;
}

export interface PredictedZone {
  lower_bound: number;
  upper_bound: number;
  midpoint: number;
  confidence: number;
  rationale?: string;
}

export interface OrderFlowMetrics {
  bid_volume: number;
  ask_volume: number;
  imbalance_ratio: number;
  cvd: number;
  aggression_score: number;
  large_trade_count: number;
  tick_momentum: number;
}

export interface LiquidityZone {
  zone_id: string;
  zone_type: "BUY_SIDE_POOL" | "SELL_SIDE_POOL" | "FVG_BULLISH" | "FVG_BEARISH" | string;
  upper_price: number;
  lower_price: number;
  confidence: number;
  swept: boolean;
  volume_depleted: number;
  midpoint: number;
}

export interface OptionsSurfaceMetrics {
  pcr_oi: number;
  pcr_volume: number;
  max_pain: number;
  atm_iv: number;
  iv_skew: number;
  gamma_regime: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | string;
  zero_gamma_level: number;
}

export interface ConstituentMetrics {
  advances: number;
  declines: number;
  unchanged: number;
  breadth_ratio: number;
  weighted_momentum: number;
  top_driver_symbol: string;
  top_driver_contribution: number;
  sector_bias: string;
}

export interface RealtimePredictionResponse {
  ok: boolean;
  prediction_id: string;
  symbol: string;
  timeframe: string;
  composite_score: number;
  direction: SignalDirection | string;
  confidence: number;
  target_price?: number | null;
  predicted_zone?: PredictedZone | null;
  horizon_candles: number;
  factors: Record<string, FactorSignal>;
  generated_at: string;
}

export interface OrderFlowResponse {
  ok: boolean;
  symbol: string;
  factor_type: string;
  direction: SignalDirection | string;
  score: number;
  confidence: number;
  metrics: OrderFlowMetrics;
  rationale: string;
}

export interface LiquidityResponse {
  ok: boolean;
  symbol: string;
  factor_type: string;
  direction: SignalDirection | string;
  score: number;
  confidence: number;
  metrics: Record<string, unknown>;
  zones: LiquidityZone[];
  rationale: string;
}

export interface OptionsSurfaceResponse {
  ok: boolean;
  symbol: string;
  factor_type: string;
  direction: SignalDirection | string;
  score: number;
  confidence: number;
  metrics: OptionsSurfaceMetrics;
  rationale: string;
}

export interface ConstituentsResponse {
  ok: boolean;
  index_symbol: string;
  factor_type: string;
  direction: SignalDirection | string;
  score: number;
  confidence: number;
  metrics: ConstituentMetrics;
  rationale: string;
}
