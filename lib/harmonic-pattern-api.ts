import { buildAuthorizedHeaders, throwIfApiError } from "@/lib/auth";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

export type HarmonicPatternScanItem = {
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
  timeframe: string;
};

export type HarmonicPatternScanResponse = {
  count: number;
  timeframe: string;
  results: HarmonicPatternScanItem[];
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
