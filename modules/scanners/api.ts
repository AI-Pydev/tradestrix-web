import {
    getBackendJson,
    postBackendJson,
    postBackendJsonWithBody,
    putBackendJsonWithBody,
} from "@/platform/http/client";
import type {
    OpportunityScannerRequest,
    OpportunityScannerResponse,
    ScannerPaperAutoEntrySettings,
    ScannerPaperAutoEntryStatus,
    ScannerPaperLabDashboard,
    ScannerPaperTrade,
    ScannerPaperTradeCloseRequest,
    ScannerPaperTradeCreateRequest,
    SupportResistanceAutoEntrySettings,
    SupportResistanceAutoEntryStatus,
    SupportResistanceScannerRequest,
    SupportResistanceScannerResponse,
    SupportResistanceTradeActionRequest,
    SupportResistanceTradeCloseRequest,
    SupportResistanceTradeLabDashboard,
    SupportResistanceTradeRecord,
} from "./types";

export async function runOpportunityScanner(payload: OpportunityScannerRequest) {
  return postBackendJsonWithBody<OpportunityScannerResponse, OpportunityScannerRequest>(
    "/api/v1/opportunity-scanner/scan",
    payload,
  );
}

export async function runSupportResistanceScanner(payload: SupportResistanceScannerRequest) {
  return postBackendJsonWithBody<SupportResistanceScannerResponse, SupportResistanceScannerRequest>(
    "/api/v1/support-resistance-scanner/scan",
    payload,
  );
}

export async function fetchSupportResistanceTradeLabDashboard() {
  return getBackendJson<SupportResistanceTradeLabDashboard>("/api/v1/support-resistance-scanner/trade-lab/dashboard");
}

export async function updateSupportResistanceAutoEntrySettings(payload: SupportResistanceAutoEntrySettings) {
  return putBackendJsonWithBody<SupportResistanceAutoEntrySettings, SupportResistanceAutoEntrySettings>(
    "/api/v1/support-resistance-scanner/trade-lab/auto-entry",
    payload,
  );
}

export async function runSupportResistanceAutoEntryNow() {
  return postBackendJson<SupportResistanceAutoEntryStatus>("/api/v1/support-resistance-scanner/trade-lab/auto-entry/run");
}

export async function createSupportResistanceTrade(payload: SupportResistanceTradeActionRequest) {
  return postBackendJsonWithBody<SupportResistanceTradeRecord, SupportResistanceTradeActionRequest>(
    "/api/v1/support-resistance-scanner/trade-lab/trades",
    payload,
  );
}

export async function closeSupportResistanceTrade(tradeId: string, payload: SupportResistanceTradeCloseRequest) {
  return postBackendJsonWithBody<SupportResistanceTradeRecord, SupportResistanceTradeCloseRequest>(
    `/api/v1/support-resistance-scanner/trade-lab/trades/${tradeId}/close`,
    payload,
  );
}

export async function fetchScannerPaperLabDashboard() {
  return getBackendJson<ScannerPaperLabDashboard>("/api/v1/scanner-paper-lab/dashboard");
}

export async function updateScannerPaperAutoEntrySettings(payload: ScannerPaperAutoEntrySettings) {
  return putBackendJsonWithBody<ScannerPaperAutoEntrySettings, ScannerPaperAutoEntrySettings>(
    "/api/v1/scanner-paper-lab/auto-entry",
    payload,
  );
}

export async function runScannerPaperAutoEntryNow() {
  return postBackendJson<ScannerPaperAutoEntryStatus>("/api/v1/scanner-paper-lab/auto-entry/run");
}

export async function createScannerPaperTrade(payload: ScannerPaperTradeCreateRequest) {
  return postBackendJsonWithBody<ScannerPaperTrade, ScannerPaperTradeCreateRequest>(
    "/api/v1/scanner-paper-lab/trades",
    payload,
  );
}

export async function closeScannerPaperTrade(tradeId: string, payload: ScannerPaperTradeCloseRequest) {
  return postBackendJsonWithBody<ScannerPaperTrade, ScannerPaperTradeCloseRequest>(
    `/api/v1/scanner-paper-lab/trades/${tradeId}/close`,
    payload,
  );
}

