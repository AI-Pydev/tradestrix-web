import {
    deleteBackend,
    getBackendJson,
    patchBackendJsonWithBody,
    postBackendJson,
    postBackendJsonWithBody,
    putBackendJsonWithBody,
} from "@/platform/http/client";
import type {
    AutoQualificationSettings,
    PaperDiscoveryCandidates,
    QualificationCycleInstruments,
    QualificationCycleIssues,
    QualificationCycleStartRequest,
    QualificationCycleStatus,
    StrategyAnalysis,
    StrategyAnalysisRequest,
    StrategyAssignment,
    StrategyAssignmentBatch,
    StrategyAssignmentRunRequest,
    StrategyQualificationBatch,
    StrategyQualificationJob,
    StrategyQualificationRunRequest,
    StrategyQualificationRunResult,
    StrategyRegistryEntry,
    TradingViewAlertDashboardStats,
    TradingViewAlertTemplate,
    TradingViewAlertTemplateCreateRequest,
    TradingViewAlertTemplateDiagnostics,
    TradingViewAlertTemplateTestResponse,
    TradingViewAlertTemplateUpdateRequest,
    TradingViewPnlMode,
    TradingViewTradeHistoryAnalytics,
    TradingViewWebhookEvent,
} from "./types";

export async function listTradingViewAlertTemplates() {
  return getBackendJson<TradingViewAlertTemplate[]>("/api/v1/tradingview-alert-templates");
}

export async function fetchTradingViewAlertTemplateDiagnostics() {
  return getBackendJson<TradingViewAlertTemplateDiagnostics>("/api/v1/tradingview-alert-templates/diagnostics");
}

export async function fetchTradingViewAlertDashboardStats() {
  return getBackendJson<TradingViewAlertDashboardStats>("/api/v1/tradingview-alert-templates/dashboard");
}

export async function createTradingViewAlertTemplate(payload: TradingViewAlertTemplateCreateRequest) {
  return postBackendJsonWithBody<TradingViewAlertTemplate, TradingViewAlertTemplateCreateRequest>(
    "/api/v1/tradingview-alert-templates",
    payload,
  );
}

export async function updateTradingViewAlertTemplate(templateId: string, payload: TradingViewAlertTemplateUpdateRequest) {
  const encoded = encodeURIComponent(templateId);
  return patchBackendJsonWithBody<TradingViewAlertTemplate, TradingViewAlertTemplateUpdateRequest>(
    `/api/v1/tradingview-alert-templates/${encoded}`,
    payload,
  );
}

export async function deleteTradingViewAlertTemplate(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return deleteBackend(`/api/v1/tradingview-alert-templates/${encoded}`);
}

export async function regenerateTradingViewAlertTemplateToken(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplate>(`/api/v1/tradingview-alert-templates/${encoded}/regenerate-token`);
}

export async function regenerateTradingViewAlertTemplateStrategyId(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplate>(
    `/api/v1/tradingview-alert-templates/${encoded}/regenerate-strategy-id`,
  );
}

export async function testTradingViewAlertTemplateWebhook(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplateTestResponse>(
    `/api/v1/tradingview-alert-templates/${encoded}/test-webhook`,
  );
}

export async function setTradingViewAlertTemplateLive(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplate>(`/api/v1/tradingview-alert-templates/${encoded}/live`);
}

export async function setTradingViewAlertTemplatePaper(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplate>(`/api/v1/tradingview-alert-templates/${encoded}/paper`);
}

export async function fetchTradingViewAlertTemplateEvents(
  templateId: string,
  limit = 50,
  window: "today" | "all" = "all",
) {
  const encoded = encodeURIComponent(templateId);
  return getBackendJson<TradingViewWebhookEvent[]>(
    `/api/v1/tradingview-alert-templates/${encoded}/events?limit=${encodeURIComponent(String(limit))}&window=${encodeURIComponent(window)}`,
  );
}

export async function fetchTradingViewTradeHistoryAnalytics(params?: {
  start_date?: string;
  end_date?: string;
  execution_mode?: "all" | TradingViewPnlMode;
  instrument_key?: string;
  template_id?: string;
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
  if (params?.template_id && params.template_id !== "all") {
    search.set("template_id", params.template_id);
  }
  if (params?.include_brokerage) {
    search.set("include_brokerage", "true");
  }
  if (params?.brokerage_per_trade != null) {
    search.set("brokerage_per_trade", String(params.brokerage_per_trade));
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  return getBackendJson<TradingViewTradeHistoryAnalytics>(`/api/v1/tradingview-alert-templates/trade-history${suffix}`);
}

export async function fetchCurrentStrategyAssignments() {
  return getBackendJson<StrategyAssignment[]>("/api/v1/strategy-assignments/current");
}

export async function fetchLatestStrategyAssignmentBatch() {
  return getBackendJson<StrategyAssignmentBatch | null>("/api/v1/strategy-assignments/latest");
}

export async function runStrategyAssignments(payload: StrategyAssignmentRunRequest) {
  return postBackendJsonWithBody<StrategyAssignmentBatch, StrategyAssignmentRunRequest>(
    "/api/v1/strategy-assignments/run",
    payload,
  );
}

export async function runStrategyQualification(payload: StrategyQualificationRunRequest) {
  return postBackendJsonWithBody<StrategyQualificationBatch, StrategyQualificationRunRequest>(
    "/api/v1/strategy-qualification/run",
    payload,
  );
}

export async function enqueueStrategyQualification(payload: StrategyQualificationRunRequest) {
  return postBackendJsonWithBody<StrategyQualificationJob, StrategyQualificationRunRequest>(
    "/api/v1/strategy-qualification/run-async",
    payload,
  );
}

export async function runPaperDiscoveryQualification(payload: StrategyQualificationRunRequest) {
  return postBackendJsonWithBody<StrategyQualificationBatch, StrategyQualificationRunRequest>(
    "/api/v1/strategy-qualification/run-paper-discovery",
    { ...payload, candidate_scope: "paper_discovery" },
  );
}

export async function enqueuePaperDiscoveryQualification(payload: StrategyQualificationRunRequest) {
  return postBackendJsonWithBody<StrategyQualificationJob, StrategyQualificationRunRequest>(
    "/api/v1/strategy-qualification/run-paper-discovery-async",
    { ...payload, candidate_scope: "paper_discovery" },
  );
}

export async function fetchStrategyQualificationJob(taskId: string) {
  return getBackendJson<StrategyQualificationJob>(
    `/api/v1/strategy-qualification/jobs/${encodeURIComponent(taskId)}`,
  );
}

export async function fetchStrategyQualificationRegistry() {
  return getBackendJson<StrategyRegistryEntry[]>("/api/v1/strategy-qualification/registry");
}

export async function fetchStrategyQualificationResults(limit = 200) {
  return getBackendJson<StrategyQualificationRunResult[]>(
    `/api/v1/strategy-qualification/results?limit=${limit}`,
  );
}

export async function fetchStrategyQualificationCandidates(executionMode: "paper" | "live" | "all" = "paper") {
  return getBackendJson<Record<string, { call: StrategyRegistryEntry[]; put: StrategyRegistryEntry[] }>>(
    `/api/v1/strategy-qualification/auto-launch-candidates?execution_mode=${encodeURIComponent(executionMode)}`,
  );
}

export async function fetchAutoQualificationSettings() {
  return getBackendJson<AutoQualificationSettings>(
    "/api/v1/strategy-qualification/auto-settings",
  );
}

export async function updateAutoQualificationSettings(autoEnabled: boolean) {
  return putBackendJsonWithBody<AutoQualificationSettings, { auto_enabled: boolean }>(
    "/api/v1/strategy-qualification/auto-settings",
    { auto_enabled: autoEnabled },
  );
}

export async function fetchQualificationCycle() {
  return getBackendJson<QualificationCycleStatus>(
    "/api/v1/strategy-qualification/cycle",
  );
}

export async function stopQualificationCycle() {
  return postBackendJson<QualificationCycleStatus>(
    "/api/v1/strategy-qualification/cycle/stop",
  );
}

export async function pauseQualificationCycle() {
  return postBackendJson<QualificationCycleStatus>(
    "/api/v1/strategy-qualification/cycle/pause",
  );
}

export async function resumeQualificationCycle() {
  return postBackendJson<QualificationCycleStatus>(
    "/api/v1/strategy-qualification/cycle/resume",
  );
}

export async function startQualificationCycle(payload: QualificationCycleStartRequest) {
  return postBackendJsonWithBody<QualificationCycleStatus, QualificationCycleStartRequest>(
    "/api/v1/strategy-qualification/cycle/start",
    payload,
  );
}

export async function fetchQualificationCycleIssues() {
  return getBackendJson<QualificationCycleIssues>(
    "/api/v1/strategy-qualification/cycle/issues",
  );
}

export async function fetchQualificationCycleInstruments() {
  return getBackendJson<QualificationCycleInstruments>(
    "/api/v1/strategy-qualification/cycle/instruments",
  );
}

export async function fetchPaperDiscoveryCandidates(params?: {
  min_win_rate?: number;
  min_net_pnl?: number;
  min_trades?: number;
  include_indices?: boolean;
  include_stocks?: boolean;
  limit?: number;
}) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  });
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return getBackendJson<PaperDiscoveryCandidates>(
    `/api/v1/strategy-qualification/paper-discovery-candidates${suffix}`,
  );
}

export async function runStrategyAnalysis(payload: StrategyAnalysisRequest) {
  return postBackendJsonWithBody<StrategyAnalysis, StrategyAnalysisRequest>(
    `/api/research/strategy-analysis`,
    payload,
  );
}

export async function listStrategyAnalyses(strategyId?: string) {
  const query = strategyId
    ? `?strategy_id=${encodeURIComponent(strategyId)}`
    : "";
  return getBackendJson<StrategyAnalysis[]>(
    `/api/research/strategy-analysis${query}`,
  );
}

export async function getStrategyAnalysis(analysisId: number) {
  return getBackendJson<StrategyAnalysis>(
    `/api/research/strategy-analysis/${analysisId}`,
  );
}

