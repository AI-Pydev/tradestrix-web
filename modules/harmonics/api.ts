import {
    BACKEND_BASE_URL,
    buildAuthorizedHeaders,
    throwIfApiError,
} from "@/platform/http/client";
import type {
    CreatePaperTradePayload,
    CustomSymbolAnalysisResponse,
    CustomWaveEvaluationRequest,
    CustomWaveEvaluationResponse,
    EmergingPatternScanResponse,
    HarmonicAutoEntryResponse,
    HarmonicAutoTradeSettings,
    HarmonicAutoTradeSettingsResponse,
    HarmonicAutoTradeStatus,
    HarmonicDBQueryResponse,
    HarmonicPaperTrade,
    HarmonicPaperTradeSummary,
    HarmonicPaperTradesResponse,
    HarmonicPatternScanResponse,
    HarmonicVisualChartResponse,
    MTFConfluenceReport,
    MTFUniverseConfluenceResponse,
    PredictiveDChartResponse,
} from "./types";

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

export async function fetchHarmonicAutoTradeStatus(): Promise<{
  status: string;
  data: HarmonicAutoTradeStatus;
}> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/pattern-intelligence/auto-trade/status`,
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

