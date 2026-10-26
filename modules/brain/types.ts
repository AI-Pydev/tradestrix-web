/**
 * TradeStrix Brain — status contract.
 *
 * This module defines the SHAPE of the Brain status surface only. It contains
 * no data and performs no I/O. The DEV presentation fixture lives in
 * `./dev-fixture`, and is explicitly NOT backend truth.
 *
 * When the Production Foundation backend exposes a real status endpoint, add an
 * `api.ts` here that resolves a `BrainStatusSnapshot` and swap the fixture at
 * the single call site in `components/brain-dev-shell.tsx`. No component needs
 * to change shape.
 */

/** Delivery state of a numbered Production Foundation work item. */
export type FoundationState =
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "NOT_IMPLEMENTED";

/** Delivery state of a Brain intelligence module. */
export type ModuleState =
  | "AVAILABLE"
  | "IN_DEVELOPMENT"
  | "PLANNED"
  | "FOUNDATION_BLOCKED";

/**
 * Tri-state for a concrete, verifiable fact about the running system
 * (e.g. "is PostgreSQL connected?"). `UNVERIFIED` is used when nothing has
 * actually been checked — it is never rendered as a healthy state.
 */
export type ReadinessState = "YES" | "NO" | "UNVERIFIED";

/** Resolution state of an architecture decision. */
export type DecisionState = "RESOLVED" | "IN_PROGRESS" | "OPEN";

/** A numbered Production Foundation phase (P0..P12). */
export type FoundationItem = {
  /** Phase identifier as the architecture documents refer to it, e.g. "P4". */
  id: string;
  label: string;
  state: FoundationState;
};

/** A Brain intelligence module card. */
export type BrainModule = {
  id: string;
  name: string;
  /** One-line plain-language purpose. */
  description: string;
  state: ModuleState;
  /** Compact secondary detail: dependency or scope, never a fake metric. */
  detail: string;
};

/** An architecture decision or a verifiable runtime fact. */
export type AuthorizationRow = {
  id: string;
  label: string;
  state: DecisionState | ReadinessState | "NOT_IMPLEMENTED" | "NOT_ESTABLISHED";
};

/** One stage of the Observe -> Adapt cognition pipeline. */
export type FlowStage = {
  id: string;
  label: string;
  state: ModuleState;
};

/**
 * Everything the /brain surface renders.
 *
 * `source` records where the values came from so the UI can label itself
 * honestly. A `"dev-fixture"` snapshot must never be presented as live.
 */
export type BrainStatusSnapshot = {
  source: "dev-fixture" | "backend";
  /** Human-readable provenance line shown in the UI. */
  sourceLabel: string;
  foundation: FoundationItem[];
  modules: BrainModule[];
  authorization: AuthorizationRow[];
  flow: FlowStage[];
};
