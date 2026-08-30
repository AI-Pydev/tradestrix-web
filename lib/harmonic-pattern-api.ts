import { buildAuthorizedHeaders, throwIfApiError } from "@/lib/auth";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

export const HARMONIC_SUPPORTED_TIMEFRAMES = [
  { id: "all", label: "All Timeframes (3m → 1M)" },
  { id: "3m", label: "3 Minutes (3m)" },
  { id: "5m", label: "5 Minutes (5m)" },
  { id: "15m", label: "15 Minutes (15m)" },
  { id: "30m", label: "30 Minutes (30m)" },
  { id: "1h", label: "1 Hour (1h)" },
  { id: "2h", label: "2 Hours (2h)" },
  { id: "4h", label: "4 Hours (4h)" },
  { id: "1d", label: "Daily (1d)" },
  { id: "1w", label: "Weekly (1w)" },
  { id: "1M", label: "Monthly (1M)" },
] as const;

export type HarmonicPatternScanItem = {
  id?: string;
  label: string;
  instrument_key: string;
  kind: "index" | "stock";
  pattern_name: string;
  direction: "BULLISH" | "BEARISH";
  state: string;
  quality_score: number;
  geometry_score: number;
  current_price: number;
  base_price?: number;
  dist_from_base?: number;
  reward_points_t1?: number;
  reward_points_t2?: number;
  risk_points_sl?: number;
  live_rr_ratio?: number;
  base_rr_ratio?: number;
  prz_low: number;
  prz_high: number;
  prz_mid: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  target_3: number;
  x: { price: number; time: string; index?: number };
  a: { price: number; time: string; index?: number };
  b: { price: number; time: string; index?: number };
  c: { price: number; time: string; index?: number };
  d?: { price: number; time: string; index?: number } | null;
  detected_at: string;
  updated_at?: string;
  timeframe: string;
  is_active?: boolean;
  nearest_support?: number | null;
  nearest_resistance?: number | null;
  sr_confluence?: boolean;
  predicted_at?: string;
  target_1_hit_at?: string | null;
  target_2_hit_at?: string | null;
  stop_loss_hit_at?: string | null;
  trade_outcome?: "OPEN" | "T1_HIT" | "T2_HIT" | "SL_BREACHED" | "EXPIRED" | string;
  hold_duration_mins?: number | null;
  forming_prediction?: PredictiveDProjection | null;
};

export type HarmonicPaperTrade = {
  trade_id: string;
  pattern_id: string;
  instrument_key: string;
  symbol_label: string;
  kind: "index" | "stock";
  direction: "BULLISH" | "BEARISH";
  pattern_name: string;
  timeframe: string;
  entry_price: number;
  quantity: number;
  target_1: number;
  target_2: number;
  stop_loss: number;
  current_price: number;
  unrealized_pnl_points: number;
  unrealized_pnl_amount: number;
  status: "OPEN" | "CLOSED";
  exit_price?: number | null;
  exit_reason?: string | null;
  realized_pnl_points?: number | null;
  realized_pnl_amount?: number | null;
  opened_at: string;
  closed_at?: string | null;
  hold_duration_mins?: number | null;
  execution_mode: "paper" | "live";
  notes?: string | null;
};

export type HarmonicPaperTradeSummary = {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  win_trades: number;
  loss_trades: number;
  win_rate_pct: number;
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  net_pnl: number;
  profit_factor: number;
};

export type HarmonicPaperTradesResponse = {
  count: number;
  status_filter: string;
  results: HarmonicPaperTrade[];
  summary: HarmonicPaperTradeSummary;
};

export type CreatePaperTradePayload = {
  pattern_id: string;
  instrument_key: string;
  symbol_label: string;
  kind?: "index" | "stock";
  direction: "BULLISH" | "BEARISH";
  pattern_name: string;
  timeframe: string;
  entry_price: number;
  quantity?: number;
  target_1: number;
  target_2: number;
  stop_loss: number;
  execution_mode?: "paper" | "live";
  notes?: string;
};

export type HarmonicPatternScanResponse = {
  count: number;
  timeframe: string;
  results: HarmonicPatternScanItem[];
};

export type HarmonicDBQueryResponse = {
  count: number;
  timeframe_filter?: string | null;
  results: HarmonicPatternScanItem[];
  database_summary: {
    total_active: number;
    by_timeframe: Record<string, number>;
    by_direction: Record<string, number>;
    high_conviction: number;
    latest_update?: string | null;
  };
};

export type HarmonicVisualChartResponse = {
  instrument_key: string;
  timeframe: string;
  candles: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  patterns: Array<{
    pattern_id: string;
    name: string;
    direction: "BULLISH" | "BEARISH";
    state: string;
    quality_score: number;
    nearest_support?: number | null;
    nearest_resistance?: number | null;
    sr_confluence?: boolean;
    x: { price: number; time: string };
    a: { price: number; time: string };
    b: { price: number; time: string };
    c: { price: number; time: string };
    d?: { price: number; time: string } | null;
    prz: {
      low: number;
      high: number;
      mid: number;
      stop: number;
      target_1: number;
      target_2: number;
      target_3: number;
    };
  }>;
  pivots: Array<{
    time: string;
    price: number;
    kind: "PEAK" | "VALLEY";
  }>;
  support_levels?: number[];
  resistance_levels?: number[];
  nearest_support?: number | null;
  nearest_resistance?: number | null;
};

export type MTFConfluenceReport = {
  instrument_key: string;
  symbol_label: string;
  macro_timeframe: string;
  macro_pattern_name: string;
  direction: "BULLISH" | "BEARISH";
  quality_score: number;
  current_price: number;
  prz_low: number;
  prz_high: number;
  prz_mid: number;
  macro_target_1: number;
  macro_target_2: number;
  macro_stop_loss: number;
  in_prz: boolean;
  intermediate_trend: string;
  micro_timeframe: string;
  rsi_3m: number;
  rsi_divergence: string;
  break_of_structure: string;
  candlestick_trigger: string;
  micro_stop_loss: number;
  confluence_score: number;
  readiness_stage:
    | "MACRO_DETECTED"
    | "IN_PRZ_MONITORING"
    | "MICRO_TRIGGER_CONFIRMED"
    | "INVALIDATED";
  risk_reward_ratio: number;
  pcr_value?: number | null;
  pcr_sentiment?: string;
  oi_buildup?: string;
  option_support_strike?: number | null;
  option_resistance_strike?: number | null;
  option_confluence_aligned?: boolean;
  recommendation: string;
  evaluated_at: string;
};

export type MTFUniverseConfluenceResponse = {
  total_evaluated: number;
  patterns_found: number;
  triggered_count: number;
  monitoring_prz_count: number;
  results: MTFConfluenceReport[];
};

export async function fetchHarmonicPatternScan(params?: {
  broker_id?: string;
  include_indices?: boolean;
  include_stocks?: boolean;
  max_indices?: number;
  max_stocks?: number;
  timeframe?: string;
  min_quality_score?: number;
  workers?: number;
}): Promise<HarmonicPatternScanResponse> {
  const query = new URLSearchParams();
  if (params?.broker_id) query.set("broker_id", params.broker_id);
  if (params?.include_indices !== undefined)
    query.set("include_indices", String(params.include_indices));
  if (params?.include_stocks !== undefined)
    query.set("include_stocks", String(params.include_stocks));
  if (params?.max_indices !== undefined)
    query.set("max_indices", String(params.max_indices));
  if (params?.max_stocks !== undefined)
    query.set("max_stocks", String(params.max_stocks));
  if (params?.timeframe) query.set("timeframe", params.timeframe);
  if (params?.min_quality_score !== undefined)
    query.set("min_quality_score", String(params.min_quality_score));
  if (params?.workers !== undefined)
    query.set("workers", String(params.workers));

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/scan?${query.toString()}`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function fetchPersistentDBHarmonicPatterns(params?: {
  timeframe?: string;
  instrument_key?: string;
  direction?: string;
  min_quality?: number;
  is_active?: boolean;
  limit?: number;
}): Promise<HarmonicDBQueryResponse> {
  const query = new URLSearchParams();
  if (params?.timeframe) query.set("timeframe", params.timeframe);
  if (params?.instrument_key)
    query.set("instrument_key", params.instrument_key);
  if (params?.direction) query.set("direction", params.direction);
  if (params?.min_quality !== undefined)
    query.set("min_quality", String(params.min_quality));
  if (params?.is_active !== undefined)
    query.set("is_active", String(params.is_active));
  if (params?.limit !== undefined) query.set("limit", String(params.limit));

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/db-patterns?${query.toString()}`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function triggerHarmonicAutoScanCycle(): Promise<
  Record<string, unknown>
> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/auto-scan-cycle`,
    {
      method: "POST",
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function fetchHarmonicEngineStatus(): Promise<
  Record<string, unknown>
> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/status`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function fetchHarmonicVisualChart(
  instrumentKey: string,
  params?: { broker_id?: string; timeframe?: string }
): Promise<HarmonicVisualChartResponse> {
  const query = new URLSearchParams();
  if (params?.broker_id) query.set("broker_id", params.broker_id);
  if (params?.timeframe) query.set("timeframe", params.timeframe);

  const encodedKey = encodeURIComponent(instrumentKey);
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/visualize/${encodedKey}?${query.toString()}`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function fetchMTFConfluence(
  instrumentKey: string,
  params?: { broker_id?: string; label?: string }
): Promise<MTFConfluenceReport> {
  const query = new URLSearchParams();
  if (params?.broker_id) query.set("broker_id", params.broker_id);
  if (params?.label) query.set("label", params.label);

  const encodedKey = encodeURIComponent(instrumentKey);
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/mtf-confluence/${encodedKey}?${query.toString()}`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function fetchMTFUniverseConfluence(params?: {
  broker_id?: string;
  max_indices?: number;
  max_stocks?: number;
  workers?: number;
}): Promise<MTFUniverseConfluenceResponse> {
  const query = new URLSearchParams();
  if (params?.broker_id) query.set("broker_id", params.broker_id);
  if (params?.max_indices !== undefined)
    query.set("max_indices", String(params.max_indices));
  if (params?.max_stocks !== undefined)
    query.set("max_stocks", String(params.max_stocks));
  if (params?.workers !== undefined)
    query.set("workers", String(params.workers));

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/mtf-universe-confluence?${query.toString()}`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function fetchHarmonicPaperTrades(params?: {
  status?: "ALL" | "OPEN" | "CLOSED";
  limit?: number;
}): Promise<HarmonicPaperTradesResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.limit) query.set("limit", String(params.limit));

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/paper-trades?${query.toString()}`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function createHarmonicPaperTrade(
  payload: CreatePaperTradePayload
): Promise<{ status: string; trade: HarmonicPaperTrade }> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/paper-trades`,
    {
      method: "POST",
      headers: {
        ...buildAuthorizedHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function closeHarmonicPaperTrade(
  tradeId: string,
  payload?: { exit_price?: number; exit_reason?: string }
): Promise<{ status: string; trade: HarmonicPaperTrade }> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/paper-trades/${encodeURIComponent(
      tradeId
    )}/close`,
    {
      method: "POST",
      headers: {
        ...buildAuthorizedHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || { exit_reason: "MANUAL" }),
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function syncHarmonicPaperTrades(
  brokerId: string = "upstox"
): Promise<{
  status: string;
  updated_trades_count: number;
  results: HarmonicPaperTrade[];
  summary: HarmonicPaperTradeSummary;
}> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/paper-trades/sync-monitor?broker_id=${encodeURIComponent(
      brokerId
    )}`,
    {
      method: "POST",
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function fetchHarmonicPaperSummary(): Promise<HarmonicPaperTradeSummary> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/paper-trades/summary`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export type HarmonicAutoTradeSettings = {
  enabled: boolean;
  execution_mode: "paper" | "live";
  broker_id: "upstox" | "kite" | "kotak";
  min_quality_score: number;
  require_sr_confluence: boolean;
  require_mtf_confirmation: boolean;
  max_open_positions: number;
  stock_quantity: number;
  index_quantity: number;
  auto_exit_time: string;
  trail_sl_to_breakeven_on_t1: boolean;
  check_interval_sec: number;
  updated_at?: string;
};

export type HarmonicAutoTradeSettingsResponse = {
  status: string;
  settings: HarmonicAutoTradeSettings;
};

export type HarmonicAutoEntryResponse = {
  status: string;
  message?: string;
  trades_opened_count?: number;
  trades_opened?: HarmonicPaperTrade[];
  available_slots_remaining?: number;
};

export async function fetchHarmonicAutoTradeSettings(): Promise<HarmonicAutoTradeSettingsResponse> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/auto-trade/settings`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function updateHarmonicAutoTradeSettings(
  settings: Partial<HarmonicAutoTradeSettings>
): Promise<HarmonicAutoTradeSettingsResponse> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/auto-trade/settings`,
    {
      method: "POST",
      headers: {
        ...buildAuthorizedHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function runHarmonicAutoEntryNow(): Promise<HarmonicAutoEntryResponse> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/auto-trade/run-entry-now`,
    {
      method: "POST",
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function runHarmonicAutoExitNow(): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/auto-trade/run-exit-now`,
    {
      method: "POST",
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export type PredictiveDProjection = {
  projection_id: string;
  pattern_name: string;
  direction: "BULLISH" | "BEARISH";
  symbol_label: string;
  instrument_key: string;
  kind?: "index" | "stock";
  timeframe: string;
  current_price: number;
  x: { price: number; time: string; index?: number; kind?: string };
  a: { price: number; time: string; index?: number; kind?: string };
  b: { price: number; time: string; index?: number; kind?: string };
  c: { price: number; time: string; index?: number; kind?: string };
  ratio_ab_xa: number;
  ratio_bc_ab: number;
  ratio_bc_xa?: number | null;
  predicted_d_low: number;
  predicted_d_high: number;
  predicted_d_mid: number;
  target_cd_bc_min: number;
  target_cd_bc_max: number;
  target_xd_xa_min: number;
  target_xd_xa_max: number;
  cd_leg_points: number;
  cd_trade_direction: "BUY" | "SELL";
  dist_to_d_points: number;
  dist_to_d_pct: number;
  anticipated_t1: number;
  anticipated_t2: number;
  anticipated_sl: number;
  t1_rule_desc: string;
  t2_rule_desc: string;
  sl_rule_desc: string;
  geometry_score: number;
  quality_score: number;
  status: "FORMING_CD" | "APPROACHING_PRZ" | "IN_PREDICTED_PRZ" | "OVERRUN" | string;
  detected_at?: string;
  notes?: string;
  nearest_support?: number | null;
  nearest_resistance?: number | null;
};

export type EmergingPatternScanResponse = {
  status: string;
  count: number;
  timeframe: string;
  results: PredictiveDProjection[];
};

export type PredictiveDChartData = {
  instrument_key: string;
  symbol_label: string;
  timeframe: string;
  candles: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  pivots: {
    index: number;
    time: string;
    price: number;
    kind: string;
  }[];
  predictions: PredictiveDProjection[];
  current_price: number;
  support_levels: number[];
  resistance_levels: number[];
  nearest_support?: number | null;
  nearest_resistance?: number | null;
};

export type PredictiveDChartResponse = {
  status: string;
  data: PredictiveDChartData;
};

export async function fetchEmergingHarmonicPatterns(params?: {
  timeframe?: string;
  min_quality?: number;
  max_stocks?: number;
  include_indices?: boolean;
  include_stocks?: boolean;
}): Promise<EmergingPatternScanResponse> {
  const query = new URLSearchParams();
  if (params?.timeframe) query.set("timeframe", params.timeframe);
  if (params?.min_quality !== undefined)
    query.set("min_quality", String(params.min_quality));
  if (params?.max_stocks !== undefined)
    query.set("max_stocks", String(params.max_stocks));
  if (params?.include_indices !== undefined)
    query.set("include_indices", String(params.include_indices));
  if (params?.include_stocks !== undefined)
    query.set("include_stocks", String(params.include_stocks));

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/emerging-patterns?${query.toString()}`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function fetchSymbolPredictiveD(
  instrumentKey: string,
  timeframe: string = "3m",
  brokerId: string = "upstox"
): Promise<PredictiveDChartResponse> {
  const query = new URLSearchParams();
  query.set("timeframe", timeframe);
  if (brokerId) query.set("broker_id", brokerId);

  const encodedKey = encodeURIComponent(instrumentKey);
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/predict-d/${encodedKey}?${query.toString()}`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export interface CustomWaveEvaluationRequest {
  x_price: number;
  a_price: number;
  b_price: number;
  c_price: number;
  d_price?: number | null;
  current_price?: number | null;
  symbol_label?: string;
  instrument_key?: string | null;
  timeframe?: string;
  direction?: "BULLISH" | "BEARISH" | "AUTO";
}

export interface RatioDetail {
  name: string;
  actual: number;
  min: number;
  max: number;
  ideal: number;
  status: "PERFECT" | "ACCEPTABLE" | "BORDERLINE" | "INVALID";
}

export interface PatternMatch {
  pattern_name: string;
  direction: "BULLISH" | "BEARISH";
  is_valid: boolean;
  quality_score: number;
  geometry_score: number;
  status: string;
  best_entry_price?: number;
  entry_zone_low?: number;
  entry_zone_high?: number;
  entry_action?: string;
  t1_reward_points?: number;
  t1_reward_pct?: number;
  t2_reward_points?: number;
  t2_reward_pct?: number;
  sl_risk_points?: number;
  sl_risk_pct?: number;
  immediate_support?: number;
  immediate_resistance?: number;
  support_distance_points?: number;
  support_distance_pct?: number;
  resistance_distance_points?: number;
  resistance_distance_pct?: number;
  ratios: Record<string, RatioDetail>;
  predicted_d_low: number;
  predicted_d_high: number;
  predicted_d_mid: number;
  target_1: number;
  target_2: number;
  target_3: number;
  stop_loss: number;
  live_rr_ratio: number;
  prz_mid: number;
}

export interface CustomWaveEvaluationResponse {
  status: string;
  symbol_label: string;
  instrument_key: string;
  timeframe: string;
  current_price: number;
  direction: "BULLISH" | "BEARISH";
  wave_points: {
    x: { price: number; label: string };
    a: { price: number; label: string };
    b: { price: number; label: string };
    c: { price: number; label: string };
    d: { price: number; label: string } | null;
  };
  actual_ratios: {
    AB_XA: number;
    BC_AB: number;
    BC_XA: number;
    AC_XA?: number;
    AC_AB?: number;
    CD_BC: number | null;
    XD_XA: number | null;
  };
  best_match: PatternMatch | null;
  all_matches: PatternMatch[];
  message?: string;
}

export interface CustomSymbolAnalysisResponse {
  status: string;
  message?: string;
  symbol_label: string;
  instrument_key: string;
  timeframe: string;
  current_price: number;
  candles: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  pivots: Array<{
    price: number;
    time: string;
    type: "HIGH" | "LOW";
    index: number;
  }>;
  patterns: any[];
  predictions: any[];
  support_levels: number[];
  resistance_levels: number[];
  nearest_support: number | null;
  nearest_resistance: number | null;
}

export async function evaluateHarmonicSandboxWave(
  payload: CustomWaveEvaluationRequest
): Promise<CustomWaveEvaluationResponse> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/sandbox/evaluate`,
    {
      method: "POST",
      headers: buildAuthorizedHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}

export async function fetchCustomHarmonicAnalysis(
  symbol: string,
  timeframe: string = "1d",
  brokerId: string = "upstox"
): Promise<CustomSymbolAnalysisResponse> {
  const query = new URLSearchParams();
  query.set("symbol", symbol);
  query.set("timeframe", timeframe);
  if (brokerId) query.set("broker_id", brokerId);

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/custom-analyze?${query.toString()}`,
    {
      headers: buildAuthorizedHeaders(),
      cache: "no-store",
    }
  );
  await throwIfApiError(response);
  return response.json();
}



