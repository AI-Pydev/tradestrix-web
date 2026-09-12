# TradeStrix Web Modular Migration

This directory records the approved modular restructuring plan for `AI-Pydev/tradestrix-web`.

## Scope

Documentation only at this stage. No application code, route, component, build, runtime, or API behavior changes are authorized by this commit.

## Goal

Restructure the frontend gradually around feature ownership so Execution Desk, Harmonics, Trendlines, Scanners, Prediction, Portfolio, Journal, Crypto and other TradeStrix applications can evolve independently without disturbing unrelated features.

## Target direction

```text
app/        -> thin Next.js route/composition layer
modules/    -> feature-owned UI, hooks, API clients, types and feature utilities
shared/     -> genuinely reusable UI, charts, hooks, formatting and shared types
platform/   -> navigation, permissions, app registry and platform configuration
```

Existing URLs must remain stable during migration.

## Continuity rule

Git is the source of truth, not AI chat history. Any AI provider or developer continuing this work must read the migration state and handoff files before making changes.

## Initial migration order

1. M0 - architecture documentation and discovery
2. M1 - frontend module scaffolding
3. M2 - Trendlines frontend migration
4. M3 - Harmonics frontend migration
5. M4 - Scanner frontend migration
6. M5 - shared contracts/API-client boundaries
7. M6 - Execution Desk frontend decomposition
8. M7 - Prediction frontend module
9. M8 - dependency enforcement and cleanup

No code migration should begin until discovery produces a current-path to target-module mapping and risk assessment.
