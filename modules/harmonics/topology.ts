/**
 * Governed Topology Definitions & Utilities for Harmonic Patterns.
 * Authoritative Authority: docs/COMPLETED_OXABC_TARGET_CONTRACT.md (P1.1b-D2-A)
 */

export type GovernedTopology = "OXABC" | "XABCD" | "ABCD";

export interface PatternTopologyCandidate {
  topology?: string | null;
  pattern_name?: string | null;
}

/**
 * Resolves the governed pattern topology from backend scan or database payloads.
 * The backend `topology` field is authoritative.
 *
 * Rules:
 * 1. Recognized backend topology ("OXABC", "XABCD", "ABCD") wins.
 * 2. Missing, null, or unknown topology falls back strictly to "XABCD" (legacy path).
 * 3. STRICTLY FORBIDDEN: pattern_name === "Shark" -> OXABC.
 *    Historical Shark records without explicit topology must remain on the legacy XABCD path.
 */
export function resolvePatternTopology(
  item: PatternTopologyCandidate | null | undefined
): GovernedTopology {
  if (!item) return "XABCD";

  if (item.topology) {
    const norm = String(item.topology).trim().toUpperCase();
    if (norm === "OXABC") return "OXABC";
    if (norm === "ABCD") return "ABCD";
    if (norm === "XABCD") return "XABCD";
  }

  // Safe Fallback: preserve legacy XABCD rendering path
  return "XABCD";
}

export function isOXABC(
  item: PatternTopologyCandidate | null | undefined
): boolean {
  return resolvePatternTopology(item) === "OXABC";
}

export function isXABCD(
  item: PatternTopologyCandidate | null | undefined
): boolean {
  return resolvePatternTopology(item) === "XABCD";
}

export function isABCD(
  item: PatternTopologyCandidate | null | undefined
): boolean {
  return resolvePatternTopology(item) === "ABCD";
}

export interface OXABCRatioResult {
  ab_xa: number | null;
  bc_ox: number | null;
  xc_ox: number | null;
}

/**
 * Calculates visual Fibonacci ratios for completed OXABC Shark patterns.
 * NOTE: These ratios are for visual SVG badge annotations ONLY.
 * They are NOT validity gates. Backend is the sole pattern-validation authority.
 *
 * Formulas:
 * - AB_XA = |B.price - A.price| / |A.price - X.price|
 * - BC_OX = |C.price - B.price| / |X.price - O.price|
 * - XC_OX = |C.price - X.price| / |X.price - O.price|
 *
 * Denominator Safety:
 * If the denominator is effectively zero (< 1e-6), returns null rather than
 * fabricating an ungrounded mathematical ratio.
 */
export function calculateOXABCRatios(
  o: { price: number } | null | undefined,
  x: { price: number } | null | undefined,
  a: { price: number } | null | undefined,
  b: { price: number } | null | undefined,
  c: { price: number } | null | undefined
): OXABCRatioResult {
  if (!o || !x || !a || !b || !c) {
    return { ab_xa: null, bc_ox: null, xc_ox: null };
  }

  const xaDiff = Math.abs(a.price - x.price);
  const oxDiff = Math.abs(x.price - o.price);

  const ab_xa = xaDiff > 1e-6 ? Math.abs(b.price - a.price) / xaDiff : null;
  const bc_ox = oxDiff > 1e-6 ? Math.abs(c.price - b.price) / oxDiff : null;
  const xc_ox = oxDiff > 1e-6 ? Math.abs(c.price - x.price) / oxDiff : null;

  return { ab_xa, bc_ox, xc_ox };
}
