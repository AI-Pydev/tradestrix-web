import { buildAuthorizedHeaders, throwIfApiError } from "@/lib/auth";

export type CandleLabScenario = "trend_up" | "trend_down" | "range" | "volatile" | "whipsaw";
export type CandleLabKind = "time" | "tick" | "volume" | "range";
export type CandleLabSourceMode = "simulated_replay" | "broker_intraday" | "broker_live_ticks";
export type CandleLabBroker = "upstox" | "kite";
export type CandleLabPriceMode = "standard" | "heikin_ashi";

export type CandleLabPreviewRequest = {
  instrument_key: string;
  scenario: CandleLabScenario;
  candle_kind: CandleLabKind;
  candle_value: number;
  replay_tick_count: number;
  tick_interval_seconds: number;
  base_price: number;
  display_limit: number;
  source_mode: CandleLabSourceMode;
  broker_id: CandleLabBroker;
  price_mode: CandleLabPriceMode;
  history_date?: string | null;
};

export type CandleLabSpec = {
  spec_id: string;
  kind: CandleLabKind;
  value: number;
  label: string;
};

export type CandleLabSummary = {
  generated_tick_count: number;
  completed_candle_count: number;
  displayed_candle_count: number;
  signal_count: number;
  latest_price?: number | null;
  price_change?: number | null;
  price_change_pct?: number | null;
  latest_complete_close_time?: string | null;
};

export type CandleLabCandle = {
  open_time: string;
  close_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tick_count: number;
  complete: boolean;
};

export type CandleLabIndicators = {
  candle_close_time: string;
  ema_fast?: number | null;
  ema_slow?: number | null;
  sma_fast?: number | null;
  sma_slow?: number | null;
  rsi?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  macd_histogram?: number | null;
  atr?: number | null;
  volatility?: number | null;
};

export type CandleLabSignal = {
  strategy_id: string;
  instrument_key: string;
  spec_id: string;
  action: "BUY" | "SELL" | "EXIT" | "HOLD";
  price: number;
  timestamp: string;
  reason: string;
  confidence: number;
  metadata: Record<string, string | number | boolean>;
};

export type CandleLabLiveState = {
  status: "connected" | "waiting";
  stream_connected: boolean;
  last_tick_time?: string | null;
  last_tick_price?: number | null;
  received_tick_count: number;
  received_message_count: number;
  last_error?: string | null;
};

export type CandleLabPreviewResponse = {
  mode: CandleLabSourceMode;
  price_mode: CandleLabPriceMode;
  broker_id?: CandleLabBroker | null;
  live_state?: CandleLabLiveState | null;
  instrument_key: string;
  scenario: CandleLabScenario;
  scenario_label: string;
  candle_spec: CandleLabSpec;
  summary: CandleLabSummary;
  candles: CandleLabCandle[];
  open_candle?: CandleLabCandle | null;
  latest_indicators?: CandleLabIndicators | null;
  recent_signals: CandleLabSignal[];
  notes: string[];
};

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

async function postBackendJsonWithBody<T, TBody>(path: string, body: TBody): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "POST",
    headers: buildAuthorizedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

export async function previewCustomCandleLab(payload: CandleLabPreviewRequest) {
  return postBackendJsonWithBody<CandleLabPreviewResponse, CandleLabPreviewRequest>(
    "/api/v1/custom-candles/preview",
    payload,
  );
}
