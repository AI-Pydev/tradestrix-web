import {
    deleteBackendJson,
    getBackendJson,
    postBackendJson,
    postBackendJsonWithBody,
} from "@/platform/http/client";
import type {
    CryptoJobLog,
    CryptoJobStartRequest,
    CryptoJobsSummary,
    CryptoManagedJob,
    CryptoManagedTrade,
    CryptoOptimizationRequest,
    CryptoOptimizationResponse,
    DeltaCryptoDashboardResponse,
    DeltaDemoOrderRequest,
    DeltaDemoOrderResponse,
    DeltaDemoOrdersResponse,
    DeltaOptionChainRequest,
    DeltaOptionChainResponse,
    DeltaSavedStrategyRequest,
    DeltaSavedStrategyResponse,
    DeltaStrategyPreviewRequest,
    DeltaStrategyPreviewResponse,
    DeltaTradingViewTemplateRequest,
    DeltaTradingViewTemplateResponse,
} from "./types";

export async function fetchDeltaCryptoDashboard() {
  return getBackendJson<DeltaCryptoDashboardResponse>("/api/v1/crypto/delta/dashboard");
}

export async function fetchCryptoJobsSummary() {
  return getBackendJson<CryptoJobsSummary>("/api/v1/crypto-jobs/summary");
}

export async function listCryptoJobs() {
  return getBackendJson<CryptoManagedJob[]>("/api/v1/crypto-jobs");
}

export async function startCryptoJob(payload: CryptoJobStartRequest) {
  return postBackendJsonWithBody<CryptoManagedJob, CryptoJobStartRequest>("/api/v1/crypto-jobs", payload);
}

export async function stopCryptoJob(jobId: string) {
  return postBackendJson<CryptoManagedJob>(`/api/v1/crypto-jobs/${encodeURIComponent(jobId)}/stop`);
}

export async function listCryptoJobTrades(jobId?: string) {
  const suffix = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  return getBackendJson<CryptoManagedTrade[]>(`/api/v1/crypto-jobs/trades${suffix}`);
}

export async function listCryptoJobLogs(jobId: string, limit = 200) {
  return getBackendJson<CryptoJobLog[]>(
    `/api/v1/crypto-jobs/${encodeURIComponent(jobId)}/logs?limit=${encodeURIComponent(String(limit))}`,
  );
}

export async function stopAllCryptoJobs() {
  return postBackendJson<{ status: string }>("/api/v1/crypto-jobs/emergency/stop-all");
}

export async function optimizeCryptoStrategy(payload: CryptoOptimizationRequest) {
  return postBackendJsonWithBody<CryptoOptimizationResponse, CryptoOptimizationRequest>(
    "/api/v1/crypto/backtest/optimize",
    payload,
  );
}

export async function previewDeltaOptionChain(payload: DeltaOptionChainRequest) {
  return postBackendJsonWithBody<DeltaOptionChainResponse, DeltaOptionChainRequest>(
    "/api/v1/crypto/delta/option-chain",
    payload,
  );
}

export async function previewDeltaStrategy(payload: DeltaStrategyPreviewRequest) {
  return postBackendJsonWithBody<DeltaStrategyPreviewResponse, DeltaStrategyPreviewRequest>(
    "/api/v1/crypto/delta/strategy-preview",
    payload,
  );
}

export async function fetchDeltaDemoOrders() {
  return getBackendJson<DeltaDemoOrdersResponse>("/api/v1/crypto/delta/demo-orders");
}

export async function placeDeltaDemoOrder(payload: DeltaDemoOrderRequest) {
  return postBackendJsonWithBody<DeltaDemoOrderResponse, DeltaDemoOrderRequest>(
    "/api/v1/crypto/delta/demo-order",
    payload,
  );
}

export async function listDeltaSavedStrategies() {
  return getBackendJson<DeltaSavedStrategyResponse[]>("/api/v1/crypto/strategies");
}

export async function createDeltaSavedStrategy(payload: DeltaSavedStrategyRequest) {
  return postBackendJsonWithBody<DeltaSavedStrategyResponse, DeltaSavedStrategyRequest>(
    "/api/v1/crypto/strategies",
    payload,
  );
}

export async function deleteDeltaSavedStrategy(strategyId: string) {
  return deleteBackendJson<{ status: string }>(`/api/v1/crypto/strategies/${strategyId}`);
}

export async function createDeltaTradingViewTemplate(payload: DeltaTradingViewTemplateRequest) {
  return postBackendJsonWithBody<DeltaTradingViewTemplateResponse, DeltaTradingViewTemplateRequest>(
    "/api/v1/crypto/delta/tradingview-template",
    payload,
  );
}

export async function listDeltaTradingViewTemplates() {
  return getBackendJson<DeltaTradingViewTemplateResponse[]>("/api/v1/crypto/delta/tradingview-templates");
}

export async function deleteDeltaTradingViewTemplate(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return deleteBackendJson<{ status: string }>(`/api/v1/crypto/delta/tradingview-templates/${encoded}`);
}

