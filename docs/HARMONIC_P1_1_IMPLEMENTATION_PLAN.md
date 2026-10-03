# P1.1 — Canonical Ratio Vocabulary & Pattern Topology Contracts

> **Phase**: P1.1 (with P1.1b defined) of the Governed Phase-1 Remediation Roadmap
> **Authority**: [`HARMONIC_INTELLIGENCE_REVIEW.md`](./HARMONIC_INTELLIGENCE_REVIEW.md) **v2.2.3**
> **Spec version to be stamped**: `harmonics-2.2.3`
> **Status**: **CONTRACT FROZEN — IMPLEMENTATION NOT AUTHORIZED**
> **Owner**: Chief Architect
> **Last updated**: 2026-10-03
> **Repositories**: `tradestrix-api` (branch `review/harmonic-features-analysis`), `tradestrix-web` (same branch, **not touched by P1.1**)

---

## Hard Stop Gate

**P1.1 implementation may not begin until this plan and v2.2.3 of the architecture document are explicitly approved by the owner.**

This document is a plan. It contains no production code. Nothing in `app/`, `tests/`, the database, the API, or the frontend has been modified to produce it.

---

## Table of Contents

1. [Objective & Non-Objectives](#1-objective--non-objectives)
2. [Verified Current-State Defects](#2-verified-current-state-defects)
3. [Domain Model Design](#3-domain-model-design)
4. [Pattern Contracts](#4-pattern-contracts)
5. [Scoring Design](#5-scoring-design)
6. [PRZ Compatibility](#6-prz-compatibility)
7. [D-Predictor Compatibility](#7-d-predictor-compatibility)
8. [Sandbox Compatibility](#8-sandbox-compatibility)
9. [Façade Compatibility](#9-façade-compatibility)
10. [Runtime Activation Boundary](#10-runtime-activation-boundary)
11. [File Scope](#11-file-scope)
12. [Implementation Order](#12-implementation-order)
13. [Test Scope](#13-test-scope)
14. [Acceptance Criteria](#14-acceptance-criteria)
15. [P1.1b Scope](#15-p11b-scope)
16. [Risk Register](#16-risk-register)
17. [Stop Condition](#17-stop-condition)

---

## 1. Objective & Non-Objectives

### Objective

Freeze a canonical, immutable ratio-token vocabulary and explicit pattern-topology contracts in the harmonics **domain layer**, and correct the Cypher and Shark coordinate models that are mathematically wrong today.

### In scope

- `PatternTopology`, `PatternCoordinates`, `RatioToken` (twelve tokens), `calculate_ratio()`
- `HarmonicPatternSpec` rewritten around a token mapping with capability accessors
- All 9 pattern specs re-declared topology-correct
- **Cypher fully corrected and runtime-active**
- Shark and AB=CD declared native but **runtime-disabled**
- Normalized geometry scoring (fixes the live optional-ratio inversion)
- `prz.py` guards + the missing Cypher `CD_XC` projection
- Minimal compatibility edits in `engine.py`, `d_predictor.py`, `sandbox.py`, façades, affected tests

### Explicitly NOT in scope

| Excluded | Owner phase |
| :--- | :--- |
| PRZ dispersion gating | P1.2 |
| Scoring threshold recalibration | P1.2 |
| Target architecture / execution ladder changes | P1.3 |
| Sandbox D-projection sign-bug fix (GAP-11) | P1.3 |
| API contract changes, provenance persistence | P1.4 |
| Golden parity suite (18 fixtures), replay determinism | P1.5 |
| Frontend `harmonicRules.ts`, inspector parity | P1.6 |
| Runtime detection for `OXABC` / `ABCD` | **P1.1b** |
| `app/core/harmonics.py` convergence (GAP-08) | Unassigned |
| Option routing, Redis ticks, 1m onboarding, UI | Out of Phase 1 |

---

## 2. Verified Current-State Defects

Each measured against live code during reconciliation. These are the reasons P1.1 exists.

| ID | Defect | Evidence |
| :-- | :--- | :--- |
| GAP-00 | Cypher attaches 0.786 to `ad_xa` instead of `CD_XC`, and 1.272–1.414 to `bc_ab` instead of `XC_XA` | `specs.py:103,105`. **Canonical sweep: 2 of 12 textbook Cyphers pass** `validate_completed_xabcd` |
| GAP-00 | Predictor and validator disagree for Cypher | `d_predictor.py:170-178` projects via $CD/XC$; `geometry.py:146` validates via `spec.ad_xa`. Predictor emits D values the validator refuses |
| GAP-00 | Exposed contract is self-inconsistent | `predicted_d_mid = 27.820` reported alongside `target_xd_xa = [0.755, 0.817]`; that D's actual `AD_XA` is **0.7218** |
| GAP-07 | A canonical Shark cannot match its own spec | `specs.py:92-99` sets `ab_xa = 0.500–0.886`; Pine-canonical `AB_XA = 1.3000` is **out of range**. Whatever is flagged "Shark" today is a different geometry |
| GAP-07 | Shark's 0.886–1.130 band is misfiled under `ad_xa` | `specs.py:97` — a token requiring a Point D that `OXABC` does not have |
| GAP-07 | AB=CD gated on two fabricated ratios | `specs.py:110,113` invent `ab_xa` and `ad_xa` for a pattern with no X |
| GAP-09 | Optional-ratio scoring inversion (live) | `geometry.py:159-163`: `cd_ab` scoring `0.0` is dropped (4-ratio weights); scoring `0.01` is included at weight 0.20. **Failing scores better than passing weakly** |
| GAP-10 | `prz.py` reads `spec.ad_xa.target` unconditionally | `prz.py:40`, invoked for every pattern via `engine.py:170,231`; feeds `invalidation_price` / `terminal_stop` → auto-trader |
| GAP-11 | Sandbox publishes `XD_XA` but validates against `AD_XA`; mis-projects D from X | `sandbox.py:160,235-236,258-261` |
| GAP-08 | Second live harmonic authority | `app/core/harmonics.py` (461 lines) live via `app/core/strategies.py:6,272` |

**Regression baseline (must not degrade):** `19 passed` across `app/modules/harmonics/tests/`, `tests/test_pattern_intelligence_{geometry,d_predictor,prz}.py`, `tests/test_harmonic_engine.py`. Textbook Gartley bullish geometry score: **0.9656**.

---

## 3. Domain Model Design

### 3.1 `PatternTopology`

```python
class PatternTopology(str, Enum):
    XABCD = "XABCD"
    OXABC = "OXABC"
    ABCD  = "ABCD"
```

`str` mixin for free JSON serialization. Each member exposes `required_points() -> frozenset[str]`.

### 3.2 `PatternCoordinates`

```python
@dataclass(frozen=True)
class PatternCoordinates:
    topology: PatternTopology
    o: PivotPoint | None = None
    x: PivotPoint | None = None
    a: PivotPoint | None = None
    b: PivotPoint | None = None
    c: PivotPoint | None = None
    d: PivotPoint | None = None
```

`__post_init__` enforces that exactly the topology's mandatory points are non-null and that no extraneous point is supplied (`OXABC` with a `d`, `ABCD` with an `x`).

**Rejected alternatives:**

| Option | Rejected because |
| :--- | :--- |
| `Mapping[str, PivotPoint]` | Stringly-typed keys reintroduce the exact overloading the Ratio Token Invariant forbids; no type checking; unvalidatable |
| Per-topology dataclasses | 3 topologies × forming/completed = 6 classes plus `isinstance` branching at every consumer |

**`PivotPoint` stays unchanged.** It is a pure price/time/kind value object and must not know its structural role in a pattern.

### 3.3 `RatioToken` — twelve tokens, frozen

```python
class RatioToken(str, Enum):
    AB_XA           = "AB_XA"            # |B-A| / |A-X|
    BC_AB           = "BC_AB"            # |C-B| / |B-A|
    CD_BC           = "CD_BC"            # |D-C| / |C-B|
    AD_XA           = "AD_XA"            # |D-A| / |A-X|
    CD_AB           = "CD_AB"            # |D-C| / |B-A|
    CD_XC           = "CD_XC"            # |D-C| / |C-X|
    XC_XA           = "XC_XA"            # |C-X| / |A-X|
    BC_OX           = "BC_OX"            # |C-B| / |X-O|
    XC_OX           = "XC_OX"            # |C-X| / |X-O|
    OA_OX           = "OA_OX"            # |A-O| / |X-O|
    AC_XA           = "AC_XA"            # |C-A| / |A-X|
    XD_XA_OVERSHOOT = "XD_XA_OVERSHOOT"  # |D-X| / |A-X|  (diagnostic only)
```

`OC_OX` **must never be implemented as completion** — asserted by a negative test (evaluates to 0.000 at origin retest C=O). `XB_XA` is documented-only Carney source mapping (TradeStrix intentionally uses Ultimate/Pine `AB_XA`).

Each token declares its required coordinate set, validated against `topology.required_points()` **at spec construction time**, so a malformed spec fails at import rather than in the scanner during market hours.

### 3.4 `calculate_ratio`

```python
def calculate_ratio(token: RatioToken, points: PatternCoordinates) -> float | None
```

Single formula chokepoint. **Do not expose a public `RATIO_CALCULATORS` dict.**

| Condition | Behavior |
| :--- | :--- |
| Degenerate denominator (zero-length leg) | return `None` |
| Token needs a coordinate the topology lacks | raise typed `TopologyError` |
| Normal | return the float |

**Do not use `max(denominator, 1e-9)`** (as `geometry.py:41,45,50,55` does today): it converts a zero-length leg into a ~10⁹ ratio that scores `0.0` and is indistinguishable from an ordinary tolerance miss. `None` means "not calculable" (a data condition, handled); `TopologyError` means "programming error" (raised loudly).

**Performance**: compute each token **once per coordinate set** and share across specs. Today `calculate_legs` is re-invoked per spec — 9 specs × 2 windows per confirmed pivot in `engine.py`, and 9 specs × up to 3 windows per symbol across a parallel universe scan.

### 3.5 `HarmonicPatternSpec`

```python
@dataclass(frozen=True)
class HarmonicPatternSpec:
    name: str
    topology: PatternTopology
    ratios: Mapping[RatioToken, RatioTolerance]
    required_ratios: tuple[RatioToken, ...]
    optional_ratios: tuple[RatioToken, ...] = ()
    allow_alternate_d: bool = False
    description: str = ""
```

Accessors: `has_ratio(token)`, `get_ratio(token) -> RatioTolerance | None`, `require_ratio(token) -> RatioTolerance` (raises if absent).

`__post_init__` must validate that `required_ratios` and `optional_ratios` **exactly partition** `ratios.keys()`. Three independent parallel structures can disagree; a token listed as required but absent from `ratios` must be an import-time error, not a silent misconfiguration.

**`allow_alternate_d`**: keep as-is in P1.1 (minimum churn). It is semantically an extension-vs-retracement discriminator driving PRZ stop placement (`prz.py:79-93`), not a permission, and it is meaningless under `OXABC`. Mark misnamed in the docstring; rename only if P1.1b touches it anyway.

### 3.6 Dual-path transition

During steps 3–4 of the implementation order, retain the five legacy fields (`ab_xa`, `bc_ab`, `cd_bc`, `ad_xa`, `cd_ab`) as **read-only properties derived from the `ratios` mapping**. This keeps `prz.py`, `d_predictor.py`, and `sandbox.py` compiling untouched while `geometry.py` migrates, confining the blast radius to the domain layer. The shim is removed in step 9.

---

## 4. Pattern Contracts

Authoritative source: [`HARMONIC_INTELLIGENCE_REVIEW.md` §4.D](./HARMONIC_INTELLIGENCE_REVIEW.md). Summarized here for implementation.

### 4.1 Standard XABCD (6 patterns) — UNCHANGED

Gartley, Bat, Alternate Bat, Butterfly, Crab, Deep Crab. Topology `XABCD`, completion D.
Required `AB_XA`, `BC_AB`, `CD_BC`, `AD_XA`; optional `CD_AB`.

**`CD_AB` Historical Impact Characterization (Step 1, mandatory)** — each pattern is measured against **its own current governed tolerance**, read from `app/modules/harmonics/domain/specs.py`. There is **no** universal `CD_AB` band and none may be invented:

| Pattern | Current governed `CD_AB` (target / min / max) |
| :--- | :--- |
| Gartley | 1.0000 / 0.9400 / 1.0600 |
| Bat | 1.2720 / 1.0000 / 1.6180 |
| Alternate Bat | 1.2720 / 1.0000 / 1.6180 |
| Butterfly | 1.2720 / 1.0000 / 1.6180 |
| Crab | 1.2720 / 1.0000 / 1.6180 |
| Deep Crab | 1.2720 / 1.0000 / 1.6180 |

Per-pattern report fields: pattern name · current `CD_AB` tolerance · total completed detections · count outside `is_within()` · count where legacy `CD_AB` score == 0 · count that would become invalid if `CD_AB` becomes REQUIRED · percentage impact · **legacy** `geometry_score` distribution · **candidate** `geometry_score` distribution.

Then **STOP FOR GOVERNED REVIEW**. Classification must not be auto-selected from a percentage threshold — see review doc §4.E.1 for the three permitted outcomes.

**Regression behavior for these six patterns is governed by the CD_AB decision**:
- Step 1 captures existing baseline scores/detections before any change.
- If `CD_AB` is approved as REQUIRED: compare validity and score distribution with baseline; no undocumented score change permitted.
- If `CD_AB` remains OPTIONAL evidence-only: it no longer participates in `geometry_score` under Option A; create an explicit governed rebaseline rather than claiming bit-identical score parity.
- In either outcome: preserve old baseline for audit; document old vs new score behavior; no silent rebaseline.

### 4.2 Cypher — CORRECTED, runtime-active

```
topology : XABCD           completion: D
required : AB_XA  0.382 - 0.618   target 0.500
           XC_XA  1.272 - 1.414   target 1.272   (C extends beyond A)
           CD_XC  0.786 exact, band 0.7546 - 0.8174
optional : (none)
REMOVE   : AD_XA, BC_AB, CD_BC, CD_AB
```

`AD_XA` **must be actively removed**, not merely unused. Because `ad_xa` is a non-Optional field today, leaving it is the path of least resistance and GAP-00 would survive the phase intact.

### 4.3 Shark — CORRECTED, runtime-disabled (v2.2.3)

```
topology : OXABC           completion: C   (no Point D exists)
sequence : O -> X -> A -> B -> C, strictly alternating
required : AB_XA  1.130 - 1.618   target 1.300   [Ultimate / Pine Lineage]
           BC_OX  1.080 - 1.200   target 1.130   [LIT target 1.130; acceptance band is POLICY]
           XC_OX  0.886 - 1.130   target 1.000   [LIT origin retest: 1.000 at C=O]
optional : OA_OX  0.382 - 0.618   target 0.500   [Carney differentiating filter]
           AC_XA  1.618 - 2.240   target 1.900   [Carney Extreme Impulse anchor]
REMOVE   : OC_OX, AD_XA, BC_AB, CD_BC, CD_AB
```

Two independent completion constraints, both mandatory — `BC_OX` alone does not enforce the origin retest. `XC_OX` is the physical origin retest ($1.000$ at $C=O$). `AB_XA` is from the Ultimate Guide / TradeStrix Pine script lineage (`NK-HARMONIC-ENGINE.pine:301`). Optional `OA_OX` and `AC_XA` provide Carney confluence evidence without affecting P1.1 geometry scores.

### 4.4 AB=CD — CORRECTED, runtime-disabled

```
topology : ABCD            completion: D   (no Point X exists)
required : BC_AB  0.382 - 0.886   target 0.618
           CD_BC  1.130 - 2.618   target 1.618
           CD_AB  1.000 exact, band 0.94 - 1.06
optional : (none)
REMOVE   : AB_XA, AD_XA  (both currently fabricated AND gating detection)
```

Price symmetry only. Time symmetry deferred — it needs a non-price tolerance type and would shift `quality_score` → `is_tradable` → live auto-trade.

Prior art: `app/core/harmonics.py:98-100` already models `abcd` natively (`ab_xa=None`), and is more topologically correct than the current modular spec.

---

## 5. Scoring Design

### 5.1 Validity

Gate required ratios on `RatioTolerance.is_within()` — a boolean — **not** on `score() > 0`. The codebase carries two tolerance models with different semantics and uses only the decay one; `is_within()` has zero readers today. P1.1 makes the boolean authoritative for validity.

### 5.2 Required vs optional — OPTION A (FROZEN)

> **Optional ratios are computed and emitted, but NEVER enter `geometry_score` and NEVER affect the denominator.**

| Condition | Required | Optional |
| :--- | :--- | :--- |
| Non-calculable | **invalid** | valid; **not scored**, emitted as evidence only |
| Outside tolerance | **invalid** | valid; **not scored**, emitted as evidence only |
| Inside tolerance | scored | **not scored**, emitted as evidence only |

```
Required ratios
  - gate validity (hard pass/fail via RatioTolerance.is_within())
  - participate in geometry_score

Optional ratios
  - NEVER gate validity
  - NEVER participate in geometry_score in P1.1
  - emitted only as separate evidence / confluence metadata
```

### 5.3 Normalization — REQUIRED RATIOS ONLY

$$\text{geometry\_score} = \frac{\sum_i \text{required\_score}_i \cdot \text{required\_weight}_i}{\sum_i \text{required\_weight}_i}$$

with weights from `RatioTolerance.weight` (exists today, zero readers — P1.1 makes it authoritative).

Because the denominator is fixed by the spec's **required** set, it cannot vary with the data: **no hidden denominator changes**. Normalization also makes the score topology-invariant, so families with fewer required ratios are not systematically advantaged against a single global `min_quality_score`.

**Why not Option B** (optional ratios kept in a normalized denominator): it removes the inversion but retains data-dependent denominator movement, and it would change live behavior for the six standard XABCD patterns — today a `cd_ab` scoring `0.0` is dropped, whereas under B it would be included at weight 0.20, lowering every affected score. Rejected.

Regression consequences for the six standard XABCD patterns are governed by the **CD_AB decision** — see §4.1 and §9. No unconditional bit-identical claim may be made while that decision is open.

### 5.4 Deliberately deferred

- **No optional-ratio bonus in `geometry_score`.** Emit optional fit into `ratio_deviations` as separate evidence. A bonus would re-couple the denominator and re-create GAP-09. Whether confluence consumes it is P1.2/P1.3.
- **No threshold changes.** `min_quality_score` 0.65 and `is_tradable` 0.70 stay as-is. Recalibration belongs to P1.2 with the dispersion gate.

---

## 6. PRZ Compatibility

**Decision: topology-specific with clean rejection (Approach B), plus one mandatory exception.** Generalizing PRZ across `AD_XA` / `CD_XC` / `BC_OX` is PRZ redesign and belongs to P1.2.

Required in P1.1:

1. Replace the unconditional `spec.ad_xa.target` read (`prz.py:40`) with `has_ratio` / `get_ratio` guards. **Skip absent projections — never default-fill.** A fabricated projection silently widens `prz_low`/`prz_high`, setting `invalidation_price` and `terminal_stop`, which the auto-trader consumes as a stop loss.
2. **Add a Cypher `CD_XC` projection branch.** Not scope creep — mandatory. Cypher stays runtime-active, and once `AD_XA` leaves its spec Cypher would otherwise have **zero** PRZ projections. `d_predictor.py:170-178` already computes exactly this; `prz.py` is simply missing it, which is why the two disagree today.
3. `calculate_prz` **rejects cleanly** (typed error) for non-`XABCD` topology. Safe because Shark/ABCD detection is disabled.

**Ordering constraint**: the guard must land **before or with** the Cypher spec change — never after.

---

## 7. D-Predictor Compatibility

**Decision: `HarmonicDPredictor` stays XABCD-only.**

- `d_predictor.py:439-447` slides 4-pivot $X,A,B,C$ windows and runs **all 9 specs**. Under `OXABC` those four pivots are $O,X,A,B$ and the projected target is **C, not D** — a different problem with different inputs, outputs, and stop semantics. **Shark is excluded from the spec loop, not adapted.**
- AB=CD is likewise excluded: `PredictiveDProjection` requires non-null `x/a/b/c` (`models.py:155-158`), so a native `ABCD` cannot populate it.

### Field handling — deprecate in place, do not rename

`target_xd_xa_min/max` and `ratio_bc_xa` are serialized to the Predictive D modal; renaming is a frontend-visible API change and out of scope.

| Field | Problem | P1.1 action |
| :--- | :--- | :--- |
| `target_xd_xa_*` | Populated from `spec.ad_xa` (`d_predictor.py:68-69`) under an `XD_XA` name — mislabel per §4.A, and numerically excludes the engine's own projected D | Populate correctly or `None`; mark deprecated in docstring; add correctly-named fields alongside |
| `ratio_bc_xa` | Commented *"Relevant for Cypher / Shark"*, computed as `\|C-B\|/\|A-X\|` (`d_predictor.py:368`) — neither `XC_XA` nor `BC_OX`; serves no pattern correctly. The exact single-field overloading the invariant forbids | Deprecate; replace in P1.1b |

---

## 8. Sandbox Compatibility

**Decision: isolate, do not fix.**

`sandbox.py` reads `spec.ab_xa/.bc_ab/.cd_bc/.ad_xa` at 6 sites (lines 185–236) and will not compile against the new `ratios` mapping, so a **mechanical token-accessor migration is unavoidable**.

But its behavioral defects (GAP-11) are **not fixed in P1.1**:

- `XD_XA` published then validated against `spec.ad_xa` bounds (lines 160, 235-236)
- D projected from `x_price` instead of `a_price` for ratios ≤ 1.0 (lines 258-261), pushing bullish D below X — structurally invalid for Gartley/Bat
- Four non-canonical ratio names emitted: `XD_XA`, `BC_XA`, `AC_XA`, `AC_AB`

Rationale: this is a discretionary analysis tool with **no order path**. Fixing it changes Harmonic Lab output, which is a behavior change outside a vocabulary phase. Tracked for P1.3.

---

## 9. Façade Compatibility

`app/services/pattern_intelligence/*.py` is a 17-file re-export shim. `geometry.py` re-exports `validate_forming_xabc` and `validate_completed_xabcd` **by name**, and `tests/test_pattern_intelligence_{geometry,d_predictor,prz}.py` import through it.

**Renaming these to generic `validate_forming` / `validate_completed` breaks the façade at import time — failing the entire test session, not just affected tests.**

Approach: introduce the generic validators and keep the old names as **thin aliases** in both `domain/geometry.py` and `domain/__init__.py`, updating the façade in lockstep. Add a one-line import smoke test. Cheap, but must be enumerated rather than discovered.

---

## 10. Runtime Activation Boundary

Authoritative: [`HARMONIC_INTELLIGENCE_REVIEW.md` §4.G](./HARMONIC_INTELLIGENCE_REVIEW.md).

| Topology | Domain (P1.1) | Runtime detection | PRZ | Predictor | Persistence / API |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `XABCD` | frozen | **active** | active | active | active |
| `OXABC` | frozen | **disabled** | rejects | excluded | withheld |
| `ABCD` | frozen | **disabled** | rejects | excluded | withheld |

**Enforcement**: one topology allow-list defaulting to `{XABCD}`, consulted by `engine.py`, `d_predictor.py`, `prz.py`, and the scanner. One switch in one reviewable place — not scattered conditionals — so P1.1b flips it atomically.

**Never invent fake X/D coordinates. Never disguise `OXABC` as `XABCD`.** Metadata remapping (O → `metadata`, C → `d_price`) is explicitly prohibited by §4.F: the disguise propagates into targets, lifecycle, persistence, and the live order path, and is unfalsifiable at runtime because nothing downstream can distinguish a synthetic D from a real one.

**Accepted regression**: Shark detection stops during P1.1. Deliberate and logged. Strictly better than the status quo, where a canonical Shark cannot match its own spec.

---

## 11. File Scope

### Required — core contract

| File | Change |
| :--- | :--- |
| `app/modules/harmonics/domain/models.py` | `PatternTopology`, `RatioToken`, `PatternCoordinates`, `HarmonicPatternSpec` rewrite, accessors |
| `app/modules/harmonics/domain/geometry.py` | `calculate_ratio` registry, token-driven validation, topology-aware `determine_direction`, normalized scoring |
| `app/modules/harmonics/domain/specs.py` | 9 specs → topology + token maps; **fix Cypher, fix Shark**, strip ABCD's fabricated ratios |
| `app/modules/harmonics/domain/prz.py` | **(added to scope — the original plan omitted this)** guards; Cypher `CD_XC` branch; reject non-XABCD |
| `app/modules/harmonics/domain/__init__.py` | export new symbols; preserve legacy names as aliases |

### Compatibility-only — minimal, mechanical

| File | Change |
| :--- | :--- |
| `application/engine.py` | validator call sites; topology allow-list `{XABCD}` |
| `application/d_predictor.py` | guard `ad_xa` reads; exclude Shark + ABCD; deprecate `ratio_bc_xa` |
| `application/sandbox.py` | token accessors at 6 sites **only** (no behavioral fix) |
| `app/services/pattern_intelligence/geometry.py` | façade alias names |
| `tests/test_pattern_intelligence_geometry.py` | imports |
| `tests/test_pattern_intelligence_d_predictor.py` | Cypher expectations (behavior legitimately changes) |

### Must remain untouched

`app/core/harmonics.py` · `app/core/strategies.py` · `application/scanner.py` · `application/mtf_confluence.py` · `application/paper_trading.py` · `application/auto_trade.py` · `application/lifecycle.py` · `application/auto_scanner.py` · `domain/pivots.py` · `domain/scoring.py` · `repositories/pattern_repository.py` · `api/router.py` · `api/schemas.py` · all of `tradestrix-web/`

Verified by grep that `mtf_confluence.py` (uses `spec_name` only), `paper_trading.py`, `auto_trade.py` (uses `pattern_name` only), and `lifecycle.py` do **not** access pivot coordinates and are unaffected.

---

## 12. Implementation Order

Each step must leave the suite green.

| Step | Action | Production delta |
| :-: | :--- | :--- |
| **0** | **Freeze v2.2.3 docs** — owner approval of the architecture document and this plan. Blocking, no code. | none |
| **1** | **Capture regression baseline** (geometry score for 9 specs × bullish/bearish; confirm `19 passed`) **and run the `CD_AB` Historical Impact Characterization** (§4.1, review doc §4.E.1). | none |
| **2** | Introduce `PatternTopology`, `PatternCoordinates`, `RatioToken`, `calculate_ratio()`. Pure addition, nothing consumes it. | **zero** |
| **3** | Refactor `HarmonicPatternSpec`: `topology`, `ratios`, `required_ratios`, `optional_ratios`, accessors, compatibility shim. | zero |
| **4** | Token-based **required-ratio** geometry validation. | zero |
| **5** | Implement **Option A** required-only `geometry_score` (§5). | governed by the Step-6 `CD_AB` decision |
| **6** | **Resolve `CD_AB` classification** from the Step-1 evidence, under governed review. Apply the chosen outcome (REQUIRED / OPTIONAL evidence-only / widened policy band). | per approved outcome |
| **7** | **Correct Cypher** native ratios — remove `AD_XA`/`BC_AB`/`CD_BC`/`CD_AB`, add `XC_XA`/`CD_XC`. Keep **runtime-active**. Sweep 2/12 → 12/12. | **intended: Cypher detection becomes correct** |
| **8** | **Harden `prz.py`** — guards + Cypher `CD_XC` projection branch + clean rejection for non-`XABCD` topology. | zero |
| **9** | Declare Shark `OXABC` and AB=CD `ABCD` native, **both runtime-disabled**. | Shark + AB=CD detection stops (logged) |
| **10** | Minimal compatibility changes: `engine.py`, `d_predictor.py`, `sandbox.py`, domain exports, `pattern_intelligence` façades. Remove the Step-3 shim. | zero |
| **11** | Run tests + regression verification against the Step-1 baseline, then **STOP**. | none |

> **Steps 7 and 8 are order-critical.** The PRZ guard must land **before or with** the Cypher spec change, never after — otherwise `prz.py` either raises or fabricates a projection that reaches the auto-trader as a stop loss. Implementers may run Step 8 ahead of Step 7 but never behind it.

> **Step 6 is a hard governance gate.** `CD_AB` classification must not be inferred from a percentage threshold; it requires explicit owner approval of one of the three outcomes in review doc §4.E.1.

---

## 13. Test Scope

New modules under `app/modules/harmonics/tests/`:

### `test_p1_1_ratio_tokens.py`

- Formula exactness: one case per token, hand-computed expected values, **bullish and bearish sign-invariance**
- **Negative: `XC_OX` must not exist** in `RatioToken` (prevents reintroduction)
- **Negative: `OC_OX` must not exist** in `RatioToken` — it reads 0.000 at the exact origin retest (prevents reintroduction)
- `XC_OX` positive formula assertion: `|C-X| / |X-O|`, target 1.000 at the origin retest
- Degenerate denominator → `None`, **not** a 1e-9-inflated finite value
- Wrong-topology token access → typed `TopologyError`

### `test_p1_1_domain_topology.py`

- Each topology rejects missing mandatory points
- Each topology rejects extraneous points (`OXABC` + `d`, `ABCD` + `x`)
- `PivotPoint` unchanged / carries no topology

### `test_p1_1_pattern_specs.py`

- **Cypher canonical sweep: 12/12 pass** (`XC_XA` ∈ {1.272, 1.30, 1.35, 1.414} × `AB_XA` ∈ {0.382, 0.50, 0.618}) — was 2/12
- `assert not cypher.has_ratio(AD_XA)`; same for `BC_AB`, `CD_BC`, `CD_AB`
- Shark native: `AB_XA = 1.300` validates; `BC_OX` from `|X-O|`; `XC_OX` from `|C-X|`; topology `OXABC`; no `AD_XA`, no `OC_OX`
- Shark optional `OA_OX` / `AC_XA` present but **provably absent from `geometry_score`** (Option A)
- Shark canonical fixture `O=0, X=100, A=50, B=115, C=2` satisfies `AB_XA=1.300`, `BC_OX=1.130`, `XC_OX=0.980` simultaneously
- AB=CD: `CD_AB ≈ 1.000`, no X required, no `AB_XA`/`AD_XA`
- **Six standard XABCD regressions governed against Step-1 baseline**: verify exact score behavior (bit-identical if CD_AB required; governed rebaseline if CD_AB optional evidence-only)
- Spec-catalog invariant: every token's required coordinates ⊆ its topology's points; `required`/`optional` partition `ratios` exactly

### `test_p1_1_compat.py`

- **`prz.py` guard**: Cypher without `ad_xa` → no raise, no fabricated `AD_XA_*` key, `CD_XC` projection present
- `calculate_prz` rejects `OXABC`/`ABCD` cleanly
- **Scoring monotonicity**: failing an optional ratio scores ≤ passing it
- **Runtime exclusion**: `engine.py` and `d_predictor.py` never emit Shark or AB=CD
- Façade import smoke: `import app.services.pattern_intelligence.{geometry,specs,domain}`
- Engine/predictor smoke over a candle series without exception
- `PatternEvidence` → `upsert_pattern` → `query_patterns` round-trip unchanged

### Deferred

| Test | Phase |
| :--- | :--- |
| OXABC persistence round-trip, scanner O-serialization, OXAB→C predictor fixtures | P1.1b |
| Full 18-fixture golden matrix, boundary fixtures, replay-vs-live determinism, PRZ dispersion fixtures | P1.5 |

---

## 14. Acceptance Criteria

- [ ] Architecture doc at **v2.2.3**, internally self-consistent, owner-approved
- [ ] `RatioToken` contains exactly **twelve** tokens including `BC_OX`, `XC_OX`, `OA_OX`, `AC_XA`
- [ ] `XC_OX` does not exist anywhere (asserted)
- [ ] `XC_OX` formula is `|C-X| / |X-O|` (asserted); `OC_OX` does not exist (asserted)
- [ ] `XD_XA_OVERSHOOT` formula is exactly `|D-X| / |A-X|` — no minus-one variant (asserted)
- [ ] Every token has exactly one formula, in exactly one place (`calculate_ratio`)
- [ ] No pattern spec redefines, aliases, or overloads a token
- [ ] **Cypher**: `XABCD`; required `{AB_XA, XC_XA, CD_XC}`; `AD_XA`/`BC_AB`/`CD_BC`/`CD_AB` **absent** (asserted)
- [ ] **Cypher canonical sweep 12/12** (was 2/12)
- [ ] **Shark**: `OXABC`; required `{AB_XA, BC_OX, XC_OX}`; optional `{OA_OX, AC_XA}`; completion C; `AD_XA` and `OC_OX` **absent** (asserted)
- [ ] **Option A verified**: same fixture with an optional ratio passing vs failing yields an **identical** `geometry_score`
- [ ] **AB=CD**: `ABCD`; required `{BC_AB, CD_BC, CD_AB}`; no X; fabricated `ab_xa`/`ad_xa` removed
- [ ] **Six standard XABCD patterns score behavior verified against Step-1 baseline** (governed parity or rebaseline per CD_AB decision)
- [ ] `prz.py` guards every spec-ratio read; no fabricated projections; Cypher `CD_XC` present; no `AttributeError` for any of the 9 specs
- [ ] Optional-ratio scoring normalized; failing an optional ratio never outscores passing it
- [ ] `RatioTolerance.weight` is live; `is_within()` gates validity
- [ ] Topology validation rejects missing mandatory and extraneous coordinates
- [ ] Degenerate legs yield `None`, not 1e-9-inflated ratios
- [ ] Shark + AB=CD runtime detection **disabled** and verified absent from engine/predictor output
- [ ] No synthetic coordinates anywhere; no metadata remapping
- [ ] Façade imports clean
- [ ] **Untouched**: `pattern_repository.py` schema, `api/schemas.py`, `api/router.py`, `scanner.py`, `app/core/harmonics.py`, all frontend
- [ ] Thresholds unchanged (`min_quality_score` 0.65, `is_tradable` 0.70)
- [ ] Full suite **≥ 19 passed**, zero new failures
- [ ] Shark/AB=CD detection-disabled state logged and documented as intentional

---

## 15. P1.1b Scope

**Entry gate**: P1.1 merged · governed XABCD regression/rebaseline approved · `CD_AB` classification resolved.

P1.1b contains **only multi-topology runtime activation**. Everything else (`PatternCoordinates`, `calculate_ratio()`, Option A scoring, baseline capture, `CD_AB` characterization, the Cypher correction, and Cypher PRZ compatibility) belongs to **P1.1**.

| Area | Work |
| :--- | :--- |
| Engine | 4/5-pivot window discrimination: a 5-pivot slice may be XABCD-completed **or** OXABC-completed-at-C; a 4-pivot slice may be XABCD-forming **or** ABCD-completed |
| Predictor | Topology-aware $OXAB \rightarrow C$ projection, distinct from $XABC \rightarrow D$ |
| Persistence | Add `o_price` / `o_time`; relax `x_price NOT NULL`; migration |
| API | `o_price` on `CustomWaveEvaluationRequest`; router passthrough |
| Scanner | O-coordinate serialization |
| PRZ | Topology-aware PRZ for `OXABC` / `ABCD` |
| Activation | Flip the topology allow-list |
| Scoring | Topology-aware recalibration for differing required-ratio counts |
| Fields | Replace the deprecated `ratio_bc_xa` / `target_xd_xa_*` |

---

## 16. Risk Register

| # | Risk | Severity | Mitigation |
| :-: | :--- | :--- | :--- |
| 1 | `prz.py` fabricates a PRZ leg after `AD_XA` leaves Cypher → corrupted stop loss reaches auto-trader | **CRITICAL** | Step 5 precedes step 6; explicit guard test; never default-fill |
| 2 | Cypher fix changes live detection rate (near-zero → normal) | **HIGH** | Intended and documented. Cypher is currently broken, not conservative. Monitor first session |
| 3 | Normalized scoring silently shifts the 6 standard patterns | **HIGH** | Golden file captured at Step 1; governed parity (±1e-6) **if `CD_AB` becomes REQUIRED**, otherwise an explicit approved rebaseline — never a silent shift |
| 4 | Façade rename breaks import → whole test session fails | **MEDIUM** | Keep legacy names as aliases; import smoke test |
| 5 | Shark detection stops without stakeholder awareness | **MEDIUM** | Logged, documented in §4.G and here; strictly better than matching a wrong geometry |
| 6 | Shark `AB_XA` [POLICY] envelope wrong for Indian intraday | **MEDIUM** | Runtime-disabled in P1.1; calibrate in P1.2 before P1.1b activation |
| 7 | OXABC work leaks into P1.1 and expands scope | **MEDIUM** | Explicit P1.1b boundary; topology allow-list as a single switch |
| 8 | Implementer leaves a stale `ad_xa` on Cypher (path of least resistance) | **MEDIUM** | Explicit absence assertions in `test_p1_1_pattern_specs.py` |
| 9 | `app/core/harmonics.py` diverges further while unowned | **LOW** (P1.1) | GAP-08 documented; out of scope; needs owner |
| 10 | Three doc copies drift | **LOW** | Flagged §A.4; recommend single source + CI check |

---

## 17. Stop Condition

P1.1 is complete when §14 is fully checked and the owner approves. At that point:

- **STOP.** Do not begin P1.1b.
- Do not begin P1.2.
- Do not activate `OXABC` or `ABCD` runtime detection.
- Do not change thresholds, targets, API contracts, or the frontend.

P1.1b and P1.2 each require their own explicit authorization.
