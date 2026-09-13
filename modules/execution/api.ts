import {
    deleteBackend,
    deleteBackendJson,
    getBackendJson,
    postBackendJson,
    postBackendJsonWithBody,
} from "@/platform/http/client";
import type {
    EquityAutoLaunchStatus,
    EquityBotRunRequest,
    EquityCatalogResponse,
    EquityDashboardSummary,
    EquityManagedJob,
    EquityStrategyItem,
    EquityTradeHistoryAnalytics,
    UpstoxBacktestChartCandlesRequest,
    UpstoxBacktestChartCandlesResponse,
    UpstoxEntryRejectionSummary,
    UpstoxIndexAutoLaunchStatus,
    UpstoxManagedBotBulkDeleteResponse,
    UpstoxManagedBotDashboardSummary,
    UpstoxManagedBotDeleteResponse,
    UpstoxManagedBotJob,
    UpstoxManagedBotPage,
    UpstoxManagedBotStartRequest,
    UpstoxManagedBotTrade,
    UpstoxOptionChainBacktestRunRequest,
    UpstoxOptionChainBacktestRunResponse,
    UpstoxOptionChainBotPreviewResponse,
    UpstoxOptionChainBotRunRequest,
    UpstoxOptionChainBotRunResponse,
    UpstoxStockAutoLaunchStatus,
    UpstoxTradeHistoryAnalytics,
} from "./types";

export async function runUpstoxOptionChainBot(payload: UpstoxOptionChainBotRunRequest) {
  return postBackendJsonWithBody<UpstoxOptionChainBotRunResponse, UpstoxOptionChainBotRunRequest>(
    "/api/v1/upstox/option-chain-bot/run",
    payload,
  );
}

export async function fetchUpstoxManagedBotJobs() {
  return getBackendJson<UpstoxManagedBotJob[]>("/api/v1/upstox/option-chain-bot/jobs");
}

export async function fetchUpstoxManagedBotDashboardSummary() {
  return getBackendJson<UpstoxManagedBotDashboardSummary>("/api/v1/upstox/option-chain-bot/dashboard/summary");
}

export async function fetchUpstoxEntryRejectionSummary(params?: {
  since_hours?: number;
  instrument_key?: string;
  strategy_id?: string;
  include_brokerage?: boolean;
  brokerage_per_trade?: number;
}) {
  const search = new URLSearchParams();
  if (params?.since_hours != null) {
    search.set("since_hours", String(params.since_hours));
  }
  if (params?.instrument_key) {
    search.set("instrument_key", params.instrument_key);
  }
  if (params?.strategy_id) {
    search.set("strategy_id", params.strategy_id);
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  return getBackendJson<UpstoxEntryRejectionSummary>(
    `/api/v1/upstox/option-chain-bot/dashboard/rejections${suffix}`,
  );
}

export async function fetchUpstoxManagedBotDashboardJobs(params?: {
  status_group?: "active" | "history" | "all";
  limit?: number;
  page?: number;
  cursor?: string | null;
  strategy_id?: string;
  started_from?: string;
  started_to?: string;
}) {
  const search = new URLSearchParams();
  if (params?.status_group) {
    search.set("status_group", params.status_group);
  }
  if (params?.limit != null) {
    search.set("limit", String(params.limit));
  }
  if (params?.page != null) {
    search.set("page", String(params.page));
  }
  if (params?.cursor) {
    search.set("cursor", params.cursor);
  }
  if (params?.strategy_id && params.strategy_id !== "all") {
    search.set("strategy_id", params.strategy_id);
  }
  if (params?.started_from) {
    search.set("started_from", params.started_from);
  }
  if (params?.started_to) {
    search.set("started_to", params.started_to);
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  return getBackendJson<UpstoxManagedBotPage>(`/api/v1/upstox/option-chain-bot/dashboard/jobs${suffix}`);
}

export async function fetchUpstoxManagedBotTrades(jobId: string, limit = 100) {
  const encoded = encodeURIComponent(jobId);
  return getBackendJson<UpstoxManagedBotTrade[]>(
    `/api/v1/upstox/option-chain-bot/jobs/${encoded}/trades?limit=${encodeURIComponent(String(limit))}`,
  );
}

export async function fetchUpstoxTradeHistoryAnalytics(params?: {
  start_date?: string;
  end_date?: string;
  execution_mode?: "all" | "paper" | "live";
  instrument_key?: string;
  strategy_id?: string;
  include_brokerage?: boolean;
  brokerage_per_trade?: number;
}) {
  const search = new URLSearchParams();
  if (params?.start_date) {
    search.set("start_date", params.start_date);
  }
  if (params?.end_date) {
    search.set("end_date", params.end_date);
  }
  if (params?.execution_mode && params.execution_mode !== "all") {
    search.set("execution_mode", params.execution_mode);
  }
  if (params?.instrument_key && params.instrument_key !== "all") {
    search.set("instrument_key", params.instrument_key);
  }
  if (params?.strategy_id && params.strategy_id !== "all") {
    search.set("strategy_id", params.strategy_id);
  }
  if (params?.include_brokerage) {
    search.set("include_brokerage", "true");
  }
  if (params?.brokerage_per_trade != null) {
    search.set("brokerage_per_trade", String(params.brokerage_per_trade));
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  return getBackendJson<UpstoxTradeHistoryAnalytics>(`/api/v1/upstox/option-chain-bot/trade-history${suffix}`);
}

export async function fetchUpstoxIndexAutoLaunchStatus() {
  return getBackendJson<UpstoxIndexAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/index-auto-launch");
}

export async function enableUpstoxIndexAutoLaunch() {
  return postBackendJson<UpstoxIndexAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/index-auto-launch/enable");
}

export async function disableUpstoxIndexAutoLaunch() {
  return postBackendJson<UpstoxIndexAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/index-auto-launch/disable");
}

export async function syncUpstoxIndexAutoLaunch() {
  return postBackendJson<UpstoxIndexAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/index-auto-launch/sync");
}

export async function setUpstoxIndexAutoLaunchStrategy(
  instrument_key: string,
  side: "call" | "put",
  strategy_id: string,
) {
  return postBackendJsonWithBody<
    UpstoxIndexAutoLaunchStatus,
    { instrument_key: string; side: "call" | "put"; strategy_id: string }
  >("/api/v1/upstox/option-chain-bot/index-auto-launch/strategy", {
    instrument_key,
    side,
    strategy_id,
  });
}

export async function setUpstoxIndexAutoLaunchDefaultStrategies(payload: {
  call_strategy_id?: string | null;
  put_strategy_id?: string | null;
  enabled_call_strategy_ids?: string[] | null;
  enabled_put_strategy_ids?: string[] | null;
  per_index_strategy_overrides?: Record<string, { call?: string[]; put?: string[] }> | null;
  apply_to_targets?: boolean;
  execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
  enabled_strategy_basket_ids?: string[] | null;
  candle_interval?: "1" | "3" | "5" | "15" | null;
}) {
  return postBackendJsonWithBody<
    UpstoxIndexAutoLaunchStatus,
    {
      call_strategy_id?: string | null;
      put_strategy_id?: string | null;
      enabled_call_strategy_ids?: string[] | null;
      enabled_put_strategy_ids?: string[] | null;
      per_index_strategy_overrides?: Record<string, { call?: string[]; put?: string[] }> | null;
      apply_to_targets?: boolean;
      execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
      enabled_strategy_basket_ids?: string[] | null;
      candle_interval?: "1" | "3" | "5" | "15" | null;
    }
  >("/api/v1/upstox/option-chain-bot/index-auto-launch/default-strategies", payload);
}

export async function fetchUpstoxStockAutoLaunchStatus() {
  return getBackendJson<UpstoxStockAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/stock-auto-launch");
}

export async function enableUpstoxStockAutoLaunch() {
  return postBackendJson<UpstoxStockAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/stock-auto-launch/enable");
}

export async function disableUpstoxStockAutoLaunch() {
  return postBackendJson<UpstoxStockAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/stock-auto-launch/disable");
}

export async function syncUpstoxStockAutoLaunch() {
  return postBackendJson<UpstoxStockAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/stock-auto-launch/sync");
}

export async function setUpstoxStockAutoLaunchInstruments(instrument_keys: string[]) {
  return postBackendJsonWithBody<UpstoxStockAutoLaunchStatus, { instrument_keys: string[] }>(
    "/api/v1/upstox/option-chain-bot/stock-auto-launch/instruments",
    { instrument_keys },
  );
}

export async function setUpstoxStockAutoLaunchTimeframe(candle_interval: "1" | "3" | "5" | "15") {
  return postBackendJsonWithBody<UpstoxStockAutoLaunchStatus, { candle_interval: "1" | "3" | "5" | "15" }>(
    "/api/v1/upstox/option-chain-bot/stock-auto-launch/timeframe",
    { candle_interval },
  );
}

export async function startUpstoxManagedBot(payload: UpstoxManagedBotStartRequest) {
  return postBackendJsonWithBody<UpstoxManagedBotJob, UpstoxManagedBotStartRequest>(
    "/api/v1/upstox/option-chain-bot/jobs/start",
    payload,
  );
}

export async function stopUpstoxManagedBot(jobId: string) {
  return postBackendJson<UpstoxManagedBotJob>(`/api/v1/upstox/option-chain-bot/jobs/${jobId}/stop`);
}

export async function squareOffUpstoxManagedBot(jobId: string) {
  return postBackendJson<UpstoxManagedBotJob>(`/api/v1/upstox/option-chain-bot/jobs/${jobId}/square-off`);
}

export async function setUpstoxManagedBotMode(jobId: string, payload: { execution_mode: "paper" | "live" }) {
  const encoded = encodeURIComponent(jobId);
  return postBackendJsonWithBody<UpstoxManagedBotJob, { execution_mode: "paper" | "live" }>(
    `/api/v1/upstox/option-chain-bot/jobs/${encoded}/mode`,
    payload,
  );
}

export async function deleteUpstoxManagedBot(jobId: string) {
  return deleteBackendJson<UpstoxManagedBotDeleteResponse>(
    `/api/v1/upstox/option-chain-bot/jobs/${encodeURIComponent(jobId)}`,
  );
}

export async function bulkDeleteUpstoxManagedBots(jobIds: string[]) {
  return postBackendJsonWithBody<
    UpstoxManagedBotBulkDeleteResponse,
    { job_ids: string[] }
  >("/api/v1/upstox/option-chain-bot/jobs/bulk-delete", {
    job_ids: jobIds,
  });
}

export async function deleteAllUpstoxManagedBotHistory() {
  return deleteBackendJson<UpstoxManagedBotBulkDeleteResponse>(
    "/api/v1/upstox/option-chain-bot/jobs/history",
  );
}

export async function previewUpstoxOptionChainBot(payload: UpstoxOptionChainBotRunRequest) {
  return postBackendJsonWithBody<UpstoxOptionChainBotPreviewResponse, UpstoxOptionChainBotRunRequest>(
    "/api/v1/upstox/option-chain-bot/preview",
    payload,
  );
}

export async function runUpstoxOptionChainBacktest(payload: UpstoxOptionChainBacktestRunRequest) {
  return postBackendJsonWithBody<UpstoxOptionChainBacktestRunResponse, UpstoxOptionChainBacktestRunRequest>(
    "/api/v1/upstox/option-chain-backtest/run",
    payload,
  );
}

export async function fetchUpstoxBacktestChartCandles(payload: UpstoxBacktestChartCandlesRequest) {
  return postBackendJsonWithBody<UpstoxBacktestChartCandlesResponse, UpstoxBacktestChartCandlesRequest>(
    "/api/v1/upstox/option-chain-backtest/chart-candles",
    payload,
  );
}

export async function fetchEquityCatalog() {
  return getBackendJson<EquityCatalogResponse>("/api/v1/equity/catalog");
}

export async function fetchEquityStrategies() {
  return getBackendJson<EquityStrategyItem[]>("/api/v1/equity/strategies");
}

export async function startEquityBot(payload: EquityBotRunRequest) {
  return postBackendJsonWithBody<EquityManagedJob, EquityBotRunRequest>(
    "/api/v1/equity/jobs/run",
    payload,
  );
}

export async function fetchEquityDashboardSummary() {
  return getBackendJson<EquityDashboardSummary>("/api/v1/equity/dashboard/summary");
}

export async function fetchEquityDashboardJobs(params?: {
  status_group?: "all" | "active" | "history";
  page?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status_group) {
    search.set("status_group", params.status_group);
  }
  if (params?.page != null) {
    search.set("page", String(params.page));
  }
  if (params?.limit != null) {
    search.set("limit", String(params.limit));
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  return getBackendJson<{
    items: EquityManagedJob[];
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
  }>(`/api/v1/equity/dashboard/jobs${suffix}`);
}

export async function fetchEquityJobDetail(jobId: string) {
  const encoded = encodeURIComponent(jobId);
  return getBackendJson<EquityManagedJob>(`/api/v1/equity/jobs/${encoded}`);
}

export async function stopEquityJob(jobId: string) {
  const encoded = encodeURIComponent(jobId);
  return postBackendJson<EquityManagedJob>(`/api/v1/equity/jobs/${encoded}/stop`);
}

export async function squareOffEquityJob(jobId: string) {
  const encoded = encodeURIComponent(jobId);
  return postBackendJson<EquityManagedJob>(`/api/v1/equity/jobs/${encoded}/square-off`);
}

export async function deleteEquityJob(jobId: string) {
  const encoded = encodeURIComponent(jobId);
  return deleteBackend(`/api/v1/equity/jobs/${encoded}`);
}

export async function bulkDeleteEquityJobs(jobIds: string[]) {
  return postBackendJsonWithBody<{ deleted_count: number; failed_count: number }, { job_ids: string[] }>(
    "/api/v1/equity/jobs/bulk-delete",
    { job_ids: jobIds },
  );
}

export async function deleteAllEquityHistory() {
  return postBackendJson<{ deleted_count: number }>("/api/v1/equity/jobs/delete-all-history");
}

export async function fetchEquityTradeHistory(params?: {
  start_date?: string;
  end_date?: string;
  execution_mode?: "all" | "paper" | "live";
  category?: string;
  symbol?: string;
  strategy_id?: string;
}) {
  const search = new URLSearchParams();
  if (params?.start_date) {
    search.set("start_date", params.start_date);
  }
  if (params?.end_date) {
    search.set("end_date", params.end_date);
  }
  if (params?.execution_mode && params.execution_mode !== "all") {
    search.set("execution_mode", params.execution_mode);
  }
  if (params?.category && params.category !== "all") {
    search.set("category", params.category);
  }
  if (params?.symbol && params.symbol !== "all") {
    search.set("symbol", params.symbol);
  }
  if (params?.strategy_id && params.strategy_id !== "all") {
    search.set("strategy_id", params.strategy_id);
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  return getBackendJson<EquityTradeHistoryAnalytics>(`/api/v1/equity/trade-history${suffix}`);
}

export async function fetchEquityAutoLaunchStatus() {
  return getBackendJson<EquityAutoLaunchStatus>("/api/v1/equity/auto-launch/status");
}

export async function enableEquityAutoLaunch() {
  return postBackendJson<EquityAutoLaunchStatus>("/api/v1/equity/auto-launch/enable");
}

export async function disableEquityAutoLaunch() {
  return postBackendJson<EquityAutoLaunchStatus>("/api/v1/equity/auto-launch/disable");
}

export async function launchNifty50PaperFleet(payload?: {
  strategy_id?: string;
  candle_interval?: string;
  target_pct?: number;
  sl_pct?: number;
  allocated_capital?: number;
}) {
  return postBackendJsonWithBody<
    { launched_count: number; already_active_count: number; total_universe: number; strategy_id: string },
    typeof payload
  >("/api/v1/equity/auto-launch/nifty50", payload || {});
}

export async function stopNifty50PaperFleet() {
  return postBackendJson<{ stopped_count: number }>("/api/v1/equity/auto-launch/stop-fleet");
}

export async function squareOffNifty50PaperFleet() {
  return postBackendJson<{ squared_off_count: number }>("/api/v1/equity/auto-launch/square-off-fleet");
}

export async function updateEquityAutoLaunchConfig(payload: Record<string, unknown>) {
  return postBackendJsonWithBody<EquityAutoLaunchStatus, typeof payload>(
    "/api/v1/equity/auto-launch/config",
    payload,
  );
}
