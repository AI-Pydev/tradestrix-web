"use client";

import { useEffect, useState } from "react";

import {
  enqueueStrategyQualification,
  fetchStrategyQualificationJob,
  fetchStrategyQualificationCandidates,
  fetchStrategyQualificationRegistry,
  StrategyQualificationBatch,
  StrategyQualificationRunRequest,
  StrategyRegistryEntry,
} from "@/lib/api";

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
    strategy_ids: ["fibo_nk_call", "ol_oh_call", "nc_ha_call_entry", "fibo_nk_put", "tv_ha_put_v2"],
    timeframe: "3m",
    underlying_unit: "minutes",
    underlying_interval: "3",
    option_interval: "1minute",
    current_option_unit: "minutes",
    current_option_interval: "1",
    strike_offset: 0,
    lots: 1,
    max_entry_ltp: 1000,
    sl_premium_pct: 0.35,
    target_premium_pct: 0.65,
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

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function StrategyQualificationShell() {
  const [form, setForm] = useState<StrategyQualificationRunRequest>(() => defaultRequest());
  const [instrumentText, setInstrumentText] = useState(form.instrument_keys.join(", "));
  const [strategyText, setStrategyText] = useState(form.strategy_ids.join(", "));
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<StrategyQualificationBatch | null>(null);
  const [registry, setRegistry] = useState<StrategyRegistryEntry[]>([]);
  const [candidates, setCandidates] = useState<Record<string, { call: StrategyRegistryEntry[]; put: StrategyRegistryEntry[] }>>({});

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
  }, []);

  async function runBatch() {
    setRunning(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        instrument_keys: splitCsv(instrumentText),
        strategy_ids: splitCsv(strategyText),
      };
      const queued = await enqueueStrategyQualification(payload);
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
            <textarea
              className="form-control"
              onChange={(event) => setInstrumentText(event.target.value)}
              rows={4}
              value={instrumentText}
            />
          </div>
          <div className="col-12 col-xl-5">
            <label className="form-label">Strategies</label>
            <textarea
              className="form-control"
              onChange={(event) => setStrategyText(event.target.value)}
              rows={4}
              value={strategyText}
            />
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
