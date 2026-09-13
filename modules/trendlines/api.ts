import { getBackendJson, postBackendJsonWithBody } from "@/platform/http/client";

export type TrendLineScanRequest = {
  broker_id?: "upstox" | "kite";
  include_indices?: boolean;
  include_stocks?: boolean;
  max_indices?: number;
  max_stocks?: number;
  timeframe?: string;
  min_headroom_atr?: number;
};

export type TrendLineScanItem = {
  instrument_key: string;
  symbol: string;
  kind: "index" | "stock";
  current_price: number;
  atr: number;
  market_regime: string;
  call_trade_quality: string;
  call_vetoed: boolean;
  call_veto_reason?: string | null;
  put_trade_quality: string;
  put_vetoed: boolean;
  put_veto_reason?: string | null;
  res_dist_atr: number;
  sup_dist_atr: number;
  primary_formation?: string | null;
  rejection?: string | null;
  breakout?: string | null;
  bullish_score: number;
  bearish_score: number;
  audit_reasons: string[];
};

export type TrendLineScanResponse = {
  count: number;
  timeframe: string;
  results: TrendLineScanItem[];
};

export type TrendLineSymbolDetail = {
  instrument_key: string;
  timeframe: string;
  current_price: number;
  atr: number;
  market_regime: string;
  call_trade_quality: string;
  call_vetoed: boolean;
  call_veto_reason?: string | null;
  put_trade_quality: string;
  put_vetoed: boolean;
  put_veto_reason?: string | null;
  res_dist_atr: number;
  sup_dist_atr: number;
  active_lines: Array<{
    line_id: string;
    direction: string;
    lifecycle: string;
    slope_normalized: number;
    slope_regime: string;
    strength_score: number;
    touch_count: number;
    start_time: string;
    end_time: string;
    intercept_price: number;
  }>;
  primary_formation?: Record<string, unknown> | null;
  audit_reasons: string[];
  feature_vector: Record<string, number>;
};

export async function runTrendLineScanner(payload: TrendLineScanRequest) {
  return postBackendJsonWithBody<TrendLineScanResponse, TrendLineScanRequest>(
    `/api/v1/trendline-intelligence/scan`,
    payload,
  );
}

export async function fetchSymbolTrendlines(instrumentKey: string, brokerId = "upstox", timeframe = "3m") {
  return getBackendJson<TrendLineSymbolDetail>(
    `/api/v1/trendline-intelligence/symbol/${encodeURIComponent(instrumentKey)}?broker_id=${brokerId}&timeframe=${timeframe}`,
  );
}

export type TrendLineCatalogItem = {
  instrument_key: string;
  symbol: string;
  name: string;
  kind: "index" | "stock";
};

export type TrendLineCatalogResponse = {
  indices: TrendLineCatalogItem[];
  stocks: TrendLineCatalogItem[];
  total: number;
};

export type TrendLineChartAnchor = {
  index: number;
  price: number;
  kind: "HIGH" | "LOW";
  time: string;
};

export type TrendLineChartLine = {
  line_id: string;
  direction: "BULLISH_SUPPORT" | "BEARISH_RESISTANCE";
  lifecycle: string;
  slope_raw: number;
  slope_normalized: number;
  slope_regime: string;
  strength_score: number;
  touch_count: number;
  start_index: number;
  end_index: number;
  start_price: number;
  current_price: number;
  projected_price: number;
  anchors: TrendLineChartAnchor[];
};

export type TrendLineChartFormation = {
  formation_id: string;
  pattern_type: string;
  upper_line_id: string;
  lower_line_id: string;
  midpoint_price: number;
  current_width_points: number;
  current_width_atr: number;
  compression_ratio: number;
  converging: boolean;
  apex_index?: number | null;
  apex_price?: number | null;
  bars_to_apex?: number | null;
  apex_proximity_pct: number;
  quality_score: number;
};

export type TrendLineChartResponse = {
  instrument_key: string;
  timeframe: string;
  current_price: number;
  atr: number;
  market_regime: string;
  candles: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  active_lines: TrendLineChartLine[];
  formations: TrendLineChartFormation[];
  rejections: Array<{
    event_type: string;
    line_id: string;
    time: string;
    price: number;
    wick_ratio: number;
    score: number;
  }>;
  breakouts: Array<{
    event_type: string;
    line_id: string;
    time: string;
    price: number;
    direction: string;
    confirmed: boolean;
    penetration_atr: number;
  }>;
  headroom: {
    res_dist_atr: number;
    sup_dist_atr: number;
    call_quality: string;
    call_vetoed: boolean;
    call_veto_reason?: string | null;
    put_quality: string;
    put_vetoed: boolean;
    put_veto_reason?: string | null;
  };
  confluence: {
    bullish_score: number;
    bearish_score: number;
  };
  audit_reasons: string[];
  feature_vector: Record<string, number>;
};

export async function fetchTrendLineCatalog() {
  return getBackendJson<TrendLineCatalogResponse>(
    `/api/v1/trendline-intelligence/catalog`,
  );
}

export async function fetchTrendLineChartData(instrumentKey: string, brokerId = "upstox", timeframe = "3m") {
  return getBackendJson<TrendLineChartResponse>(
    `/api/v1/trendline-intelligence/chart/${encodeURIComponent(instrumentKey)}?broker_id=${brokerId}&timeframe=${timeframe}`,
  );
}

export interface TrendLineSandboxResult {
  active_lines_count?: number;
  primary_formation?: string | null;
  call_vetoed?: boolean;
  call_trade_quality?: string;
  put_vetoed?: boolean;
  put_trade_quality?: string;
  res_dist_atr?: number;
  sup_dist_atr?: number;
  [key: string]: unknown;
}

export async function runTrendLineSandbox(payload: {
  instrument_key: string;
  broker_id?: "upstox" | "kite";
  timeframe?: string;
  pivot_window?: number;
  min_headroom_atr?: number;
  touch_tolerance_atr?: number;
  cluster_window_bars?: number;
}) {
  return postBackendJsonWithBody<TrendLineSandboxResult, typeof payload>(
    `/api/v1/trendline-intelligence/evaluate-sandbox`,
    payload,
  );
}
