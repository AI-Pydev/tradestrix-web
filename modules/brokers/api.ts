import {
    BACKEND_BASE_URL,
    buildAuthorizedHeaders,
    deleteBackendJson,
    getBackendJson,
    postBackendJson,
    postBackendJsonWithBody,
    putBackendJsonWithBody,
    throwIfApiError,
} from "@/platform/http/client";
import type {
    BrokerAuthStartResponse,
    BrokerCallbackResult,
    BrokerConnection,
    BrokerHealth,
    KotakManualAuthRequest,
    ShoonyaManualAuthRequest,
    SymbolMapResponse,
    SymbolMappingRow,
    SymbolMappingUpsert,
} from "./types";

export const BROKER_HEALTH_LIST_ENDPOINTS = [
  "/api/v1/broker-health",
  "/api/v1/brokers/health",
] as const;

export const BROKER_HEALTH_DETAIL_ENDPOINTS = [
  "/api/v1/broker-health/{brokerId}",
  "/api/v1/brokers/{brokerId}/health",
] as const;

export const BROKER_HEALTH_BROKERS = [
  "dhan",
  "kotakneo",
  "upstox",
  "kite",
  "shoonya",
] as const;

export function canonicalHealthBrokerId(value: string): string {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (normalized === "kotak" || normalized === "kotakneo") {
    return "kotakneo";
  }
  if (normalized === "dhan") {
    return "dhan";
  }
  if (normalized === "upstox") {
    return "upstox";
  }
  if (normalized === "kite") {
    return "kite";
  }
  return normalized;
}

export async function fetchBrokerConnections() {
  return getBackendJson<BrokerConnection[]>("/api/v1/brokers");
}

export async function fetchSymbolMap() {
  return getBackendJson<SymbolMapResponse>("/api/v1/brokers/symbol-map");
}

export async function upsertSymbolMapping(payload: SymbolMappingUpsert) {
  return putBackendJsonWithBody<SymbolMappingRow, SymbolMappingUpsert>(
    "/api/v1/brokers/symbol-map",
    payload,
  );
}

export async function deleteSymbolMapping(canonicalKey: string) {
  return deleteBackendJson<{ status: string; canonical_key: string }>(
    `/api/v1/brokers/symbol-map?canonical_key=${encodeURIComponent(canonicalKey)}`,
  );
}

export async function fetchBrokerHealth(refresh = false): Promise<BrokerHealth[]> {
  const batchErrors: string[] = [];

  for (const endpoint of BROKER_HEALTH_LIST_ENDPOINTS) {
    try {
      return await fetchBrokerHealthList(endpoint, refresh, 45000);
    } catch (error) {
      batchErrors.push(error instanceof Error ? error.message : "Unknown health list error");
    }
  }

  const settled = await Promise.allSettled(
    BROKER_HEALTH_BROKERS.map(async (brokerId) => {
      for (const endpointTemplate of BROKER_HEALTH_DETAIL_ENDPOINTS) {
        try {
          const endpoint = endpointTemplate.replace("{brokerId}", encodeURIComponent(brokerId));
          return await fetchBrokerHealthItem(endpoint, refresh, 15000);
        } catch {
          // Try next endpoint template.
        }
      }
      throw new Error(`No reachable health endpoint for ${brokerId}`);
    }),
  );

  const health = settled
    .filter((item): item is PromiseFulfilledResult<BrokerHealth> => item.status === "fulfilled")
    .map((item) => item.value);

  if (health.length > 0) {
    return health;
  }

  const notFoundOnly = [...batchErrors, ...settled
    .filter((item): item is PromiseRejectedResult => item.status === "rejected")
    .map((item) => (item.reason instanceof Error ? item.reason.message : String(item.reason)))]
    .every((message) => /not found|404/i.test(message));

  if (notFoundOnly) {
    try {
      const connections = await getBackendJson<BrokerConnection[]>("/api/v1/brokers");
      return mapBrokerConnectionsToHealth(connections);
    } catch {
      return unavailableBrokerHealthResponse(
        "Broker health endpoints are unavailable on the current backend.",
      );
    }
  }

  const reason = batchErrors[0] ?? "Health endpoints unavailable";
  throw new Error(`Broker health refresh failed. ${reason}`);
}

export async function fetchBrokerHealthByBroker(brokerId: string, refresh = false): Promise<BrokerHealth> {
  const canonicalBrokerId = canonicalHealthBrokerId(brokerId);
  const detailErrors: string[] = [];

  for (const endpointTemplate of BROKER_HEALTH_DETAIL_ENDPOINTS) {
    try {
      const endpoint = endpointTemplate.replace("{brokerId}", encodeURIComponent(canonicalBrokerId));
      return await fetchBrokerHealthItem(endpoint, refresh, 15000);
    } catch (error) {
      detailErrors.push(error instanceof Error ? error.message : "Unknown broker health error");
    }
  }

  const notFoundOnly = detailErrors.length > 0 && detailErrors.every((message) => /not found|404/i.test(message));
  if (notFoundOnly) {
    try {
      const connection = await getBackendJson<BrokerConnection>(
        `/api/v1/brokers/${encodeURIComponent(canonicalBrokerId)}`,
      );
      return mapBrokerConnectionToHealth(connection, canonicalBrokerId);
    } catch {
      return unavailableBrokerHealthResponse(
        "Broker health endpoint is unavailable on the current backend.",
      ).find((item) => item.broker_id === canonicalBrokerId) ?? {
        broker_id: canonicalBrokerId,
        display_name: canonicalBrokerId,
        status: "unknown",
        valid: false,
        configured: false,
        token_present: false,
        checked_at: new Date().toISOString(),
        latency_ms: null,
        message: "Broker health endpoint is unavailable on the current backend.",
      };
    }
  }

  const reason = detailErrors[0] ?? "Health endpoint unavailable";
  throw new Error(`Broker health refresh failed for ${canonicalBrokerId}. ${reason}`);
}

export function mapBrokerConnectionToHealth(item: BrokerConnection | undefined, brokerId: string): BrokerHealth {
  const connected = Boolean(item?.connected);
  const configured = Boolean(item?.configured);
  const tokenPresent = Boolean(item?.access_token_present);
  const valid = connected || tokenPresent;
  let status: BrokerHealth["status"] = "red";
  if (valid) {
    status = "green";
  } else if (configured) {
    status = "unknown";
  }

  let message = "Broker configuration missing (fallback check).";
  if (valid) {
    message = "Connection-based fallback check passed (health endpoint unavailable).";
  } else if (configured) {
    message = "Configured but not connected (fallback check).";
  }

  return {
    broker_id: brokerId,
    display_name: item?.display_name ?? brokerId,
    status,
    valid,
    configured,
    token_present: tokenPresent,
    checked_at: new Date().toISOString(),
    latency_ms: null,
    message,
  };
}

export function mapBrokerConnectionsToHealth(connections: BrokerConnection[]): BrokerHealth[] {
  const connectionMap = new Map(
    connections.map((item) => [String(item.broker_id || "").trim().toLowerCase(), item]),
  );

  return BROKER_HEALTH_BROKERS.map((brokerId) => {
    const item = connectionMap.get(canonicalHealthBrokerId(brokerId));
    return mapBrokerConnectionToHealth(item, brokerId);
  });
}

export function unavailableBrokerHealthResponse(message: string): BrokerHealth[] {
  const now = new Date().toISOString();
  return BROKER_HEALTH_BROKERS.map((brokerId) => ({
    broker_id: brokerId,
    display_name: brokerId,
    status: "unknown" as const,
    valid: false,
    configured: false,
    token_present: false,
    checked_at: now,
    latency_ms: null,
    message,
  }));
}

export async function fetchBrokerHealthList(endpoint: string, refresh: boolean, timeoutMs: number): Promise<BrokerHealth[]> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `${BACKEND_BASE_URL}${endpoint}?refresh=${encodeURIComponent(String(refresh))}`,
      {
        cache: "no-store",
        headers: buildAuthorizedHeaders(),
        signal: controller.signal,
      },
    );
    await throwIfApiError(response);
    return (await response.json()) as BrokerHealth[];
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function fetchBrokerHealthItem(endpoint: string, refresh: boolean, timeoutMs: number): Promise<BrokerHealth> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `${BACKEND_BASE_URL}${endpoint}?refresh=${encodeURIComponent(String(refresh))}`,
      {
        cache: "no-store",
        headers: buildAuthorizedHeaders(),
        signal: controller.signal,
      },
    );
    await throwIfApiError(response);
    return (await response.json()) as BrokerHealth;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function startBrokerAuth(brokerId: string) {
  return postBackendJson<BrokerAuthStartResponse>(`/api/v1/brokers/${brokerId}/auth/start`);
}

export async function disconnectBroker(brokerId: string) {
  return postBackendJson<BrokerConnection>(`/api/v1/brokers/${brokerId}/disconnect`);
}

export async function authenticateKotakBroker(payload: KotakManualAuthRequest) {
  return postBackendJsonWithBody<BrokerCallbackResult, KotakManualAuthRequest>(
    "/api/v1/brokers/kotakneo/manual/json",
    payload,
  );
}

export async function authenticateShoonyaBroker(payload: ShoonyaManualAuthRequest) {
  return postBackendJsonWithBody<BrokerCallbackResult, ShoonyaManualAuthRequest>(
    "/api/v1/brokers/shoonya/manual/json",
    payload,
  );
}

