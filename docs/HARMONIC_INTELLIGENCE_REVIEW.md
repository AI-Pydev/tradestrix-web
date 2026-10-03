# TradeStrix Harmonic Pattern Intelligence — Architecture & Review Document

> **Version**: 1.0.0  
> **Status**: Comprehensive Analysis & Implementation Review  
> **Repository Roots**:  
> - Backend: `c:\Users\91809\dev\TradeStrix\tradestrix-api`  
> - Frontend: `c:\Users\91809\dev\TradeStrix\tradestrix-web`  
> **Target Route**: [`/harmonic-patterns`](https://frontend.fullstackpythondeveloper.in/harmonic-patterns)  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Codebase & File Architecture Map](#2-codebase--file-architecture-map)
3. [Global Standard Comparison (Carney & Pesavento vs. TradeStrix)](#3-global-standard-comparison-carney--pesavento-vs-tradestrix)
4. [Potential Reversal Zone (PRZ) & Trade Management Standards](#4-potential-reversal-zone-prz--trade-management-standards)
5. [End-to-End System Pipeline & Backend Logic](#5-end-to-end-system-pipeline--backend-logic)
6. [Multi-Timeframe (MTF) Fractal Confluence Engine](#6-multi-timeframe-mtf-fractal-confluence-engine)
7. [Frontend Architecture & UI Components](#7-frontend-architecture--ui-components)
8. [Comprehensive Gap Analysis & Identified Missing Items](#8-comprehensive-gap-analysis--identified-missing-items)
9. [Actionable Remediation & Upgrade Roadmap](#9-actionable-remediation--upgrade-roadmap)

---

## 1. Executive Summary

The **TradeStrix Harmonic Pattern Intelligence** system is designed for high-precision algorithmic identification, predictive projection, and automated execution of classical and advanced harmonic patterns across Indian equities and major indices (NIFTY 50, BANK NIFTY, FIN NIFTY, MIDCPNIFTY).

The platform features:
1. **Incremental, zero look-ahead bias pattern detection** utilizing an ATR-filtered dual-track swing pivot engine.
2. **Predictive Point D projection** enabling dual-stage trading:
   - *Stage 1*: Scalping the C -> D expansion leg into the PRZ.
   - *Stage 2*: Trading the primary reversal out of the Potential Reversal Zone (PRZ) toward multi-tier Fibonacci targets.
3. **Top-Down Multi-Timeframe (MTF) Confluence** combining Macro structure (1D / 4H / 1H) with Micro entry triggers (15m / 5m / 3m), Break of Structure (BOS), candlestick reversals, RSI momentum divergence, and live Option Chain Open Interest (OI) / Put-Call Ratio (PCR) analysis.
4. **Autonomous background daemons and SQLite persistence** tracking pattern lifecycles (`OPEN`, `T1_HIT`, `T2_HIT`, `SL_BREACHED`, `EXPIRED`) with dedicated paper-trading and auto-execution engines.

---

## 2. Codebase & File Architecture Map

### A. Backend: `tradestrix-api`
| Component | File Path | Primary Responsibility |
| :--- | :--- | :--- |
| **API Router** | `app/modules/harmonics/api/router.py` | Exposes REST endpoints for scanning, DB queries, MTF confluence, sandbox evaluation, paper trades, and auto-trader daemon. |
| **Pydantic Schemas** | `app/modules/harmonics/api/schemas.py` | Request and response contracts for scans, trades, settings, and wave evaluations. |
| **Pattern Specs** | `app/modules/harmonics/domain/specs.py` | Strict Fibonacci definitions and tolerance bands for 9 harmonic patterns. |
| **Geometric Validation** | `app/modules/harmonics/domain/geometry.py` | 4-point (XABC) and 5-point (XABCD) leg calculations and ratio scoring. |
| **PRZ Calculator** | `app/modules/harmonics/domain/prz.py` | Fibonacci cluster calculation, terminal invalidation stop-loss, and AD target ladders. |
| **Pivot Detection** | `app/modules/harmonics/domain/pivots.py` | Stateful `DualTrackPivotDetector` ensuring no look-ahead bias and noise consolidation. |
| **Pattern Engine** | `app/modules/harmonics/application/engine.py` | Unified engine coordinating pivot feeds, candle updates, and pattern transitions. |
| **Point D Predictor** | `app/modules/harmonics/application/d_predictor.py` | Mathematical projection of Point D and C->D scalp trade setup before pattern completes. |
| **MTF Confluence** | `app/modules/harmonics/application/mtf_confluence.py` | Fractal Macro-to-Micro multi-timeframe evaluator, RSI divergence, BOS, and Option Chain OI. |
| **Universe Scanner** | `app/modules/harmonics/application/scanner.py` | Parallel multi-threaded universe scanner across Indices and F&O Stocks. |
| **Auto-Scanner Daemon** | `app/modules/harmonics/application/auto_scanner.py` | Background scheduler scanning across Fast, Hourly, and HTF timeframe tiers. |
| **Auto-Trader Daemon** | `app/modules/harmonics/application/auto_trade.py` | Automated execution daemon handling paper and live orders, risk limits, and trailing stops. |
| **Paper Trading Desk** | `app/modules/harmonics/application/paper_trading.py` | SQLite-backed paper trade ledger with real-time mark-to-market and exit monitoring. |
| **Custom Sandbox** | `app/modules/harmonics/application/sandbox.py` | Discretionary coordinate evaluation and on-demand symbol analysis service. |
| **Pattern DB Repository** | `app/modules/harmonics/repositories/pattern_repository.py` | Thread-safe SQLite persistence layer (`logs/harmonic_patterns.db`). |

### B. Frontend: `tradestrix-web`
| Component | File Path | Primary Responsibility |
| :--- | :--- | :--- |
| **Page Route** | `app/harmonic-patterns/page.tsx` | Next.js App Router entry rendering the Harmonic Shell. |
| **Main Scanner Shell** | `components/harmonic-pattern-scanner-shell.tsx` | Master console controlling views, filters, status indicators, and modal triggers. |
| **Predictive D Modal** | `components/harmonic-predictive-d-modal.tsx` | Interactive modal visualizing Point D roadmap, C->D expansion, PRZ zone, and risk-reward. |
| **Inspector Drawer** | `components/harmonic-pattern-inspector-drawer.tsx` | Deep-dive modal inspecting Fibonacci ratio deviations, tolerances, and rule criteria. |
| **Wave & Candle Chart** | `components/harmonic-candle-wave-chart.tsx` | SVG chart rendering dual-stage vectors (C->D expansion & D->Target reversal). |
| **Custom Studio** | `components/harmonic-custom-studio.tsx` | Manual wave evaluator, custom symbol analyzer, and pattern cheatsheet. |
| **Client Engine Rules** | `lib/harmonic-engine/harmonicRules.ts` | Client-side pattern evaluation rules and guidebook trade setups. |
| **Client Pattern Engine** | `lib/harmonic-engine/patternEngine.ts` | Rolling window swing pivot scanner and classical chart pattern detector. |
| **API Client & Types** | `modules/harmonics/api.ts` & `modules/harmonics/types.ts` | TypeScript interfaces and backend HTTP fetchers. |

---

## 3. Global Standard Comparison (Carney & Pesavento vs. TradeStrix)

TradeStrix harmonic definitions are benchmarked against **Scott M. Carney** (*Harmonic Trading Vol. 1 & 2*) and **Larry Pesavento** (*Fibonacci Ratios with Pattern Recognition*):

| Pattern Name | Classification | Primary B-Point (AB / XA) | C-Point Pullback (BC / AB) | D-Point Extension (CD / BC) | Terminal D (AD / XA or XD / XA) | Symmetry (CD / AB) | Global Literature Standard | TradeStrix Backend Alignment | TradeStrix Frontend Parity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Gartley (222)** | Retracement | **0.618** (Exact) | 0.382 - 0.886 | 1.130 - 1.618 | **0.786** | 1.000 (AB=CD) | Carney: B must be strict 0.618; D must not exceed X. | **Aligned** (0.618 B +-4%, 0.786 D +-4%) | **Aligned** in `harmonicRules.ts` |
| **Bat** | Retracement | 0.382 - **0.500** | 0.382 - 0.886 | 1.618 - 2.618 | **0.886** | 1.000 - 1.618 | Carney: B must remain <0.618 (ideal 0.50), D hits deep 0.886. | **Aligned** (0.382-0.500 B, 0.886 D +-3.5%) | **Aligned** in `harmonicRules.ts` |
| **Alternate Bat** | Extension | **0.382** (Strict) | 0.382 - 0.886 | 2.000 - 3.618 | **1.130** | 1.000 - 1.618 | Carney: B exact 0.382; D extends past X to 1.130. | **Aligned** in `specs.py` | Missing in `harmonicRules.ts` |
| **Butterfly** | Extension | **0.786** (Deep) | 0.382 - 0.886 | 1.618 - 2.618 | **1.272 - 1.618** | 1.000 - 1.618 | Carney: B must reach 0.786; D must extend beyond X. | **Aligned** (0.786 B, 1.272-1.618 D) | **Aligned** in `harmonicRules.ts` |
| **Crab** | Extension | 0.382 - **0.618** | 0.382 - 0.886 | 2.240 - 3.618 | **1.618** (Extreme) | 1.000 - 1.618 | Carney: Extreme pattern; 1.618 XA extension is mandatory. | **Aligned** (0.382-0.618 B, 1.618 D) | **Aligned** in `harmonicRules.ts` |
| **Deep Crab** | Extension | **0.886** (Deep) | 0.382 - 0.886 | 2.240 - 3.618 | **1.618** (Extreme) | 1.000 - 1.618 | Carney: Variant of Crab where B is 0.886 and D hits 1.618. | **Aligned** in `specs.py` | Missing in `harmonicRules.ts` |
| **Cypher** | Non-Carney (Advanced) | 0.382 - **0.618** | **1.272 - 1.414** (Extends A) | 1.272 - 2.000 | **0.786 of XC** | N/A | Darren Fischer: Point C exceeds Point A; D is 0.786 of XC. | **Aligned** in `specs.py` | **Aligned** in `harmonicRules.ts` |
| **Shark** | Emerging (5-0) | 0.500 - 0.886 | **1.130 - 1.618** (Extends A) | 1.618 - 2.240 | **0.886 - 1.130** | N/A | Carney: 0XABC structure; Point C extends beyond Point A. | **Aligned** in `specs.py` | **Aligned** in `harmonicRules.ts` |
| **AB=CD** | Reciprocal Foundation | 0.382 - 0.886 | 0.382 - 0.886 | 1.130 - 2.618 | 0.618 - 1.618 | **1.000** (Strict) | Pesavento & Carney: Leg length & time symmetry (|AB|=|CD|). | **Aligned** in `specs.py` | Missing in `harmonicRules.ts` |

---

## 4. Potential Reversal Zone (PRZ) & Trade Management Standards

```
                     (Bullish Gartley Example)
        X                                            Target 3 (Point A)
         \                                          /
          \                  C                     / Target 2 (0.618 AD)
           \                / \                   /
            \              /   \                 / Target 1 (0.382 AD)
             \            /     \               /
              \          /       \             /
               \        /         \           /
                \      /           \         /
                 \    /             \       /
                  \  /               \     /
                   B                  \   /
                                       \ /
             =========================== D === PRZ High
             [ Potential Reversal Zone ] |
             ============================= PRZ Low
             ----------------------------- Terminal Stop Loss
```

### A. PRZ Multi-Ratio Convergence Formula
In `PRZCalculator.calculate_prz`:
1. **AD / XA Primary Retracement / Extension**: A +- (Ratio_AD * |XA|)
2. **CD / BC Secondary Projection**: C +- (Ratio_CD_BC * |BC|)
3. **CD / AB Harmonic Symmetry**: C +- (Ratio_CD_AB * |AB|)

The narrow range defined by the minimum and maximum of these converged price points forms the **PRZ Cluster**:
- `PRZ Low = min(P1, P2, P3)`
- `PRZ High = max(P1, P2, P3)`
- `PRZ Mid = average(P1, P2, P3)`
- `Cluster Width = PRZ High - PRZ Low`

### B. Terminal Invalidation & Stop Loss Rules
Standardized by pattern classification:
- **Retracement Patterns (Gartley, Bat)**:
  - If Bullish: Price must not break below Point X.
  - `Terminal Stop = min(X, PRZ Low) - max(0.5 * ATR, 0.25 * Cluster Width)`
- **Extension Patterns (Butterfly, Crab, Deep Crab)**:
  - Price legally expands beyond Point X.
  - `Terminal Stop = PRZ Bound +- max(0.5 * ATR, 0.25 * Cluster Width)`

### C. Target Ladder Formulation
- **Target 1**: D +- (0.382 * |AD|) *(Move protective SL to Breakeven)*
- **Target 2**: D +- (0.618 * |AD|) *(Golden ratio target - take 70% profits)*
- **Target 3**: Retest of Point A swing extreme.

---

## 5. End-to-End System Pipeline & Backend Logic

```
   Broker Market Data Feed
            │
            ▼
   PatternIntelligenceEngine (application/engine.py)
            │
            ├─► DualTrackPivotDetector (domain/pivots.py)
            │      └─ Track 1: Confirmed pivots (zero look-ahead bias)
            │      └─ Track 2: Tentative live swings
            │
            ├─► 4 Swings Confirmed (X, A, B, C)
            │      └─► HarmonicDPredictor (application/d_predictor.py)
            │            └─ Mathematical Point D Projection & C->D Scalp Roadmap
            │            └─ Stores in SQLite: forming_prediction_json
            │
            └─► 5 Swings Confirmed (X, A, B, C, D)
                   └─► Geometry & PRZ Validation (domain/geometry.py & domain/prz.py)
                   └─► MTF Fractal Confluence Evaluator (application/mtf_confluence.py)
                         ├─ Micro Break of Structure (BOS)
                         ├─ Reversal Candlestick (Hammer, Engulfing, Shooting Star)
                         ├─ Wilder's RSI Divergence
                         └─ Option Chain PE/CE Open Interest & PCR
                   └─► Persistent Database Upsert (repositories/pattern_repository.py)
                   └─► HarmonicAutoTradeService / PaperTradeService Evaluation
```

---

## 6. Multi-Timeframe (MTF) Fractal Confluence Engine

Implemented in `app/modules/harmonics/application/mtf_confluence.py`:

### A. Four Readiness Stages
1. **`MICRO_TRIGGER_CONFIRMED`** (Highest Execution Priority):
   - Price has reached the Macro (1D / 4H / 1H) PRZ.
   - Lower timeframe (3m / 5m) shows confirmed Break of Structure (BOS) or reversal candlestick.
2. **`IN_PRZ_MONITORING`**:
   - Price is inside Macro PRZ bounds ([PRZ Low, PRZ High]) but micro breakout has not yet printed.
3. **`MACRO_DETECTED`**:
   - Macro pattern is valid, but price is still traveling from Point C to Point D.
4. **`INVALIDATED`**:
   - Price breached the stop-loss / terminal invalidation level.

### B. Micro Confirmation Indicators
- **Break of Structure (BOS)**: Bar close breaking above the highest high (bullish) or below the lowest low (bearish) of the preceding 4 micro bars.
- **Candlestick Patterns**: Bullish Engulfing, Hammer Pinbar, Bearish Engulfing, Shooting Star.
- **Wilder's RSI Divergence**: Regular Bullish Divergence (price lower low, RSI higher low) or Bearish Divergence (price higher high, RSI lower high).
- **Option Chain Institutional S/R**:
  - Computes dynamic Put-Call Ratio (PCR).
  - Determines Max Pain and detects PE/CE Open Interest buildup near PRZ boundaries.

---

## 7. Frontend Architecture & UI Components

The web application provides 6 distinct operational modes in `components/harmonic-pattern-scanner-shell.tsx`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TradeStrix Harmonic Console                     │
├─────────────┬─────────────┬─────────────┬─────────────┬────────────────┤
│ 1. Database │ 2. Live     │ 3. MTF      │ 4. Emerging │ 5. Paper Desk  │
│    Patterns │    Scan     │    Matrix   │    Point D  │    & Auto-Trade│
├─────────────┴─────────────┴─────────────┴─────────────┴────────────────┤
│  Filters: Timeframe [All/3m..1M] | Quality [>=0.65] | Status [All/PRZ] │
├────────────────────────────────────────────────────────────────────────┤
│  Data Table: Symbol | Pattern | Direction | PRZ Zone | Target | Status │
├────────────────────────────────────────────────────────────────────────┤
│  Interactive Modals:                                                   │
│  - HarmonicPredictiveDModal: Point D Roadmap, C->D expansion SVG       │
│  - HarmonicPatternInspectorDrawer: Fibonacci ratio measurement drawer  │
│  - HarmonicCustomStudio: Discretionary wave entry & cheatsheet table   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Comprehensive Gap Analysis & Identified Missing Items

Our deep-dive code review revealed the following discrepancies:

| Item # | Area | Issue Description | Root Cause File | Impact |
| :---: | :--- | :--- | :--- | :--- |
| **GAP-01** | **Pattern Catalog Parity** | The backend defines **9 patterns** in `specs.py`, but the client-side engine in `harmonicRules.ts` only defines **6 patterns** (missing **Alternate Bat**, **Deep Crab**, and **AB=CD**). | `lib/harmonic-engine/harmonicRules.ts` | Client inspector cannot evaluate Alternate Bat, Deep Crab, or AB=CD patterns detected by the backend. |
| **GAP-02** | **Target Formula Divergence** | Backend calculates targets based on the AD leg (0.382*AD, 0.618*AD, Point A). Frontend rules in `harmonicRules.ts` calculate targets using Point B, Point C, or 0.618*CD. | `lib/harmonic-engine/harmonicRules.ts` vs `prz.py` | Targets displayed in the Inspector Drawer may differ from the targets in the main scanner table. |
| **GAP-03** | **Index Option Execution** | The auto-trader buys/sells index units using `index_quantity` (e.g. 25 shares of NIFTY). In Indian markets, index derivatives require trading Call (CE) or Put (PE) option contracts. | `application/auto_trade.py` | Live execution on indices will be rejected or trade spot rather than options contracts. |
| **GAP-04** | **1-Minute Timeframe Support** | Router docstrings advertise `1m`, but `SUPPORTED_TIMEFRAMES` in `scanner.py` starts at `3m`. | `application/scanner.py` | 1-minute intraday scans will fall back to default tiers. |
| **GAP-05** | **Real-Time Tick PRZ Triggering** | Active paper trades and auto-trades update via a periodic polling loop (15s default). Fast reversals can touch the PRZ and exit between intervals. | `application/auto_trade.py` | Slight slippage on fast intra-candle PRZ bounces. |
| **GAP-06** | **Custom Studio Auto-Pivots** | The Custom Studio requires manual price input for X, A, B, C, D. When selecting an instrument, it should offer to prefill the coordinates using the latest detected swing pivots. | `components/harmonic-custom-studio.tsx` | Discretionary traders must manually type all 5 coordinate prices. |

---

## 9. Actionable Remediation & Upgrade Roadmap

```
Step 1: Pattern Catalog & Target Parity
  - Add Alt Bat, Deep Crab, AB=CD to harmonicRules.ts
  - Harmonize Target 1/2/3 formulas to AD standard
        │
        ▼
Step 2: Index Option Integration
  - Route Bullish PRZ to ATM CE
  - Route Bearish PRZ to ATM PE
        │
        ▼
Step 3: Timeframe & Tick Pipeline
  - Add 1m support to SUPPORTED_TIMEFRAMES
  - Connect Redis tick stream for real-time PRZ triggers
        │
        ▼
Step 4: Custom Studio UX
  - Auto-populate XABCD from confirmed pivots
```

### Action Checklist
- [ ] **Step 1: Synchronize Pattern Rules (`harmonicRules.ts`)**
  - Add `Alternate Bat` (0.382 B, 1.130 D).
  - Add `Deep Crab` (0.886 B, 1.618 D).
  - Add `ABCD` (equal leg symmetry).
  - Standardize Target formulas to match backend AD ratios.
- [ ] **Step 2: Connect Option Strike Selection for Index Auto-Trades**
  - When `kind == 'index'`, lookup weekly ATM/OTM options using `get_option_chain`.
  - Transact CE contracts on Bullish PRZ; PE contracts on Bearish PRZ.
- [ ] **Step 3: Extend Timeframe Alignment**
  - Verify broker adapter support for 1m candle feeds and add `1m` to `FAST_TIMEFRAMES`.
- [ ] **Step 4: Enhance Custom Studio Workflow**
  - Add an "Auto-Fill Latest Pivots" button to populate X, A, B, C, D directly from the chart.
