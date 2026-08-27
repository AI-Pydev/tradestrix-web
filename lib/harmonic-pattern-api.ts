import { buildAuthorizedHeaders, throwIfApiError } from "@/lib/auth";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

export const HARMONIC_SUPPORTED_TIMEFRAMES = [
  { id: "all", label: "All Timeframes (1m → 1M)" },
  { id: "1m", label: "1 Minute (1m)" },
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
