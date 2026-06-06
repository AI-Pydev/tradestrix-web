"use client";

import { useEffect, useState } from "react";

import {
  enqueueStrategyQualification,
  fetchAutoQualificationSettings,
  fetchQualificationCycle,
  fetchQualificationCycleInstruments,
  fetchQualificationCycleIssues,
  fetchStrategyQualificationJob,
  fetchStrategyQualificationCandidates,
  fetchStrategyQualificationRegistry,
  fetchStrategyQualificationResults,
  pauseQualificationCycle,
  resumeQualificationCycle,
  startQualificationCycle,
  stopQualificationCycle,
  updateAutoQualificationSettings,
  AutoQualificationSettings,
  QualificationCycleInstruments,
  QualificationCycleIssues,
  QualificationCycleStatus,
  QualificationInstrumentState,
  QualificationLoopMode,
  StrategyQualificationRunResult,
  StrategyQualificationBatch,
  StrategyQualificationRunRequest,
  StrategyRegistryEntry,
} from "@/lib/api";

const QUALIFICATION_STRATEGY_OPTIONS = [
  { value: "tv_ha_call_v2", label: "TV-HA CALL v2", side: "call" },
  { value: "nc_ha_call_entry", label: "NC HA CALL Entry", side: "call" },
  { value: "auto_atm_otm_call", label: "Auto ATM-OTM CALL", side: "call" },
  { value: "fibo_nk_call", label: "FIBO-NK CALL", side: "call" },
  { value: "jk_oc_call", label: "JK OC CALL", side: "call" },
  { value: "jk_oc_call_opt_int", label: "JK OC CALL OPT INT", side: "call" },
  { value: "jk_al_call", label: "JK AL CALL", side: "call" },
  { value: "ol_oh_call", label: "OL-OH CALL", side: "call" },
  { value: "momentum_call", label: "Momentum CALL", side: "call" },
  { value: "tv_ha_put_v2", label: "TV-HA PUT v2", side: "put" },
  { value: "fibo_nk_put", label: "FIBO-NK PUT", side: "put" },
  { value: "jk_ema_put", label: "JK EMA PUT", side: "put" },
  { value: "jk_al_put", label: "JK AL PUT", side: "put" },
  { value: "ol_oh_put", label: "OL-OH PUT", side: "put" },
  { value: "momentum_put", label: "Momentum PUT", side: "put" },
] as const;

const DEFAULT_INSTRUMENT_OPTIONS = [
  { value: "NSE_INDEX|Nifty 50", label: "Nifty 50", kind: "index" },
  { value: "NSE_INDEX|Nifty Bank", label: "Nifty Bank", kind: "index" },
  { value: "NSE_INDEX|Nifty Fin Service", label: "Nifty Fin Service", kind: "index" },
  { value: "BSE_INDEX|SENSEX", label: "SENSEX", kind: "index" },
] as const;

function dateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultRequest(): StrategyQualificationRunRequest {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 182);
  return {
    instrument_keys: ["NSE_INDEX|Nifty 50", "NSE_INDEX|Nifty Bank", "NSE_INDEX|Nifty Fin Service", "BSE_INDEX|SENSEX"],
    include_indices: true,
    include_stocks: false,
    verified_only: true,
    limit: null,
    from_date: dateInput(fromDate),
    to_date: dateInput(toDate),
    include_call: true,
    include_put: true,
    strategy_ids: [
      "fibo_nk_call",
      "ol_oh_call",
      "nc_ha_call_entry",
      "jk_al_call",
      "fibo_nk_put",
      "tv_ha_put_v2",
      "jk_al_put",
    ],
    timeframe: "3m",
    underlying_unit: "minutes",
    underlying_interval: "3",
    option_interval: "1minute",
    current_option_unit: "minutes",
    current_option_interval: "1",
    strike_offset: 0,
    lots: 1,
    max_entry_ltp: 1000,
    sl_premium_pct: 0.2,
    target_premium_pct: 0.36,
    rules: {
      min_trades: 50,
      min_win_rate: 55,
      min_profit_factor: 1.2,
      max_drawdown: 15000,
      min_last_sessions: 5,
      min_profitable_last_sessions: 3,
      max_consecutive_losses: 5,
      min_net_pnl: 0,
      reject_unverified_instruments: true,
    },
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function stateBadgeClass(state: QualificationInstrumentState) {
  if (state === "running") return "text-bg-warning";
  if (state === "done") return "text-bg-success";
  return "text-bg-secondary";
}

type FailureReason = {
  reason: string;
  count: number;
};

function summaryValue(summary: StrategyQualificationBatch["summary"] | undefined, key: string, fallback = 0) {
  const value = summary?.[key];
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  return fallback;
}

function failureReasons(summary: StrategyQualificationBatch["summary"] | undefined): FailureReason[] {
  const value = summary?.top_failure_reasons;
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as Record<string, unknown>;
      if (typeof row.reason !== "string" || typeof row.count !== "number") {
        return null;
      }
      return { reason: row.reason, count: row.count };
    })
    .filter((item): item is FailureReason => Boolean(item));
}

function issueRowKey(
  category: "failed" | "stuck" | "no_trades" | "not_run",
  row: QualificationCycleIssues["failed"][number],
  index: number,
) {
  return [
    category,
    row.instrument_key,
    row.side ?? "any",
    row.strategy_id ?? "none",
    row.status ?? "unknown",
    row.qualification_status ?? "unknown",
    row.started_at ?? "not-started",
    index,
  ].join("-");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function StrategyQualificationShell() {
  const [form, setForm] = useState<StrategyQualificationRunRequest>(() => defaultRequest());
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<StrategyQualificationBatch | null>(null);
  const [registry, setRegistry] = useState<StrategyRegistryEntry[]>([]);
  const [candidates, setCandidates] = useState<Record<string, { call: StrategyRegistryEntry[]; put: StrategyRegistryEntry[] }>>({});

  const [autoSettings, setAutoSettings] = useState<AutoQualificationSettings | null>(null);
  const [cycle, setCycle] = useState<QualificationCycleStatus | null>(null);
  const [instruments, setInstruments] = useState<QualificationCycleInstruments | null>(null);
  const [issues, setIssues] = useState<QualificationCycleIssues | null>(null);
  const [cycleResults, setCycleResults] = useState<StrategyQualificationRunResult[]>([]);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoMessage, setAutoMessage] = useState("");
  const [sliceSize, setSliceSize] = useState(4);
  const [loopMode, setLoopMode] = useState<QualificationLoopMode>("once");
  const [windowDays, setWindowDays] = useState(182);
  const [compare5m, setCompare5m] = useState(false);

  async function refreshCycle() {
    // Settle each call independently — one failing endpoint must not blank the
    // others (a rejected Promise.all was leaving the Enabled toggle stuck off).
    const [settings, cycleStatus, cycleInstruments, results] = await Promise.allSettled([
      fetchAutoQualificationSettings(),
      fetchQualificationCycle(),
      fetchQualificationCycleInstruments(),
      fetchStrategyQualificationResults(200),
    ]);
    if (settings.status === "fulfilled") setAutoSettings(settings.value);
    if (cycleStatus.status === "fulfilled") setCycle(cycleStatus.value);
    if (cycleInstruments.status === "fulfilled") setInstruments(cycleInstruments.value);
    if (results.status === "fulfilled") setCycleResults(results.value);

    const failure = [settings, cycleStatus, cycleInstruments, results].find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (failure) {
      const reason = failure.reason;
      setAutoMessage(reason instanceof Error ? reason.message : "Cycle refresh failed");
    }
  }

  async function refreshIssues() {
    try {
      setIssues(await fetchQualificationCycleIssues());
    } catch (err) {
      setAutoMessage(err instanceof Error ? err.message : "Issues refresh failed");
    }
  }

  async function toggleAuto(enabled: boolean) {
    setAutoBusy(true);
    setAutoMessage("");
    try {
      setAutoSettings(await updateAutoQualificationSettings(enabled));
      setAutoMessage(enabled ? "Auto backtest enabled" : "Auto backtest disabled");
    } catch (err) {
      setAutoMessage(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setAutoBusy(false);
    }
  }

  async function startCycle() {
    setAutoBusy(true);
    setAutoMessage("");
    try {
      const next = await startQualificationCycle({
        slice_size: sliceSize,
        loop_mode: loopMode,
        window_days: windowDays,
        timeframes: compare5m ? ["3m", "5m"] : ["3m"],
      });
      setCycle(next);
      setAutoMessage(`Cycle ${next.cycle_id ?? ""} started (${next.total} instruments)`);
      await refreshCycle();
    } catch (err) {
      setAutoMessage(err instanceof Error ? err.message : "Start cycle failed");
    } finally {
      setAutoBusy(false);
    }
  }

  async function stopCycle() {
    setAutoBusy(true);
    setAutoMessage("");
    try {
      const next = await stopQualificationCycle();
      setCycle(next);
      setAutoMessage("Cycle stopped and slice lock cleared");
      await refreshCycle();
    } catch (err) {
      setAutoMessage(err instanceof Error ? err.message : "Stop cycle failed");
    } finally {
      setAutoBusy(false);
    }
  }

  async function pauseOrResume() {
    setAutoBusy(true);
    setAutoMessage("");
    try {
      const paused = cycle?.status === "paused";
      const next = paused ? await resumeQualificationCycle() : await pauseQualificationCycle();
      setCycle(next);
      setAutoMessage(paused ? "Cycle resumed" : "Cycle paused (progress kept)");
      await refreshCycle();
    } catch (err) {
      setAutoMessage(err instanceof Error ? err.message : "Pause/resume failed");
    } finally {
      setAutoBusy(false);
    }
  }

  async function refresh() {
    const [nextRegistry, nextCandidates] = await Promise.all([
      fetchStrategyQualificationRegistry(),
      fetchStrategyQualificationCandidates("paper"),
    ]);
    setRegistry(nextRegistry);
    setCandidates(nextCandidates);
  }

  useEffect(() => {
    refresh().catch((err) => setMessage(err instanceof Error ? err.message : "Refresh failed"));
    refreshCycle();
    refreshIssues();
    // Heartbeat: poll only the small cycle/settings payload while running.
    const timer = setInterval(() => {
      refreshCycle();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  async function runBatch() {
    setRunning(true);
    setMessage("");
    try {
      const queued = await enqueueStrategyQualification(form);
      setMessage(`Job ${queued.task_id} queued`);
      let next: StrategyQualificationBatch | null = queued.batch ?? null;
      for (let attempt = 0; !next && attempt < 360; attempt += 1) {
        await sleep(2000);
        const job = await fetchStrategyQualificationJob(queued.task_id);
        if (job.status === "completed" && job.batch) {
          next = job.batch;
          break;
        }
        if (job.status === "failed") {
          throw new Error(job.error || job.message || "Qualification job failed");
        }
        setMessage(`Job ${queued.task_id} ${job.status}`);
      }
      if (!next) {
        throw new Error("Qualification job did not complete within the polling window");
      }
      setResult(next);
      setMessage(`Batch ${next.batch_id} completed`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Qualification failed");
    } finally {
      setRunning(false);
    }
  }

  const summary = result?.summary;
  const topFailureReasons = failureReasons(summary);
  const instrumentOptions = Array.from(
    new Map(
      [
        ...DEFAULT_INSTRUMENT_OPTIONS,
        ...registry.map((item) => ({
          value: item.instrument_key,
          label: item.symbol || item.instrument_key,
          kind: item.instrument_key.includes("_INDEX|") ? "index" : "stock",
        })),
        ...(instruments?.instruments ?? []).map((item) => ({
          value: item.instrument_key,
          label: item.symbol || item.instrument_key,
          kind: item.kind || (item.instrument_key.includes("_INDEX|") ? "index" : "stock"),
        })),
      ].map((item) => [item.value, item]),
    ).values(),
  );
  const instrumentLabels = new Map(instrumentOptions.map((item) => [item.value, item.label]));
  const toggleInstrument = (instrumentKey: string) => {
    setForm((prev) => ({
      ...prev,
      instrument_keys: prev.instrument_keys.includes(instrumentKey)
        ? prev.instrument_keys.filter((item) => item !== instrumentKey)
        : [...prev.instrument_keys, instrumentKey],
    }));
  };
  const strategyOptions = Array.from(
    new Map(
      [
        ...QUALIFICATION_STRATEGY_OPTIONS,
        ...registry.map((item) => ({
          value: item.strategy_id,
          label: item.name || item.strategy_id,
          side: item.side,
        })),
      ].map((item) => [item.value, item]),
    ).values(),
  );
  const strategyLabels = new Map(strategyOptions.map((item) => [item.value, item.label]));
  const toggleStrategy = (strategyId: string) => {
    setForm((prev) => ({
      ...prev,
      strategy_ids: prev.strategy_ids.includes(strategyId)
        ? prev.strategy_ids.filter((item) => item !== strategyId)
        : [...prev.strategy_ids, strategyId],
    }));
  };
  const flatCandidates = Object.entries(candidates).flatMap(([instrumentKey, sides]) =>
    (["call", "put"] as const).flatMap((side) =>
      sides[side].map((item) => ({ ...item, instrument_key: instrumentKey, side })),
    ),
  );

  return (
    <main className="container-fluid py-4">
      <section className="dashboard-panel">
        <div className="d-flex flex-wrap justify-content-between gap-3 align-items-end">
          <div>
            <p className="section-eyebrow mb-1">Qualification</p>
            <h1 className="h3 mb-0">Strategy Qualification</h1>
          </div>
          <button className="btn btn-primary" disabled={running} onClick={runBatch} type="button">
            {running ? "Running" : "Run Batch"}
          </button>
        </div>

        <div className="row g-3 mt-2">
          <div className="col-12 col-xl-5">
            <label className="form-label">Instruments</label>
            <details className="multi-select-dropdown position-relative">
              <summary className="form-select">
                {form.instrument_keys.length
                  ? `${form.instrument_keys.length} instruments selected`
                  : "Select instruments"}
              </summary>
              <div className="multi-select-dropdown-menu">
                <div className="d-flex justify-content-between gap-2 border-bottom border-secondary-subtle pb-2 mb-2">
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        instrument_keys: instrumentOptions.map((item) => item.value),
                      }))
                    }
                    type="button"
                  >
                    Select all
                  </button>
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={() => setForm((prev) => ({ ...prev, instrument_keys: [] }))}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
                {instrumentOptions.map((option) => (
                  <label className="multi-select-dropdown-option" key={option.value}>
                    <input
                      checked={form.instrument_keys.includes(option.value)}
                      className="form-check-input"
                      onChange={() => toggleInstrument(option.value)}
                      type="checkbox"
                    />
                    <span className="flex-grow-1">
                      {option.label}
                      <small className="d-block text-secondary">{option.value}</small>
                    </span>
                    <span className="badge text-bg-info">{option.kind.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </details>
            <div className="d-flex flex-wrap gap-1 mt-2">
              {form.instrument_keys.map((instrumentKey) => (
                <button
                  className="badge rounded-pill text-bg-secondary border-0"
                  key={instrumentKey}
                  onClick={() => toggleInstrument(instrumentKey)}
                  title={`Remove ${instrumentLabels.get(instrumentKey) ?? instrumentKey}`}
                  type="button"
                >
                  {instrumentLabels.get(instrumentKey) ?? instrumentKey} x
                </button>
              ))}
            </div>
          </div>
          <div className="col-12 col-xl-5">
            <label className="form-label">Strategies</label>
            <details className="multi-select-dropdown position-relative">
              <summary className="form-select">
                {form.strategy_ids.length
                  ? `${form.strategy_ids.length} strategies selected`
                  : "Select strategies"}
              </summary>
              <div className="multi-select-dropdown-menu">
                <div className="d-flex justify-content-between gap-2 border-bottom border-secondary-subtle pb-2 mb-2">
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={() => setForm((prev) => ({ ...prev, strategy_ids: strategyOptions.map((item) => item.value) }))}
                    type="button"
                  >
                    Select all
                  </button>
                  <button
                    className="btn btn-outline-light btn-sm"
                    onClick={() => setForm((prev) => ({ ...prev, strategy_ids: [] }))}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
                {strategyOptions.map((option) => (
                  <label className="multi-select-dropdown-option" key={option.value}>
                    <input
                      checked={form.strategy_ids.includes(option.value)}
                      className="form-check-input"
                      onChange={() => toggleStrategy(option.value)}
                      type="checkbox"
                    />
                    <span className="flex-grow-1">{option.label}</span>
                    <span className={`badge ${option.side === "call" ? "text-bg-success" : "text-bg-danger"}`}>
                      {option.side.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </details>
            <div className="d-flex flex-wrap gap-1 mt-2">
              {form.strategy_ids.map((strategyId) => (
                <button
                  className="badge rounded-pill text-bg-secondary border-0"
                  key={strategyId}
                  onClick={() => toggleStrategy(strategyId)}
                  title={`Remove ${strategyLabels.get(strategyId) ?? strategyId}`}
                  type="button"
                >
                  {strategyLabels.get(strategyId) ?? strategyId} ×
                </button>
              ))}
            </div>
          </div>
          <div className="col-6 col-xl-1">
            <label className="form-label">From</label>
            <input
              className="form-control"
              onChange={(event) => setForm((prev) => ({ ...prev, from_date: event.target.value }))}
              type="date"
              value={form.from_date}
            />
          </div>
          <div className="col-6 col-xl-1">
            <label className="form-label">To</label>
            <input
              className="form-control"
              onChange={(event) => setForm((prev) => ({ ...prev, to_date: event.target.value }))}
              type="date"
              value={form.to_date}
            />
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-6 col-md-2">
            <label className="form-label">Min Trades</label>
            <input
              className="form-control"
              min={1}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, rules: { ...prev.rules, min_trades: Number(event.target.value) } }))
              }
              type="number"
              value={form.rules.min_trades}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Win Rate</label>
            <input
              className="form-control"
              min={0}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, rules: { ...prev.rules, min_win_rate: Number(event.target.value) } }))
              }
              type="number"
              value={form.rules.min_win_rate}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Profit Factor</label>
            <input
              className="form-control"
              min={0}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, rules: { ...prev.rules, min_profit_factor: Number(event.target.value) } }))
              }
              step="0.1"
              type="number"
              value={form.rules.min_profit_factor}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Max DD</label>
            <input
              className="form-control"
              min={0}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, rules: { ...prev.rules, max_drawdown: Number(event.target.value) } }))
              }
              type="number"
              value={form.rules.max_drawdown}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">CALL</label>
            <select
              className="form-select"
              onChange={(event) => setForm((prev) => ({ ...prev, include_call: event.target.value === "true" }))}
              value={String(form.include_call)}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">PUT</label>
            <select
              className="form-select"
              onChange={(event) => setForm((prev) => ({ ...prev, include_put: event.target.value === "true" }))}
              value={String(form.include_put)}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>

        {message ? <div className="alert alert-secondary mt-3 mb-0">{message}</div> : null}
      </section>

      <section className="dashboard-panel mt-4">
        <div className="d-flex flex-wrap justify-content-between gap-3 align-items-end">
          <div>
            <p className="section-eyebrow mb-1">Automation</p>
            <h2 className="h4 mb-0">Auto Backtest (Rolling Cycle)</h2>
            <small className="text-secondary">
              Sweeps every verified index + stock in slices, off-market, persisting each result as it completes.
            </small>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="form-check form-switch mb-0">
              <input
                checked={Boolean(autoSettings?.auto_enabled)}
                className="form-check-input"
                disabled={autoBusy}
                id="auto-enabled-switch"
                onChange={(event) => toggleAuto(event.target.checked)}
                role="switch"
                type="checkbox"
              />
              <label className="form-check-label" htmlFor="auto-enabled-switch">
                {autoSettings?.auto_enabled ? "Enabled" : "Disabled"}
              </label>
            </div>
            {cycle && (cycle.status === "running" || cycle.status === "paused") ? (
              <button
                className={`btn ${cycle.status === "paused" ? "btn-success" : "btn-warning"}`}
                disabled={autoBusy}
                onClick={pauseOrResume}
                type="button"
              >
                {cycle.status === "paused" ? "▶ Resume" : "⏸ Pause"}
              </button>
            ) : null}
            <button className="btn btn-outline-light" disabled={autoBusy} onClick={stopCycle} type="button">
              Stop
            </button>
            <button className="btn btn-primary" disabled={autoBusy} onClick={startCycle} type="button">
              {autoBusy ? "Working" : "Start Cycle"}
            </button>
          </div>
        </div>

        <div className="row g-3 mt-1 align-items-end">
          <div className="col-6 col-md-2">
            <label className="form-label">Slice size</label>
            <input
              className="form-control"
              max={50}
              min={1}
              onChange={(event) => setSliceSize(Math.max(1, Number(event.target.value) || 1))}
              type="number"
              value={sliceSize}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Loop mode</label>
            <select
              className="form-select"
              onChange={(event) => setLoopMode(event.target.value as QualificationLoopMode)}
              value={loopMode}
            >
              <option value="once">Once, then pause</option>
              <option value="daily">Once per day</option>
              <option value="continuous">Continuous</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Backtest window</label>
            <select
              className="form-select"
              onChange={(event) => setWindowDays(Number(event.target.value))}
              value={windowDays}
            >
              <option value={182}>6 months</option>
              <option value={90}>3 months</option>
              <option value={30}>1 month</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Timeframes</label>
            <div className="form-check form-switch">
              <input
                checked={compare5m}
                className="form-check-input"
                id="compare-5m-switch"
                onChange={(event) => setCompare5m(event.target.checked)}
                role="switch"
                type="checkbox"
              />
              <label className="form-check-label" htmlFor="compare-5m-switch">
                {compare5m ? "3m + 5m" : "3m only"}
              </label>
            </div>
          </div>
          <div className="col-12 col-md-8 d-flex gap-2 flex-wrap">
            <button className="btn btn-outline-light btn-sm" onClick={refreshCycle} type="button">
              Refresh status
            </button>
            <button className="btn btn-outline-light btn-sm" onClick={refreshIssues} type="button">
              Refresh issues
            </button>
            {autoSettings ? (
              <span className="badge text-bg-secondary align-self-center">
                toggle source: {autoSettings.source}
              </span>
            ) : null}
          </div>
        </div>

        {cycle ? (
          <div className="mt-3">
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <span>
                <strong>Status:</strong> {cycle.status}
                {cycle.cycle_id ? ` · ${cycle.cycle_id}` : ""}
                {cycle.reason ? ` · ${cycle.reason}` : ""}
              </span>
              <span>
                {cycle.done}/{cycle.total} done · {cycle.pending} pending · loop: {cycle.loop_mode}
              </span>
            </div>
            {cycle.blocked_reason ? (
              <div className="alert alert-warning mt-2 mb-0 py-2">
                Not advancing: {cycle.blocked_reason}
              </div>
            ) : null}
            <div className="progress mt-2" role="progressbar" style={{ height: 22 }}>
              <div
                className="progress-bar"
                style={{ width: `${Math.min(100, Math.max(0, cycle.percent))}%` }}
              >
                {cycle.percent}%
              </div>
            </div>
            <div className="d-flex flex-wrap gap-3 mt-2 text-secondary small">
              {cycle.from_date ? <span>window: {cycle.from_date} → {cycle.to_date}</span> : null}
              {cycle.timeframes?.length ? <span>timeframes: {cycle.timeframes.join(", ")}</span> : null}
              {cycle.strategy_ids?.length ? (
                <span>strategies: {cycle.strategy_ids.length} ({cycle.strategy_ids.join(", ")})</span>
              ) : null}
              {cycle.last_slice_at ? <span>last slice: {cycle.last_slice_at}</span> : null}
              {cycle.last_error ? <span className="text-warning">last error: {cycle.last_error}</span> : null}
            </div>
            <div className="mt-2 d-flex flex-wrap align-items-center gap-2">
              <span className="text-secondary small">Now running:</span>
              {instruments?.running.length ? (
                instruments.running.map((row) => (
                  <span className="badge text-bg-warning" key={`running-${row.instrument_key}`}>
                    <span className="spinner-grow spinner-grow-sm me-1" role="status" /> {row.symbol}
                  </span>
                ))
              ) : (
                <span className="text-secondary small">
                  {cycle.status === "running" ? "waiting for next slice…" : "—"}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {autoMessage ? <div className="alert alert-secondary mt-3 mb-0">{autoMessage}</div> : null}
      </section>

      {instruments ? (
        <section className="dashboard-panel mt-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h2 className="h5 mb-0">Instruments</h2>
            <div className="d-flex gap-2">
              <span className="badge text-bg-warning">running {instruments.counts.running}</span>
              <span className="badge text-bg-success">done {instruments.counts.done}</span>
              <span className="badge text-bg-secondary">pending {instruments.counts.pending}</span>
            </div>
          </div>
          <div className="table-responsive mt-2" style={{ maxHeight: 360, overflowY: "auto" }}>
            <table className="table table-dark table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Instrument</th>
                  <th>Kind</th>
                </tr>
              </thead>
              <tbody>
                {instruments.instruments.map((row) => (
                  <tr key={`inst-${row.instrument_key}`}>
                    <td>
                      <span className={`badge ${stateBadgeClass(row.state)}`}>
                        {row.state === "running" ? (
                          <span className="spinner-grow spinner-grow-sm me-1" role="status" />
                        ) : null}
                        {row.state}
                      </span>
                    </td>
                    <td>{row.symbol}</td>
                    <td>{row.kind || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {cycleResults.length ? (
        <section className="dashboard-panel mt-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h2 className="h5 mb-0">Cycle Results</h2>
            <span className="badge text-bg-secondary">{cycleResults.length} latest runs</span>
          </div>
          <div className="table-responsive mt-2" style={{ maxHeight: 420, overflowY: "auto" }}>
            <table className="table table-dark table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Instrument</th>
                  <th>TF</th>
                  <th>Side</th>
                  <th>Strategy</th>
                  <th>Trades</th>
                  <th>Win%</th>
                  <th>Net PnL</th>
                  <th>PF</th>
                  <th>Qualification</th>
                </tr>
              </thead>
              <tbody>
                {cycleResults.map((row) => (
                  <tr key={`cr-${row.id}`}>
                    <td>{row.strategy.symbol}</td>
                    <td>{row.strategy.timeframe}</td>
                    <td>{row.strategy.side.toUpperCase()}</td>
                    <td>{row.strategy.name}</td>
                    <td>{row.metrics.total_trades}</td>
                    <td>{row.metrics.win_rate}</td>
                    <td>{money(row.metrics.net_pnl)}</td>
                    <td>{row.metrics.profit_factor ?? "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          row.qualification_status === "QUALIFIED"
                            ? "text-bg-success"
                            : "text-bg-secondary"
                        }`}
                      >
                        {row.qualification_status}
                      </span>{" "}
                      {row.qualification_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {issues ? (
        <section className="dashboard-panel mt-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h2 className="h5 mb-0">Issues / Fix List</h2>
            <div className="d-flex gap-2">
              <span className="badge text-bg-danger">failed {issues.summary.failed}</span>
              <span className="badge text-bg-warning">stuck {issues.summary.stuck}</span>
              <span className="badge text-bg-info">no trades {issues.summary.no_trades}</span>
              <span className="badge text-bg-secondary">not run {issues.summary.not_run}</span>
            </div>
          </div>
          <div className="table-responsive mt-2">
            <table className="table table-dark table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Instrument</th>
                  <th>Kind</th>
                  <th>Side</th>
                  <th>Strategy</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {(["failed", "stuck", "no_trades", "not_run"] as const).flatMap((category) =>
                  issues[category].slice(0, 50).map((row, index) => (
                    <tr key={issueRowKey(category, row, index)}>
                      <td>{category}</td>
                      <td>{row.symbol || row.instrument_key}</td>
                      <td>{row.kind || "-"}</td>
                      <td>{row.side ? row.side.toUpperCase() : "-"}</td>
                      <td>{row.strategy_id || "-"}</td>
                      <td style={{ minWidth: 280 }}>
                        {row.error_message || row.qualification_reason || "-"}
                      </td>
                    </tr>
                  )),
                )}
                {!issues.summary.failed &&
                !issues.summary.stuck &&
                !issues.summary.no_trades &&
                !issues.summary.not_run ? (
                  <tr>
                    <td colSpan={6}>No issues recorded in the current cycle.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="dashboard-panel mt-4">
        <div className="row g-3">
          <div className="col-6 col-xl-2"><strong>{summaryValue(summary, "evaluated_results", registry.length)}</strong><span> Evaluated</span></div>
          <div className="col-6 col-xl-2"><strong>{summaryValue(summary, "qualified_results", flatCandidates.length)}</strong><span> Qualified</span></div>
          <div className="col-6 col-xl-2"><strong>{summaryValue(summary, "paper_ready", flatCandidates.length)}</strong><span> Paper Ready</span></div>
          <div className="col-6 col-xl-2"><strong>{summaryValue(summary, "rejected")}</strong><span> Rejected</span></div>
          <div className="col-6 col-xl-2"><strong>{summaryValue(summary, "failed_results")}</strong><span> Failed</span></div>
          <div className="col-6 col-xl-2"><strong>{summaryValue(summary, "duration_seconds")}</strong><span> Sec</span></div>
        </div>
      </section>

      {topFailureReasons.length ? (
        <section className="dashboard-panel mt-4">
          <h2 className="h5">Failure Reasons</h2>
          <div className="table-responsive">
            <table className="table table-dark table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Count</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {topFailureReasons.map((row) => (
                  <tr key={row.reason}>
                    <td>{row.count}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="dashboard-panel mt-4">
        <div className="table-responsive">
          <table className="table table-dark table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Side</th>
                <th>Strategy</th>
                <th>Bucket</th>
                <th>Score</th>
                <th>Trades</th>
                <th>Win%</th>
                <th>Net</th>
                <th>PF</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {(result?.results ?? []).slice(0, 80).map((row) => (
                <tr key={`${row.instrument_key}-${row.side}-${row.strategy_id}`}>
                  <td>{row.symbol}</td>
                  <td>{row.side.toUpperCase()}</td>
                  <td>{row.strategy_label}</td>
                  <td>{row.bucket}</td>
                  <td>{row.qualification_score}</td>
                  <td>{row.metrics.total_trades}</td>
                  <td>{row.metrics.win_rate}</td>
                  <td>{money(row.metrics.net_pnl)}</td>
                  <td>{row.metrics.profit_factor ?? "-"}</td>
                  <td style={{ minWidth: 280 }}>{row.backtest_message || row.qualification_reason}</td>
                </tr>
              ))}
              {!result?.results?.length ? (
                <tr>
                  <td colSpan={10}>No qualification batch loaded.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-panel mt-4">
        <h2 className="h5">Paper Candidates</h2>
        <div className="table-responsive">
          <table className="table table-dark table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Side</th>
                <th>Strategy</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {flatCandidates.map((row) => (
                <tr key={`candidate-${row.instrument_key}-${row.side}-${row.strategy_id}`}>
                  <td>{row.symbol}</td>
                  <td>{row.side.toUpperCase()}</td>
                  <td>{row.name}</td>
                  <td>{row.bucket}</td>
                </tr>
              ))}
              {!flatCandidates.length ? (
                <tr>
                  <td colSpan={4}>No paper candidates.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
