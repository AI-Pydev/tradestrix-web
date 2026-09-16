"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  analyzeEngine26,
  fetchEngine26Expiries,
  fetchEngine26Instruments,
  type Engine26Analysis,
  type Engine26Instrument,
} from "@/lib/api";

const GATE_LABELS: Record<number, string> = {
  1: "Gate 1 — Evidence",
  2: "Gate 2 — Pricing (VRP)",
  3: "Gate 3 — Regime",
  4: "Gate 4 — Engine 24 Falsification",
  5: "Gate 5 — Structure / Strikes",
  7: "Gate 7 — Premium Fair Value",
};

function num(value: number | null | undefined, digits = 2, suffix = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}${suffix}`;
}

function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function PremiumDeskShell() {
  const [instruments, setInstruments] = useState<Engine26Instrument[]>([]);
  const [symbol, setSymbol] = useState("NIFTY");
  const [expiries, setExpiries] = useState<string[]>([]);
  const [expiry, setExpiry] = useState<string>("");
  const [result, setResult] = useState<Engine26Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEngine26Instruments()
      .then((data) => setInstruments([...data.indices, ...data.stocks]))
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    if (!symbol) return;
    setExpiries([]);
    setExpiry("");
    fetchEngine26Expiries(symbol)
      .then((data) => {
        setExpiries(data.expiries);
        setExpiry(data.expiries[0] ?? "");
      })
      .catch(() => setExpiries([]));
  }, [symbol]);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeEngine26({
        symbol,
        expiry: expiry || null,
        lookback_days: 120,
      });
      setResult(data);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, expiry]);

  const isCandidate = result?.decision === "candidate";

  const verdictTone = useMemo(() => {
    if (!result) return "border-slate-700 bg-slate-900";
    return isCandidate
      ? "border-emerald-600 bg-emerald-950/40"
      : "border-amber-600 bg-amber-950/30";
  }, [result, isCandidate]);

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Premium Desk</h1>
          <p className="text-sm text-slate-400">
            Engine 26 — Optimal Premium Harvest Timing. Read-only analyzer:
            it never places orders.
          </p>
        </header>

        <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Symbol
            <select
              className="min-w-40 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            >
              {instruments.length === 0 && <option value={symbol}>{symbol}</option>}
              {instruments.map((i) => (
                <option key={i.instrument_key} value={i.symbol}>
                  {i.symbol} ({i.instrument_class})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Expiry
            <select
              className="min-w-40 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            >
              {expiries.length === 0 && <option value="">nearest</option>}
              {expiries.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </section>

        {error && (
          <div className="rounded border border-rose-700 bg-rose-950/40 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {result && (
          <>
            <section className={`rounded-lg border p-5 ${verdictTone}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">
                  {isCandidate ? "CANDIDATE" : "NO TRADE"}
                </h2>
                <span className="text-xs text-slate-400">
                  {result.symbol} · {result.expiry} · {result.dte ?? "—"} DTE ·
                  spot {num(result.spot)}
                </span>
              </div>

              {result.stopped_at_gate && (
                <p className="mt-2 text-sm font-medium text-amber-300">
                  Stopped at{" "}
                  {GATE_LABELS[result.stopped_at_gate] ??
                    `Gate ${result.stopped_at_gate}`}
                  {result.rejection_reason ? ` — ${result.rejection_reason}` : ""}
                </p>
              )}

              <p className="mt-2 text-sm text-slate-300">{result.detail}</p>

              {result.warnings.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {result.warnings.map((w) => (
                    <li key={w} className="text-xs text-amber-300">
                      ⚠ {w}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 border-t border-slate-700/60 pt-3 text-xs text-slate-500">
                {result.read_only_notice}
              </p>
            </section>

            {result.falsification && (
              <section
                className={`rounded-lg border p-5 ${
                  result.falsification.vetoed
                    ? "border-rose-700 bg-rose-950/30"
                    : "border-slate-800 bg-slate-900/60"
                }`}
              >
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Engine 24 — Falsification
                  {result.falsification.vetoed && (
                    <span className="ml-2 rounded bg-rose-700 px-2 py-0.5 text-xs text-white">
                      VETO
                    </span>
                  )}
                </h3>

                {result.falsification.vetoed ? (
                  <>
                    <p className="mb-3 text-sm text-rose-200">
                      Vetoed — gates 5–10 were not evaluated. A falsification
                      verdict cannot be overridden by premium quality.
                    </p>
                    <ul className="space-y-2">
                      {result.falsification.kills.map((k) => (
                        <li
                          key={`${k.reason}-${k.detail}`}
                          className="rounded border border-rose-800/60 bg-rose-950/40 p-3"
                        >
                          <div className="font-mono text-xs uppercase text-rose-300">
                            {k.reason}
                          </div>
                          <div className="text-sm text-slate-200">{k.detail}</div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-slate-300">
                    {result.falsification.explanation}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-800/60 pt-3 text-xs">
                  <span className="text-slate-400">
                    Checks run:{" "}
                    <span className="text-emerald-400">
                      {result.falsification.checks_run.length}
                    </span>
                  </span>
                  {result.falsification.checks_skipped.length > 0 && (
                    <span className="text-slate-400">
                      Skipped (evidence unavailable):{" "}
                      <span className="text-amber-400">
                        {result.falsification.checks_skipped.join(", ")}
                      </span>
                    </span>
                  )}
                </div>
              </section>
            )}

            {result.volatility && (
              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Volatility Intelligence
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Metric label="ATM IV" value={num(result.volatility.atm_iv, 2, "%")} />
                  <Metric
                    label="IV Rank"
                    value={num(result.volatility.iv_rank, 0)}
                    hint={
                      result.volatility.iv_history_sufficient
                        ? undefined
                        : `${result.volatility.iv_history_days}d history`
                    }
                  />
                  <Metric
                    label="IV Percentile"
                    value={num(result.volatility.iv_percentile, 0)}
                  />
                  <Metric
                    label="RV forecast"
                    value={num(result.volatility.rv_forecast, 2, "%")}
                  />
                  <Metric
                    label="VRP"
                    value={num(result.volatility.vrp, 2)}
                    tone={
                      (result.volatility.vrp ?? 0) > 0 ? "good" : "bad"
                    }
                  />
                  <Metric
                    label="VRP (conservative)"
                    value={num(result.volatility.vrp_conservative, 2)}
                    tone={
                      (result.volatility.vrp_conservative ?? 0) > 0 ? "good" : "bad"
                    }
                    hint="vs upper bound of RV forecast"
                  />
                  <Metric
                    label="Expected move"
                    value={num(result.volatility.expected_move_1sigma, 0)}
                  />
                  <Metric
                    label="EM (regime-adj)"
                    value={num(result.volatility.expected_move_regime_adj, 0)}
                    hint={`phi ${num(result.volatility.regime_phi, 2)}`}
                  />
                  <Metric label="RV Yang-Zhang" value={num(result.volatility.rv_yang_zhang, 2, "%")} />
                  <Metric label="RV close-close" value={num(result.volatility.rv_close_close, 2, "%")} />
                  <Metric label="Put skew 25d" value={num(result.volatility.put_skew_25d, 2)} />
                  <Metric label="Call skew 25d" value={num(result.volatility.call_skew_25d, 2)} />
                </div>
              </section>
            )}

            {result.regime && (
              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Regime
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Metric label="Label" value={result.regime.regime_label} />
                  <Metric label="ADX" value={num(result.regime.adx, 1)} />
                  <Metric label="Hurst" value={num(result.regime.hurst, 3)} />
                  <Metric
                    label="Breakout prob"
                    value={pct(result.regime.breakout_probability)}
                  />
                  <Metric
                    label="Range prob"
                    value={pct(result.regime.range_probability)}
                  />
                  <Metric label="Support" value={num(result.regime.support, 0)} />
                  <Metric label="Resistance" value={num(result.regime.resistance, 0)} />
                </div>
              </section>
            )}

            {result.timing && (
              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Timing Gate — every condition must hold
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
                        <th className="py-2">Condition</th>
                        <th className="py-2">Value</th>
                        <th className="py-2">Required</th>
                        <th className="py-2">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.timing.conditions.map((c) => (
                        <tr key={c.name} className="border-b border-slate-800/60">
                          <td className="py-2 font-mono text-xs">
                            {c.name}
                            {c.note && (
                              <span className="ml-2 text-slate-500">{c.note}</span>
                            )}
                          </td>
                          <td className="py-2">{num(c.value, 3)}</td>
                          <td className="py-2 text-slate-400">
                            {c.comparator} {c.threshold}
                          </td>
                          <td className="py-2">
                            {c.passed ? (
                              <span className="text-emerald-400">PASS</span>
                            ) : (
                              <span className="text-rose-400">FAIL</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {result.structure && (
              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Structure — {result.structure.structure.replace(/_/g, " ")}
                </h3>
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
                        <th className="py-2">Action</th>
                        <th className="py-2">Strike</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Price</th>
                        <th className="py-2">Delta</th>
                        <th className="py-2">OI</th>
                        <th className="py-2">Spread</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.structure.legs.map((leg, i) => (
                        <tr
                          key={`${leg.strike}-${leg.option_type}-${i}`}
                          className="border-b border-slate-800/60"
                        >
                          <td
                            className={`py-2 font-medium ${
                              leg.action === "SELL"
                                ? "text-rose-300"
                                : "text-sky-300"
                            }`}
                          >
                            {leg.action}
                          </td>
                          <td className="py-2">{num(leg.strike, 0)}</td>
                          <td className="py-2">{leg.option_type}</td>
                          <td className="py-2">{num(leg.price)}</td>
                          <td className="py-2">{num(leg.delta, 3)}</td>
                          <td className="py-2">{leg.oi ?? "—"}</td>
                          <td className="py-2">{pct(leg.spread_pct, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Metric label="Net credit" value={num(result.structure.net_credit)} />
                  <Metric label="Max loss" value={num(result.structure.max_loss)} />
                  <Metric label="Wing width" value={num(result.structure.wing_width, 0)} />
                  <Metric
                    label="Credit : loss"
                    value={num(result.structure.credit_to_loss_ratio, 3)}
                  />
                </div>
              </section>
            )}

            {result.probability && result.fair_value && (
              <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Probability & Fair Value
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Metric
                    label="POP (expiry)"
                    value={pct(result.probability.pop_expiry)}
                  />
                  <Metric
                    label="Breakeven POP"
                    value={pct(result.probability.breakeven_pop)}
                    hint="POP required just to break even"
                  />
                  <Metric
                    label="P(touch short)"
                    value={pct(result.probability.p_touch_short)}
                    hint="~2x P(ITM) — governs stops and rolls"
                  />
                  <Metric
                    label="Expected value"
                    value={num(result.probability.expected_value)}
                    tone={
                      (result.probability.expected_value ?? 0) > 0 ? "good" : "bad"
                    }
                  />
                  <Metric
                    label="Credit on offer"
                    value={num(result.fair_value.realistic_credit)}
                  />
                  <Metric
                    label="Minimum acceptable"
                    value={num(result.fair_value.minimum_acceptable)}
                    tone={result.fair_value.accepted ? "good" : "bad"}
                  />
                  <Metric
                    label="Breakeven credit"
                    value={num(result.fair_value.breakeven_credit)}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {result.fair_value.reason}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-rose-400"
        : "text-slate-100";
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-medium ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
