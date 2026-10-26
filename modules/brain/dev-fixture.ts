/**
 * ============================================================================
 * DEV PRESENTATION STATE — NOT BACKEND TRUTH
 * ============================================================================
 *
 * Every value below is a hand-maintained reflection of the Production
 * Foundation tracker. Nothing here is read from a database, a process, a
 * broker or an HTTP endpoint. It exists so the /brain surface can be reviewed
 * visually while backend implementation continues in parallel.
 *
 * RULES for editing this file:
 *   1. Never add a metric that a real endpoint does not yet produce
 *      (no CPU, latency, DB ping, process counts, trade counts,
 *      probabilities, health percentages).
 *   2. Only use the truthful status labels defined in `./types`.
 *   3. When a real status endpoint exists, delete this file and resolve
 *      `BrainStatusSnapshot` from the backend instead.
 * ============================================================================
 */

import type { BrainStatusSnapshot } from "./types";

export const DEV_PRESENTATION_STATE: BrainStatusSnapshot = {
  source: "dev-fixture",
  sourceLabel: "DEV PRESENTATION STATE — not backend truth",

  // Production Foundation tracker: P0..P12.
  foundation: [
    { id: "P0", label: "Configuration / Contracts", state: "ACCEPTED" },
    { id: "P1", label: "PostgreSQL Schema Design", state: "ACCEPTED" },
    { id: "P2", label: "Persistence Adapters", state: "NOT_IMPLEMENTED" },
    { id: "P3", label: "Concurrency Primitives", state: "NOT_IMPLEMENTED" },
    { id: "P4", label: "JC-1 Pinned Session", state: "IN_PROGRESS" },
    { id: "P5", label: "SA Production Process", state: "NOT_IMPLEMENTED" },
    { id: "P6", label: "Recovery", state: "NOT_IMPLEMENTED" },
    { id: "P7", label: "Observability / Health", state: "NOT_IMPLEMENTED" },
    { id: "P8", label: "Integration / Failure Injection", state: "NOT_IMPLEMENTED" },
    { id: "P9", label: "Capacity", state: "NOT_IMPLEMENTED" },
    { id: "P10", label: "D-5 Failover Verification", state: "NOT_IMPLEMENTED" },
    { id: "P11", label: "IAM Handoff", state: "NOT_IMPLEMENTED" },
    { id: "P12", label: "Controlled-Live Evidence", state: "NOT_IMPLEMENTED" },
  ],

  // Brain intelligence modules. `detail` carries dependency/scope, not metrics.
  modules: [
    {
      id: "market-intelligence",
      name: "Market Intelligence",
      description: "Regime, breadth and structural context for the session.",
      state: "IN_DEVELOPMENT",
      detail: "M1 snapshot scope",
    },
    {
      id: "harmonic-intelligence",
      name: "Harmonic Intelligence",
      description: "Harmonic pattern detection and predictive D projection.",
      state: "AVAILABLE",
      detail: "Shipped surface",
    },
    {
      id: "trendline-intelligence",
      name: "Trendline Intelligence",
      description: "Dynamic trendlines and distance-to-obstacle headroom.",
      state: "AVAILABLE",
      detail: "Shipped surface",
    },
    {
      id: "sr-intelligence",
      name: "Support / Resistance Intelligence",
      description: "Multi-timeframe S/R zones and reaction levels.",
      state: "AVAILABLE",
      detail: "Shipped surface",
    },
    {
      id: "realtime-prediction",
      name: "Real-Time Prediction",
      description: "Forward-looking directional estimation per instrument.",
      state: "IN_DEVELOPMENT",
      detail: "Model contract not finalised",
    },
    {
      id: "risk-intelligence",
      name: "Risk Intelligence",
      description: "Stop placement, exposure caps and correlation control.",
      state: "IN_DEVELOPMENT",
      detail: "Portfolio guard under review",
    },
    {
      id: "execution-intelligence",
      name: "Execution Intelligence",
      description: "Order routing, fill quality and broker fallback.",
      state: "IN_DEVELOPMENT",
      detail: "Live options path only",
    },
    {
      id: "supersession-authorization",
      name: "Supersession Authorization",
      description: "Governs which engine may supersede an active decision.",
      state: "FOUNDATION_BLOCKED",
      detail: "Requires P4 / P5",
    },
    {
      id: "learning-adaptation",
      name: "Learning / Adaptation",
      description: "Outcome feedback that retunes future decisions.",
      state: "PLANNED",
      detail: "Requires P2 persistence",
    },
  ],

  // Architecture decisions (RESOLVED/IN_PROGRESS) and verifiable runtime facts.
  authorization: [
    { id: "architecture", label: "Architecture", state: "RESOLVED" },
    { id: "d3", label: "D3 Process / Invocation Architecture", state: "RESOLVED" },
    { id: "d4", label: "D4 Driver / Session Pinning Architecture", state: "RESOLVED" },
    { id: "p4-impl", label: "P4 Implementation", state: "IN_PROGRESS" },
    { id: "pg-connected", label: "PostgreSQL Connected", state: "NO" },
    { id: "schema-migrated", label: "Schema Migrated", state: "NO" },
    { id: "sa-process", label: "Dedicated SA Process Running", state: "NO" },
    { id: "uds", label: "UDS Invocation", state: "NOT_IMPLEMENTED" },
    { id: "controlled-live", label: "Controlled Live", state: "NOT_ESTABLISHED" },
  ],

  // Observe -> Adapt cognition pipeline.
  flow: [
    { id: "observe", label: "Observe", state: "AVAILABLE" },
    { id: "understand", label: "Understand", state: "IN_DEVELOPMENT" },
    { id: "reason", label: "Reason", state: "IN_DEVELOPMENT" },
    { id: "probability", label: "Probability", state: "IN_DEVELOPMENT" },
    { id: "risk", label: "Risk", state: "IN_DEVELOPMENT" },
    { id: "execute", label: "Execute", state: "IN_DEVELOPMENT" },
    { id: "learn", label: "Learn", state: "PLANNED" },
    { id: "adapt", label: "Adapt", state: "PLANNED" },
  ],
};

/**
 * Single resolution point for the /brain surface.
 *
 * Returns DEV PRESENTATION STATE today. Replace the body with a real backend
 * call when the status endpoint exists; the return type does not change.
 */
export function getBrainStatusSnapshot(): BrainStatusSnapshot {
  return DEV_PRESENTATION_STATE;
}
