# TradeStrix Harmonic Pattern Intelligence — Architecture & Review Document

> **Version**: 2.2.0 (Final Frozen Architecture Specification)  
> **Status**: ARCHITECTURAL REVIEW COMPLETE — READY FOR IMPLEMENTATION FREEZE  
> **Repository Roots**:  
> - Backend: `c:\Users\91809\dev\TradeStrix\tradestrix-api`  
> - Frontend: `c:\Users\91809\dev\TradeStrix\tradestrix-web`  
> **Target Route**: [`/harmonic-patterns`](https://frontend.fullstackpythondeveloper.in/harmonic-patterns)  
> **Review Branches**:  
> - Backend: `review/harmonic-features-analysis`  
> - Frontend: `review/harmonic-features-analysis`  

---

## Table of Contents
1. [Executive Summary & Core Architectural Directives](#1-executive-summary--core-architectural-directives)
2. [Codebase & File Architecture Map](#2-codebase--file-architecture-map)
3. [Global Standard Comparison & Coordinate Verification Matrix](#3-global-standard-comparison--coordinate-verification-matrix)
4. [Harmonic Ratio Coordinate Model & Topology Standards](#4-harmonic-ratio-coordinate-model--topology-standards)
5. [Potential Reversal Zone (PRZ) Convergence & Density Rules](#5-potential-reversal-zone-prz-convergence--density-rules)
6. [Target Architecture: Execution Ladder vs. Pattern-Specific Structural Levels](#6-target-architecture-execution-ladder-vs-pattern-specific-structural-levels)
7. [Strategy Separation: C->D Expansion vs. PRZ Reversal](#7-strategy-separation-cd-expansion-vs-prz-reversal)
8. [Downstream Options Strike Selection Architecture](#8-downstream-options-strike-selection-architecture)
9. [Deep-Dive Architecture & Breakdown for All 6 Core UI Tabs](#9-deep-dive-architecture--breakdown-for-all-6-core-ui-tabs)
   - [Tab 1: Pattern Registry (DB)](#tab-1-pattern-registry-db)
   - [Tab 2: Live Scan](#tab-2-live-scan)
   - [Tab 3: 🔮 Predict D (Forming)](#tab-3--predict-d-forming)
   - [Tab 4: MTF Matrix](#tab-4-mtf-matrix)
   - [Tab 5: 📄 Paper Portfolio](#tab-5--paper-portfolio)
   - [Tab 6: 🔬 Harmonic Lab](#tab-6--harmonic-lab)
10. [Comprehensive Gap Analysis & Technical Findings](#10-comprehensive-gap-analysis--technical-findings)
11. [Governed Phase-1 Remediation & Upgrade Roadmap](#11-governed-phase-1-remediation--upgrade-roadmap)

---

## 1. Executive Summary & Core Architectural Directives

The **TradeStrix Harmonic Pattern Intelligence** subsystem provides algorithmic detection, predictive projection, multi-timeframe validation, and execution routing for classical and advanced harmonic patterns across Indian equities and major indices (NIFTY 50, BANK NIFTY, FIN NIFTY, MIDCPNIFTY).

### Core Architectural Directives (Final Governed Specification)

1. **Single Mathematical Authority**:  
   The backend (`tradestrix-api`) is the sole authoritative mathematical engine for pattern specifications, Fibonacci ratio validation, PRZ calculation, invalidation stops, target calculations, and confluence scoring. The frontend (`tradestrix-web`) renders backend-computed evidence. Client-side evaluation (e.g. for offline discretionary studio use) must share a versioned canonical spec enforced by golden test parity, eliminating duplicate rulebooks.

2. **Explicit Ratio Vocabulary & Strict Topology Contracts**:  
   Pattern specs must not force heterogeneous geometries into ambiguous fields. Standard XABCD patterns, 4-point AB=CD reciprocal structures, and 5-swing Shark structures each use their native coordinate topologies with mandatory non-null coordinate requirements:
   - `PatternTopology = "XABCD"` $\rightarrow$ strictly requires `{X, A, B, C, D}`
   - `PatternTopology = "OXABC"` $\rightarrow$ strictly requires `{O, X, A, B, C}`
   - `PatternTopology = "ABCD"`  $\rightarrow$ strictly requires `{A, B, C, D}`  
   Every ratio must use explicit coordinate denominators (e.g. `AB_XA`, `BC_AB`, `CD_BC`, `AD_XA`, `CD_XC`, `OC_OX`).

3. **Separation of Literature Constants from Empirical Policy Parameters**:  
   Literature-defined Fibonacci relationships ($0.382, 0.500, 0.618, 0.786, 0.886, 1.130, 1.272, 1.414, 1.618, 2.000, 2.240, 2.618, 3.618$) belong to canonical pattern specifications. Liquidity thresholds, scoring thresholds, confirmation gates, risk percentages, and execution parameters are configurable strategy policy and require empirical backtest calibration.

4. **Versioned Reproducibility & Dual Data-Spec Provenance**:  
   Every detected, projected, paper-traded, live-executed, or backtested harmonic setup must persist:
   - The canonical specification version: `pattern_spec_version: "harmonics-2.2.0"`
   - The engine policy versions: `geometry_engine_version`, `target_policy_version`, `confluence_policy_version`
   - The market data version: `data_snapshot_version` (or dataset hash / candle interval checksum)  
   Historical records must never be silently reinterpreted when rules or datasets evolve.

5. **PRZ as a Convergence Quality Zone, Not a Bounding Box**:  
   A valid PRZ requires genuine Fibonacci clustering density. Bounding min/max coordinates without dispersion gating creates excessive risk. Patterns with excessive projection dispersion must be penalized or rejected.

6. **Replay vs. Live Determinism Scope**:  
   Determinism equality applies strictly to **finalized-bar decisions**. While intrabar tentative pivots may legitimately fluctuate until bar close, feeding identical finalized historical candle sequences through offline replay versus incremental live streaming must produce 100% identical confirmed pivots, pattern classifications, PRZ bounds, targets, and lifecycle transitions.

7. **Decoupled Strategy & Execution Engines**:  
   - Harmonic detection operates strictly on underlying price structure.
   - Stage 1 ($C \rightarrow D$ expansion) and Stage 2 (PRZ reversal) are independent trading strategies with opposite directions, distinct invalidation rules, and separate risk ledgers (`HARMONIC_CD_EXPANSION` vs `HARMONIC_PRZ_REVERSAL`).
   - Downstream derivative strike selection (expiry, moneyness, Greeks, liquidity) is handled by a dedicated options engine rather than hardcoding naive ATM mappings into the pattern core.

---

## 2. Codebase & File Architecture Map

### A. Backend: `tradestrix-api`
| Component | File Path | Primary Responsibility |
| :--- | :--- | :--- |
| **API Router** | `app/modules/harmonics/api/router.py` | REST endpoints for scanning, persistent DB queries, MTF confluence, sandbox evaluation, paper trades, and auto-trade daemon. |
| **Pydantic Schemas** | `app/modules/harmonics/api/schemas.py` | API schemas and request/response validation contracts. |
| **Pattern Specs** | `app/modules/harmonics/domain/specs.py` | Canonical Fibonacci specifications and tolerance models for 9 harmonic patterns. |
| **Geometric Validation** | `app/modules/harmonics/domain/geometry.py` | Multi-point swing leg ratio calculations and geometric adherence scoring. |
| **PRZ Calculator** | `app/modules/harmonics/domain/prz.py` | Multi-Fibonacci cluster calculation, cluster width ATR metrics, and invalidation stops. |
| **Pivot Detection** | `app/modules/harmonics/domain/pivots.py` | Stateful `DualTrackPivotDetector` ensuring strict zero look-ahead bias and ATR swing filtering. |
| **Pattern Engine** | `app/modules/harmonics/application/engine.py` | Incremental candle stream coordinator and pattern state machine lifecycle. |
| **Point D Predictor** | `app/modules/harmonics/application/d_predictor.py` | Mathematical projection of Point D and C->D expansion leg roadmap. |
| **MTF Confluence** | `app/modules/harmonics/application/mtf_confluence.py` | Top-down Macro (1D/4H/1H) -> Micro (15m/5m/3m) confluence, BOS, RSI divergence, and Option Chain OI/PCR. |
| **Universe Scanner** | `app/modules/harmonics/application/scanner.py` | Parallel multi-threaded universe scanner across Indices and F&O Equities. |
| **Auto-Scanner Daemon** | `app/modules/harmonics/application/auto_scanner.py` | Background worker orchestrating multi-tier timeframe scan cycles. |
| **Auto-Trader Daemon** | `app/modules/harmonics/application/auto_trade.py` | Execution daemon managing position limits, risk parameters, and automated order generation. |
| **Paper Trading Desk** | `app/modules/harmonics/application/paper_trading.py` | Mark-to-market simulation ledger and trade lifecycle monitor. |
| **Custom Sandbox** | `app/modules/harmonics/application/sandbox.py` | Discretionary coordinate evaluation and on-demand symbol analyzer. |
| **Pattern DB Repository** | `app/modules/harmonics/repositories/pattern_repository.py` | Thread-safe SQLite persistence layer (`logs/harmonic_patterns.db`). |

### B. Frontend: `tradestrix-web`
| Component | File Path | Primary Responsibility |
| :--- | :--- | :--- |
| **Page Route** | `app/harmonic-patterns/page.tsx` | Next.js App Router entry rendering the Harmonic Shell. |
| **Main Scanner Shell** | `components/harmonic-pattern-scanner-shell.tsx` | Console managing all 6 view modes, filters, lifecycle badges, and modal drawers. |
| **Predictive D Modal** | `components/harmonic-predictive-d-modal.tsx` | Interactive modal visualizing Point D roadmap, C->D expansion, PRZ zone, and risk-reward. |
| **Inspector Drawer** | `components/harmonic-pattern-inspector-drawer.tsx` | Modal inspecting ratio deviations, tolerances, and rule criteria. |
| **Wave & Candle Chart** | `components/harmonic-candle-wave-chart.tsx` | SVG chart rendering dual-stage vectors (C->D expansion & D->Target reversal). |
| **Custom Studio** | `components/harmonic-custom-studio.tsx` | Discretionary coordinate sandbox, custom symbol analyzer, and cheatsheet. |
| **Client Engine Rules** | `lib/harmonic-engine/harmonicRules.ts` | Client pattern evaluation rules and strategy guidebook setups. |
| **Client Pattern Engine** | `lib/harmonic-engine/patternEngine.ts` | Rolling window swing pivot scanner and classical pattern detector. |
| **API Client & Types** | `modules/harmonics/api.ts` & `modules/harmonics/types.ts` | TypeScript contracts and backend HTTP fetchers. |

---

## 3. Global Standard Comparison & Coordinate Verification Matrix

Benchmark against **Scott M. Carney** (*Harmonic Trading Vol. 1 & 2*) and **Larry Pesavento** (*Fibonacci Ratios with Pattern Recognition*):

| Pattern Name | Topology | Primary B Retracement | C Pullback Range | D Extension Range | Terminal D Definition | Symmetry Requirement | Literature Definition Alignment | Implementation Semantics Verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Gartley (222)** | `XABCD` | **0.618** (Exact) | 0.382 - 0.886 | 1.130 - 1.618 | **0.786 of XA** | 1.000 ($AB=CD$) | **Strong Alignment**: Strict 0.618 B; D must not breach X. | **Verified for standard XABCD geometry**: Backend currently tests $AB/XA$, $BC/AB$, $CD/BC$, and $AD/XA$. |
| **Bat** | `XABCD` | 0.382 - **0.500** | 0.382 - 0.886 | 1.618 - 2.618 | **0.886 of XA** | 1.000 - 1.618 | **Strong Alignment**: B must remain $<0.618$; D hits 0.886. | **Verified**: B capped at 0.50, D validated at 0.886 of $XA$. |
| **Alternate Bat** | `XABCD` | **0.382** (Strict) | 0.382 - 0.886 | 2.000 - 3.618 | **1.130 of XA** | 1.000 - 1.618 | **Strong Alignment**: Strict 0.382 B; D extends past X to 1.130. | **Partial**: Backend present; ⚠️ Missing in frontend `harmonicRules.ts`. |
| **Butterfly** | `XABCD` | **0.786** (Deep) | 0.382 - 0.886 | 1.618 - 2.618 | **1.272 - 1.618 of XA** | 1.000 - 1.618 | **Strong Alignment**: Deep 0.786 B; D extends beyond X. | **Verified**: Dual extension validated across backend & frontend. |
| **Crab** | `XABCD` | 0.382 - **0.618** | 0.382 - 0.886 | 2.240 - 3.618 | **1.618 of XA** | 1.000 - 1.618 | **Strong Alignment**: Extreme 1.618 XA extension is mandatory. | **Verified**: Strict 1.618 extension requirement enforced. |
| **Deep Crab** | `XABCD` | **0.886** (Deep) | 0.382 - 0.886 | 2.240 - 3.618 | **1.618 of XA** | 1.000 - 1.618 | **Strong Alignment**: Crab variant with deep 0.886 B-point. | **Partial**: Backend present; ⚠️ Missing in frontend `harmonicRules.ts`. |
| **Cypher** | `XABCD` | 0.382 - **0.618** | **1.272 - 1.414 of XA** | 1.272 - 2.000 | **0.786 of XC** | N/A | **Caution Required**: Point C exceeds A; D is 0.786 of $XC$. | ⚠️ **Discrepancy (GAP-00)**: Backend `geometry.py` validates $AD/XA$ generic, while `d_predictor.py` uses $XC$. |
| **Shark** | `OXABC` | 0.500 - 0.886 | **1.130 - 1.618 of AB** | 1.618 - 2.240 | **0.886 - 1.130 of 0X** | N/A | **Caution Required**: Native $0-X-A-B-C$ structure; D is 0.886-1.13 of $0X$. | ⚠️ **Discrepancy (GAP-00 / GAP-07)**: Shark is an $0-X-A-B-C$ native topology, currently forced into generic $X-A-B-C-D$. |
| **AB=CD** | `ABCD` | 0.382 - 0.886 | 0.382 - 0.886 | 1.130 - 2.618 | N/A (Equal Leg) | **1.000** ($|AB|=|CD|$) | **Strong Alignment**: Strict symmetry in price and time bars. | **Partial**: Backend present; ⚠️ Missing in frontend `harmonicRules.ts`. |

---

## 4. Harmonic Ratio Coordinate Model & Topology Standards

### A. Clarification on Terminal Ratios: `AD_XA` vs `XD_XA`
In harmonic literature, when a pattern states that Point D is a **0.786 retracement of XA** (Gartley) or **0.886 retracement of XA** (Bat), the mathematical definition is the distance of Point D from Point A relative to the total XA move:
$$\text{AD\_XA} = \frac{|D - A|}{|A - X|}$$

*Proof*: On a Bullish Gartley where $X = 0$, $A = 100$, Point D completes at $21.40$.  
$$\text{AD\_XA} = \frac{|21.40 - 100|}{|100 - 0|} = \frac{78.60}{100} = 0.786 \quad (\text{Correct Canonical Ratio})$$
Conversely, computing $|D - X| / |A - X|$ yields $0.2140$ ($1.0 - 0.786$), which is mathematically inverted if used as the completion target! Therefore:
- `AD_XA` is the **canonical XA completion ratio** across Gartley, Bat, Butterfly, Crab, and Alternate Bat.
- If measuring the net price distance beyond Point X for extension patterns, it must be explicitly labeled `XD_XA_OVERSHOOT = |D - X| / |A - X|` and never substituted for `AD_XA`.

### B. Canonical Coordinate Definitions
```
Canonical Ratio Tokens:
────────────────────────────────────────────────────────────────────────
• AB_XA            : |B - A| / |A - X|   (B-point retracement of XA leg)
• BC_AB            : |C - B| / |B - A|   (C-point retracement of AB leg)
• CD_BC            : |D - C| / |C - B|   (D-point projection of BC leg)
• AD_XA            : |D - A| / |A - X|   (Canonical XA completion ratio)
• CD_AB            : |D - C| / |B - A|   (Harmonic symmetry ratio; 1.0 = equal leg)
• CD_XC            : |D - C| / |C - X|   (Cypher-specific 0.786 retracement of XC)
• XC_XA            : |C - X| / |A - X|   (Cypher-specific C-extension of XA)
• OC_OX            : |C - X| / |X - 0|   (Shark-native C-extension of 0X)
• XD_XA_OVERSHOOT  : |D - X| / |A - X|   (Explicit net extension beyond Point X)
────────────────────────────────────────────────────────────────────────
```

### C. Pattern Topology Contracts (`PatternTopology`)
To resolve GAP-00 and GAP-07, harmonic structures are classified into explicit topological types with non-null coordinate requirements:

```typescript
type PatternTopology = "XABCD" | "OXABC" | "ABCD";
```
1. **`XABCD`**: Gartley, Bat, Alternate Bat, Butterfly, Crab, Deep Crab, Cypher (7 patterns).  
   *Mandatory Required Coordinates*: `{ X: PivotPoint, A: PivotPoint, B: PivotPoint, C: PivotPoint, D: PivotPoint }`
2. **`OXABC`**: Shark structure natively represented as $0-X-A-B-C$, completing at $C$ (or $D$ of the subsequent 5-0 transition).  
   *Mandatory Required Coordinates*: `{ O: PivotPoint, X: PivotPoint, A: PivotPoint, B: PivotPoint, C: PivotPoint }`
3. **`ABCD`**: Classic reciprocal 4-point structure ($A-B-C-D$) requiring equal leg length and time symmetry without an initial $X$ anchor.  
   *Mandatory Required Coordinates*: `{ A: PivotPoint, B: PivotPoint, C: PivotPoint, D: PivotPoint }`

This strict contract prevents implementations from accepting partially populated structures.

---

## 5. Potential Reversal Zone (PRZ) Convergence & Density Rules

### A. Dimensional Correctness for Normalized Dispersion
In `PRZCalculator`:
$$\text{PRZ Spread Points} = \max(P_i) - \min(P_i)$$
$$\text{Normalized PRZ Dispersion} = \frac{\text{PRZ Spread Points}}{\max(\text{ATR}_{14}, 0.01)}$$

Because $\text{PRZ Spread Points}$ and $\text{ATR}_{14}$ are both denominated in points, **$\text{Normalized PRZ Dispersion}$ is dimensionless**. Thresholds are therefore expressed as pure scalar numbers, not multiplied by ATR:

```
Normalized PRZ Dispersion Governance Defaults:
────────────────────────────────────────────────────────────────────────
• dispersion <= 0.40        ──► TIGHT_CONVERGENCE   (Optimal harmonic cluster)
• 0.40 < dispersion <= 1.00 ──► ACCEPTABLE          (Tradable with standard sizing)
• 1.00 < dispersion <= 1.50 ──► WEAK_DISPERSION     (Penalty applied; requires BOS)
• dispersion > 1.50         ──► REJECT_DISPERSED    (Auto-entry prohibited)
────────────────────────────────────────────────────────────────────────
* Note: These are initial configurable baseline defaults requiring empirical backtest calibration.
```

### B. Convergence Density Score
$$\text{Convergence Density Score} = \text{clip}\left(1.0 - \frac{\text{Normalized PRZ Dispersion}}{2.0}, 0.0, 1.0\right)$$
- If an outlier projection accounts for $>60\%$ of total cluster spread, flag `OUTLIER_DILUTION` and require lower-timeframe Break of Structure (BOS) confirmation prior to entry.

---

## 6. Target Architecture: Execution Ladder vs. Pattern-Specific Structural Levels

Targets are strictly partitioned into two operational layers:

```
                              Harmonic Target Structure
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 ▼                                                 ▼
     Canonical Execution Ladder                       Pattern-Specific Structural Objectives
     (Formal Automated Order Fills)                   (Confluence & Reference Objectives)
     ─────────────────────────────────                ─────────────────────────────────────
     • T1_EXEC: Entry + 0.382 * |AD|                  • Point B Structural Level
     • T2_EXEC: Entry + 0.618 * |AD|                  • Point C Structural Level
     • T3_STRUCTURAL: Pattern-specific                • CD Retracements (e.g. 0.50 CD)
       (Default: Point A for XABCD)                   • S/R Cluster Confluences
```

### Reference vs Execution Origin
- **`projected_d_price`**: Used for theoretical targets while pattern is `PROJECTED`.
- **`confirmed_d_price`**: Computed once Point D pivot confirms.
- **`actual_entry_price`**: Recorded when trade is filled, used for real-money P&L and trailing stop adjustments.

The default XABCD structural reference for $T_3$ is Point A. Pattern families with different topology (Shark, Cypher, ABCD) supply their pattern-specific structural objectives through the canonical pattern specification.

---

## 7. Strategy Separation: C->D Expansion vs. PRZ Reversal

Stage 1 ($C \rightarrow D$ expansion scalp) and Stage 2 (PRZ reversal) have opposite market directions and different invalidations. They are modeled as **two independent strategies**:

| Strategy Parameter | `HARMONIC_CD_EXPANSION` | `HARMONIC_PRZ_REVERSAL` |
| :--- | :--- | :--- |
| **Trade Type** | Trend-following scalp toward PRZ | Counter-trend / Mean-reversion out of PRZ |
| **Direction** | Same direction as $C \rightarrow D$ swing | Opposite direction (buying Bullish D, selling Bearish D) |
| **Entry Trigger** | Confirmed Point C pivot + Minor swing break | Touch of PRZ + Micro BOS / Candlestick confirmation |
| **Primary Target** | Projected `prz_mid` (Point D completion) | $T_{1\_EXEC}$ ($0.382\times AD$) & $T_{2\_EXEC}$ ($0.618\times AD$) |
| **Invalidation Stop** | Breach of Point C extreme | Terminal Stop beyond PRZ / Point X |
| **Configurable Risk Baseline** | Initial baseline default: 0.5% capital *(subject to backtest calibration)* | Initial baseline default: 1.0% - 1.5% capital *(subject to backtest calibration)* |
| **Audit Ledger** | Tagged as `STRATEGY_CD_EXPANSION` | Tagged as `STRATEGY_PRZ_REVERSAL` |

---

## 8. Downstream Options Strike Selection Architecture

Harmonic detection operates strictly on underlying spot/futures price action. Order execution on Indian indices (NIFTY, BANKNIFTY) routes through a dedicated **Option Selection Pipeline**:

```
[Harmonic Reversal Confirmed on Underlying]
                   │
                   ▼ Emits Signal:
      { symbol: "NIFTY", direction: "BULLISH_REVERSAL", prz_stop: 24150, target_1: 24380 }
                   │
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Option Contract Selection Engine                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Expiry Selection: Weekly nearest (skip if DTE == 0 and time > 14:00)│
│ 2. Side Selection: BULLISH -> CE contract | BEARISH -> PE contract     │
│ 3. Strike Selection: Evaluated using target_delta (e.g. Delta ~ 0.50)  │
│ 4. Liquidity & Spread Gate: max_spread_pct (e.g. <= 1.2%), min_oi      │
│ 5. Lot Sizing: Calculated from risk amount / option stop distance      │
└────────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
       [Order Placed to Broker via Adapter: Kotak / Upstox / Kite]
```
*Note: Parameters like `target_delta`, `max_spread_pct`, and `min_oi` are configurable strategy policy inputs, not hardcoded constants.*

---

## 9. Deep-Dive Architecture & Breakdown for All 6 Core UI Tabs

```html
<div class="btn-group p-1 bg-surface rounded-3 border shadow-sm" role="group">
  <button type="button" class="btn btn-sm btn-primary shadow-sm fw-semibold"><i class="bi bi-database me-1"></i> Pattern Registry (DB)</button>
  <button type="button" class="btn btn-sm btn-light text-secondary"><i class="bi bi-broadcast me-1"></i> Live Scan</button>
  <button type="button" class="btn btn-sm btn-light text-secondary"><i class="bi bi-bullseye me-1"></i> 🔮 Predict D (Forming)</button>
  <button type="button" class="btn btn-sm btn-light text-secondary"><i class="bi bi-layers-half me-1"></i> MTF Matrix</button>
  <button type="button" class="btn btn-sm btn-light text-secondary"><i class="bi bi-journal-check me-1"></i> 📄 Paper Portfolio</button>
  <button type="button" class="btn btn-sm btn-light text-secondary"><i class="bi bi-sliders me-1"></i> 🔬 Harmonic Lab</button>
</div>
```

---

### Tab 1: Pattern Registry (DB)
- **UI Button**: `<i class="bi bi-database me-1"></i> Pattern Registry (DB)`
- **View Mode**: `viewMode === "database"`
- **Backend Endpoint**: `GET /api/v1/pattern-intelligence/db-patterns`
- **Database**: `logs/harmonic_patterns.db` (Table: `harmonic_patterns`)
- **Operational Logic**:
  - Pulls historical and active patterns cached by the background daemon.
  - Runs real-time lifecycle categorization via `getPatternLifecycle()` (`FORMING_D`, `TARGET_ACHIEVED`, `SL_BREACHED`, `OPEN_ACTIVE / IN PRZ`).
  - Presents summary metrics: Active setups, high-conviction counts, bullish/bearish ratio.

### Tab 2: Live Scan
- **UI Button**: `<i class="bi bi-broadcast me-1"></i> Live Scan`
- **View Mode**: `viewMode === "live"`
- **Backend Endpoint**: `POST /api/v1/pattern-intelligence/scan`
- **Service**: `app/modules/harmonics/application/scanner.py::scan_harmonic_universe`
- **Operational Logic**:
  - Concurrently queries broker candle history across indices and F&O universe.
  - Feeds bars into `DualTrackPivotDetector` and `PatternIntelligenceEngine`.
  - Calculates geometry scores, PRZ bounds, reward-to-risk, and S/R proximity levels.

### Tab 3: 🔮 Predict D (Forming)
- **UI Button**: `<i class="bi bi-bullseye me-1"></i> 🔮 Predict D (Forming)`
- **View Mode**: `viewMode === "emerging_d"`
- **Backend Endpoints**: `GET /api/v1/pattern-intelligence/emerging-patterns` & `predict-d/{instrument_key}`
- **Engine**: `HarmonicDPredictor` in `d_predictor.py`
- **Operational Logic**:
  - Scans for 4-point swings ($X-A-B-C$) where Point D is forming.
  - Computes mathematical Point D PRZ target box before pattern completes.
  - Opens `HarmonicPredictiveDModal` displaying SVG projection chart and dual-stage trade roadmap.

### Tab 4: MTF Matrix
- **UI Button**: `<i class="bi bi-layers-half me-1"></i> MTF Matrix`
- **View Mode**: `viewMode === "mtf_confluence"`
- **Backend Endpoint**: `GET /api/v1/pattern-intelligence/mtf-universe-confluence`
- **Service**: `mtf_confluence_service` in `mtf_confluence.py`
- **Operational Logic**:
  - Evaluates Macro (1D/4H/1H) patterns against Micro (15m/5m/3m) structure.
  - Classifies into 4 readiness stages: `MICRO_TRIGGER_CONFIRMED`, `IN_PRZ_MONITORING`, `MACRO_DETECTED`, `INVALIDATED`.
  - Gated by Micro Break of Structure (BOS), candlestick reversals, Wilder's RSI divergence, and live Option Chain Open Interest / PCR.

### Tab 5: 📄 Paper Portfolio
- **UI Button**: `<i class="bi bi-journal-check me-1"></i> 📄 Paper Portfolio`
- **View Mode**: `viewMode === "paper_portfolio"`
- **Backend Endpoints**: `GET/POST /api/v1/pattern-intelligence/paper-trades` & `auto-trade/settings`
- **Services**: `HarmonicPaperTradeService` & `HarmonicAutoTradeService`
- **Databases**: `logs/harmonic_paper_trades.db` & `logs/harmonic_auto_trade_settings.db`
- **Operational Logic**:
  - Real-time simulation ledger tracking entry, current price, unrealized/realized P&L, hold duration, win rate.
  - Automated exit monitor auto-closing positions on Target or Stop touch; moves SL to Breakeven at Target 1.
  - Auto-trade daemon settings controller (Paper vs Live mode, risk limits, 15:15 auto square-off).

### Tab 6: 🔬 Harmonic Lab
- **UI Button**: `<i class="bi bi-sliders me-1"></i> 🔬 Harmonic Lab`
- **View Mode**: `viewMode === "custom_studio"`
- **Backend Endpoints**: `POST /api/v1/pattern-intelligence/sandbox/evaluate` & `GET /custom-analyze`
- **Component**: `HarmonicCustomStudio` in `components/harmonic-custom-studio.tsx`
- **Operational Logic**:
  - Discretionary coordinate evaluation sandbox ($X, A, B, C, D$) and on-demand NSE ticker analyzer.
  - Displays calculated ratio deviations against all 9 harmonic specifications.
  - Renders interactive dual-stage SVG wave chart and embedded cheatsheet reference guide.

---

## 10. Comprehensive Gap Analysis & Technical Findings

| Gap ID | Category | Specific Finding & Root Cause | Impact | Action Required |
| :---: | :--- | :--- | :--- | :--- |
| **GAP-00** | **Ratio Coordinate Inconsistency** | `geometry.py` validates generic `ad_xa` as $\|A-D\|/\|X-A\|$, while `d_predictor.py` and Cypher specs define D as 0.786 of $XC$. Shark requires Point 0 tracking ($0X$ leg). | Completed validation and prediction speak different geometric languages for Cypher and Shark. | Introduce explicit ratio tokens (`CD_XC`, `BC_0X`, `AD_XA`) across all validation layers. |
| **GAP-07** | **Pattern Topology Over-Generalization** | `HarmonicPatternSpec` assumes a generic XABCD coordinate model even though Shark uses $0-X-A-B-C$ and AB=CD is fundamentally a 4-point structure. | Pattern-specific ratios are mapped into semantically incorrect generic fields, creating inconsistencies across prediction and backtests. | Introduce explicit `PatternTopology = "XABCD" | "OXABC" | "ABCD"` with strict non-null coordinate requirements. |
| **GAP-01** | **Pattern & Execution Semantics Parity** | `harmonicRules.ts` defines 6 patterns; `specs.py` defines 9 (missing Alt Bat, Deep Crab, ABCD). Shared patterns also differ in target rules, tolerance allowances, and stops. | Frontend inspector cannot evaluate all backend patterns and displays divergent targets. | Promote backend as single mathematical authority; frontend renders backend evidence or shares canonical JSON spec. |
| **GAP-02** | **PRZ Convergence Gating** | `PRZCalculator` assigns $\min$ and $\max$ of projections as PRZ boundaries without checking cluster dispersion. | Outlier projections artificially inflate PRZ width; trades taken in loose, non-convergent zones. | Add `Normalized PRZ Dispersion` gate; penalize or reject patterns where dispersion $> 1.50$. |
| **GAP-03** | **Index Options Strike Pipeline** | Auto-trader generates index spot units (`index_quantity`) instead of routing to weekly Call/Put options contracts. | Live execution on NIFTY/BANKNIFTY will fail or trade spot rather than options. | Connect downstream Option Selection Pipeline (evaluating expiry, delta, liquidity, spread). |
| **GAP-04** | **1-Minute Timeframe Readiness** | `1m` is present in router docstrings but absent from `SUPPORTED_TIMEFRAMES` in `scanner.py`. Calling `1m` falls back to `FAST_TIMEFRAMES` (`3m`, `5m`, `15m`). | 1-minute intraday scans will not evaluate 1m candles. | Add 1m after verifying broker capability, session normalization, rate budgets, and ATR calibration. |
| **GAP-05** | **Real-Time Tick PRZ Execution** | Active paper trades and auto-trades update via 15s polling loop. | Rapid intra-candle PRZ bounces can touch target/stop and exit before polling cycle detects it. | Integrate Redis live tick stream for sub-second PRZ touch and exit execution. |
| **GAP-06** | **Custom Studio Pivot Prefill** | Discretionary studio requires typing 5 coordinates manually. | Tedious user experience for discretionary wave analysis. | Add "Auto-Fill Latest Pivots" button fetching confirmed swing extremes from the chart. |

---

## 11. Governed Phase-1 Remediation & Upgrade Roadmap

```mermaid
flowchart TD
    P1_1["P1.1: Canonical Ratio Vocabulary & Topology Contracts\n- PatternTopology ('XABCD', 'OXABC', 'ABCD') with strict non-null coordinates\n- Explicit ratio tokens (CD_XC, BC_0X, AD_XA)\n- Fix Cypher and Shark coordinate models"]
    P1_2["P1.2: Backend Specification Authority & PRZ Gate\n- Single authoritative pattern catalog in specs.py\n- PRZ Normalized Dispersion Quality Gate (<=0.40 tight, <=1.00 acceptable, >1.50 reject)"]
    P1_3["P1.3: Canonical Target Contract\n- Execution ladder (T1=0.382 AD, T2=0.618 AD, T3=Structural)\n- Separate reference levels & real entry fill origin"]
    P1_4["P1.4: API Contract & Dual Data-Spec Provenance\n- All calculated evidence emitted in API responses\n- Persist pattern_spec_version and data_snapshot_version in DB snapshots"]
    P1_5["P1.5: Golden Parity Test Suite\n- 18 canonical valid fixtures (9 patterns x Bullish/Bearish)\n- Boundary, invalid topology, and finalized-bar replay determinism"]
    P1_6["P1.6: Frontend Presentation Parity\n- Alt Bat, Deep Crab, ABCD added to inspector\n- Frontend renders backend mathematical outputs"]

    P1_1 --> P1_2 --> P1_3 --> P1_4 --> P1_5 --> P1_6
```

### Action Checklist
- [ ] **P1.1 — Canonical Ratio Vocabulary & Topology Contracts**:
  - Define `PatternTopology = Literal["XABCD", "OXABC", "ABCD"]` with explicit non-null coordinate requirements:
    - `XABCD` $\rightarrow$ `{ X, A, B, C, D }`
    - `OXABC` $\rightarrow$ `{ O, X, A, B, C }`
    - `ABCD`  $\rightarrow$ `{ A, B, C, D }`
  - Update `geometry.py` and `HarmonicPatternSpec` with explicit tokens (`AB_XA`, `BC_AB`, `CD_BC`, `AD_XA`, `CD_XC`, `BC_0X`, `CD_AB`).
  - Fix Cypher coordinate validation to use $CD/XC$ ($0.786$).
  - Separate Shark native $0-X-A-B-C$ topology.
- [ ] **P1.2 — Backend Specification Authority & PRZ Gate**:
  - Enforce backend as single authority.
  - Implement dimensionless `Normalized PRZ Dispersion` gate ($\le 0.40$ tight, $\le 1.00$ acceptable, $\le 1.50$ weak, $> 1.50$ reject).
- [ ] **P1.3 — Canonical Target Contract**:
  - Standardize execution targets ($T_{1\_EXEC} = 0.382\times AD$, $T_{2\_EXEC} = 0.618\times AD$, $T_{3\_STRUCTURAL}$).
  - Expose pattern-specific structural levels (Point B, Point C, CD retracements) as reference confluence without altering execution fills.
- [ ] **P1.4 — API Contract & Versioned Reproducibility**:
  - Ensure API responses emit full harmonic evidence.
  - Persist `pattern_spec_version: "harmonics-2.2.0"` and `data_snapshot_version` in SQLite tables.
- [ ] **P1.5 — Golden Parity Test Suite**:
  - Category A: 18 canonical valid fixtures (9 patterns $\times$ Bullish/Bearish).
  - Category B: Boundary fixtures (exact min, max, just inside/outside tolerance).
  - Category C: Invalid topology fixtures (wrong alternation, inverted D).
  - Category D: Special topology fixtures (Cypher $CD/XC$, Shark $0-X-A-B-C$, AB=CD).
  - Category E: PRZ dispersion fixtures (tight, acceptable, outlier, dispersed/no-trade).
  - Category F: Replay vs. live incremental determinism verification (finalized-bar equality).
- [ ] **P1.6 — Frontend Presentation Parity**:
  - Update `harmonicRules.ts` and `HarmonicPatternInspectorDrawer` to render all 9 patterns seamlessly using the canonical backend contract.
