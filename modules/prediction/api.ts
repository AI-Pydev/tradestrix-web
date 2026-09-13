/**
 * API client methods for the Real-time Multi-Factor Prediction Module.
 */

import { getBackendJson } from "@/platform/http/client";
import type {
  ConstituentsResponse,
  LiquidityResponse,
  OptionsSurfaceResponse,
  OrderFlowResponse,
  RealtimePredictionResponse,
} from "./types";

/**
 * Fetch a synthesized multi-factor prediction for a given symbol.
 */
export async function fetchRealtimePrediction(
  symbol: string,
  timeframe = "3m",
  horizon = 10,
): Promise<RealtimePredictionResponse> {
  return getBackendJson<RealtimePredictionResponse>(
    `/api/v1/prediction/realtime/${encodeURIComponent(symbol)}?timeframe=${timeframe}&horizon=${horizon}`,
  );
}

/**
 * Fetch real-time order flow and microstructure analytics.
 */
export async function fetchOrderFlowPrediction(
  symbol: string,
  bidVol = 185000,
  askVol = 142000,
): Promise<OrderFlowResponse> {
  return getBackendJson<OrderFlowResponse>(
    `/api/v1/prediction/order-flow/${encodeURIComponent(symbol)}?bid_vol=${bidVol}&ask_vol=${askVol}`,
  );
}

/**
 * Fetch institutional liquidity pools, sweeps, and Fair Value Gaps.
 */
export async function fetchLiquidityPrediction(
  symbol: string,
): Promise<LiquidityResponse> {
  return getBackendJson<LiquidityResponse>(
    `/api/v1/prediction/liquidity/${encodeURIComponent(symbol)}`,
  );
}

/**
 * Fetch Options Volatility Surface metrics, PCR, and dealer gamma exposure.
 */
export async function fetchOptionsSurfacePrediction(
  symbol: string,
  spot = 24500,
): Promise<OptionsSurfaceResponse> {
  return getBackendJson<OptionsSurfaceResponse>(
    `/api/v1/prediction/options-surface/${encodeURIComponent(symbol)}?spot=${spot}`,
  );
}

/**
 * Fetch heavyweight constituent breadth, momentum, and sector leadership for an index.
 */
export async function fetchConstituentsPrediction(
  indexSymbol: string,
): Promise<ConstituentsResponse> {
  return getBackendJson<ConstituentsResponse>(
    `/api/v1/prediction/constituents/${encodeURIComponent(indexSymbol)}`,
  );
}
