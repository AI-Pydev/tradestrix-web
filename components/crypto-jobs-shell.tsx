"use client";

import { FormEvent, Fragment, useEffect, useRef, useState } from "react";

import {
  CryptoJobStartRequest,
  CryptoJobLog,
  CryptoJobsSummary,
  CryptoManagedJob,
  CryptoManagedTrade,
  fetchCryptoJobsSummary,
  listCryptoJobTrades,
  listCryptoJobLogs,
  listCryptoJobs,
  startCryptoJob,
  stopAllCryptoJobs,
  stopCryptoJob,
} from "@/lib/api";

const CRYPTO_STRATEGIES = [
  ["CRYPTO_BTC_REGIME_V1", "BTC Regime Breakout (Recommended, 1h)"],
  ["CRYPTO_MOMENTUM_V1", "Crypto Momentum"],
  ["CRYPTO_TV_HA_V1", "Crypto TV-HA"],
  ["CRYPTO_FIBO_V1", "Crypto FIBO"],
  ["CRYPTO_JK_V1", "Crypto JK"],
] as const;

const DEFAULT_FORM: CryptoJobStartRequest = {
  symbol: "BTCUSD",
  timeframe: "1h",
  execution_mode: "demo",
  strategy_name: "CRYPTO_BTC_REGIME_V1",
  quantity: 1,
  poll_interval_sec: 15,
  atr_multiplier_sl: 2,
  min_stop_percent: 1.25,
  target_rr: 1.5,
  max_hold_minutes: 1440,
  max_trades_per_hour: 3,
  max_trades_per_day: 10,
  max_daily_loss: 1000,
  leverage: 1,
};

function fmt(value?: number | null, digits = 2) {
  return value == null ? "-" : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function dateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function isActiveStatus(status: CryptoManagedJob["status"]) {
  return ["starting", "running", "stopping"].includes(status);
}

function statusBadge(status: CryptoManagedJob["status"]) {
  if (status === "running") return "text-bg-success";
  if (status === "starting") return "text-bg-info";
  if (status === "stopping") return "text-bg-warning";
  if (status === "failed") return "text-bg-danger";
  return "text-bg-secondary";
}

export function CryptoJobsShell() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [summary, setSummary] = useState<CryptoJobsSummary | null>(null);
  const [jobs, setJobs] = useState<CryptoManagedJob[]>([]);
  const [trades, setTrades] = useState<CryptoManagedTrade[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string>("");
  const expandedJobIdRef = useRef("");
  const logPanelRef = useRef<HTMLDivElement | null>(null);
  const [logs, setLogs] = useState<CryptoJobLog[]>([]);
  const [logsUpdatedAt, setLogsUpdatedAt] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      const [nextSummary, nextJobs, nextTrades] = await Promise.all([
        fetchCryptoJobsSummary(),
        listCryptoJobs(),
        listCryptoJobTrades(),
      ]);
      setSummary(nextSummary);
      setJobs(nextJobs);
      setTrades(nextTrades);
      const logJobId = expandedJobIdRef.current;
      if (logJobId) {
        setLogs(await listCryptoJobLogs(logJobId));
        setLogsUpdatedAt(new Date().toISOString());
      } else {
        setLogs([]);
        setLogsUpdatedAt("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to refresh crypto jobs");
    }
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }
  }, [logs]);

  async function handleStart(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const job = await startCryptoJob(form);
      setMessage(`Started ${job.job_name}. Live logs opened below.`);
      setExpandedJobId(job.job_id);
      expandedJobIdRef.current = job.job_id;
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start crypto job");
    } finally {
      setBusy(false);
    }
  }

  function handleStrategyChange(strategyName: string) {
    if (strategyName === "CRYPTO_BTC_REGIME_V1") {
      setForm({
        ...form,
        strategy_name: strategyName,
        symbol: "BTCUSD",
        timeframe: "1h",
        atr_multiplier_sl: 2,
        min_stop_percent: 1.25,
        target_rr: 1.5,
        max_hold_minutes: 1440,
      });
      return;
    }
    setForm({ ...form, strategy_name: strategyName });
  }

  async function handleStop(jobId: string) {
    setBusy(true);
    try {
      await stopCryptoJob(jobId);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleStopAll() {
    setBusy(true);
    try {
      await stopAllCryptoJobs();
      setMessage("All crypto jobs are stopping.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleDetails(jobId: string) {
    if (expandedJobIdRef.current === jobId) {
      setExpandedJobId("");
      expandedJobIdRef.current = "";
      setLogs([]);
      setLogsUpdatedAt("");
      return;
    }
    setExpandedJobId(jobId);
    expandedJobIdRef.current = jobId;
    try {
      setLogs(await listCryptoJobLogs(jobId));
      setLogsUpdatedAt(new Date().toISOString());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load crypto job logs");
    }
  }

  const metrics = [
    ["Managed Jobs", summary?.managed_jobs],
    ["Active Jobs", summary?.active_jobs],
    ["Open Positions", summary?.open_positions],
    ["Closed Trades", summary?.closed_trades],
    ["Realized PnL", summary?.realized_pnl],
  ];
  const activeJobs = jobs.filter((job) => isActiveStatus(job.status));
  const stoppedJobs = jobs.filter((job) => !isActiveStatus(job.status));

  function renderJobRows(items: CryptoManagedJob[], emptyMessage: string) {
    if (!items.length) {
      return <tr><td colSpan={6} className="muted">{emptyMessage}</td></tr>;
    }
    return items.map((job) => (
      <Fragment key={job.job_id}>
        <tr className={isActiveStatus(job.status) ? "table-success" : undefined}>
          <td>
            <strong>{job.job_name}</strong>
            <div className="small muted">
              {job.symbol} · {job.timeframe} · <span className={`badge ${job.execution_mode === "demo" ? "text-bg-warning" : "text-bg-secondary"}`}>{job.execution_mode.toUpperCase()}</span> · {dateTime(job.started_at)}
            </div>
          </td>
          <td>
            <span className={`badge ${statusBadge(job.status)} text-uppercase`}>{job.status}</span>
            <div className="small muted mt-1">
              {isActiveStatus(job.status) ? `Last cycle: ${dateTime(job.last_cycle_at)}` : `Stopped: ${dateTime(job.stopped_at)}`}
            </div>
          </td>
          <td>{job.last_signal}<div className="small muted">{job.last_signal_reason}</div></td>
          <td>{job.has_open_position ? `${job.position?.side} @ ${fmt(job.position?.entry_price as number)}` : "Flat"}</td>
          <td>{fmt(job.realized_pnl, 4)}</td>
          <td>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => handleToggleDetails(job.job_id)}>
                {expandedJobId === job.job_id ? "Hide Live Logs" : `Details / Logs (${job.log_line_count})`}
              </button>
              <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy || !isActiveStatus(job.status)} onClick={() => handleStop(job.job_id)}>
                {isActiveStatus(job.status) ? "Stop" : "Stopped"}
              </button>
            </div>
          </td>
        </tr>
        {expandedJobId === job.job_id && (
          <tr>
            <td colSpan={6}>
              <div className="alert alert-info py-2">
                Showing logs for <strong>{job.job_name}</strong> · <span className={`badge ${statusBadge(job.status)} text-uppercase`}>{job.status}</span>
              </div>
              <div className="row g-3">
                <div className="col-12 col-xl-4">
                  <div className="small muted"><strong>Job ID:</strong> {job.job_id}</div>
                  <div className="small muted"><strong>Mode:</strong> {job.execution_mode.toUpperCase()}</div>
                  <div className="small muted"><strong>Strategy:</strong> {job.strategy_name}</div>
                  <div className="small muted"><strong>Polling:</strong> {job.poll_interval_sec}s</div>
                  <div className="small muted"><strong>Trades:</strong> {job.trade_count} total / {job.closed_trade_count} closed</div>
                  <div className="small muted"><strong>Log Lines:</strong> {job.log_line_count}</div>
                  <div className="small muted"><strong>Last Candle:</strong> {dateTime(job.last_candle_at)}</div>
                  <div className="small muted"><strong>Last Error:</strong> {job.last_error || "None"}</div>
                </div>
                <div className="col-12 col-xl-8">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-semibold">
                      {isActiveStatus(job.status) ? "Live Job Log" : "Stored Job Log"}
                      {isActiveStatus(job.status) && <span className="badge text-bg-success ms-1">ON · refreshes every 5s</span>}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="small muted">Updated {dateTime(logsUpdatedAt)}</span>
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={refresh}>Refresh Now</button>
                    </div>
                  </div>
                  <div ref={logPanelRef} className="rounded border p-3 bg-dark text-light font-monospace small" style={{ minHeight: 220, maxHeight: 440, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                    {logs.length
                      ? logs.map((log) => `[${dateTime(log.created_at)}] ${log.level.padEnd(7)} ${log.event}: ${log.message}`).join("\n")
                      : "No logs captured yet."}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    ));
  }

  return (
    <main>
      <section className="dashboard-hero mb-4">
        <div>
          <p className="eyebrow">Isolated Crypto Runtime</p>
          <h1 className="hero-title">Crypto Jobs</h1>
          <p className="muted mb-0">
            Continuously running Delta BTC/ETH paper jobs, isolated from Indian-market execution workers.
          </p>
        </div>
      </section>

      <div className="row g-3 mb-4">
        {metrics.map(([label, value]) => (
          <div className="col-6 col-lg" key={label}>
            <div className="metric-card p-3 h-100">
              <div className="muted small">{label}</div>
              <div className="fs-4 fw-semibold">{fmt(value as number | undefined)}</div>
            </div>
          </div>
        ))}
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <div className="row g-4 mb-4">
        <div className="col-lg-5">
          <form className="dashboard-panel p-3 h-100" onSubmit={handleStart}>
            <h2 className="panel-title">Launch Paper Job</h2>
            <div className="alert alert-warning small">
              Delta demo mode places real testnet orders. Production-live hosts remain blocked.
            </div>
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label">Execution</label>
                <select className="form-select" value={form.execution_mode} onChange={(event) => setForm({ ...form, execution_mode: event.target.value as CryptoJobStartRequest["execution_mode"] })}>
                  <option value="demo">Delta Demo / Testnet</option>
                  <option value="paper">Local Paper</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label">Symbol</label>
                <select className="form-select" value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })}>
                  <option>BTCUSD</option>
                  <option>ETHUSD</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label">Timeframe</label>
                <select className="form-select" value={form.timeframe} onChange={(event) => setForm({ ...form, timeframe: event.target.value as CryptoJobStartRequest["timeframe"] })}>
                  {["1m", "3m", "5m", "15m", "1h"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Crypto Strategy</label>
                <select className="form-select" value={form.strategy_name} onChange={(event) => handleStrategyChange(event.target.value)}>
                  {CRYPTO_STRATEGIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              {[
                ["Quantity", "quantity"],
                ["Poll seconds", "poll_interval_sec"],
                ["ATR stop multiplier", "atr_multiplier_sl"],
                ["Minimum stop %", "min_stop_percent"],
                ["Target R:R", "target_rr"],
                ["Max hold minutes", "max_hold_minutes"],
                ["Max trades/hour", "max_trades_per_hour"],
                ["Max trades/day", "max_trades_per_day"],
                ["Max daily loss", "max_daily_loss"],
                ["Demo leverage", "leverage"],
              ].map(([label, key]) => (
                <div className="col-6" key={key}>
                  <label className="form-label">{label}</label>
                  <input className="form-control" type="number" min="0" step="any" value={form[key as keyof CryptoJobStartRequest] as number} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} />
                </div>
              ))}
            </div>
            <button className="btn btn-warning mt-3" disabled={busy}>Start Continuous Paper Job</button>
          </form>
        </div>

        <div className="col-lg-7">
          <section className="dashboard-panel p-3 h-100">
            <div className="d-flex justify-content-between align-items-center">
              <h2 className="panel-title">Crypto Fleet</h2>
              <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy || !summary?.active_jobs} onClick={handleStopAll}>Stop All</button>
            </div>
            <h3 className="h6 mt-3">Running Jobs <span className="badge text-bg-success">{activeJobs.length}</span></h3>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Job</th><th>Status</th><th>Signal</th><th>Position</th><th>PnL</th><th /></tr></thead>
                <tbody>{renderJobRows(activeJobs, "No crypto jobs are currently running.")}</tbody>
              </table>
            </div>
            <h3 className="h6 mt-4">Stopped / History <span className="badge text-bg-secondary">{stoppedJobs.length}</span></h3>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead><tr><th>Job</th><th>Status</th><th>Last Signal</th><th>Position</th><th>PnL</th><th /></tr></thead>
                <tbody>{renderJobRows(stoppedJobs, "No stopped jobs yet.")}</tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <section className="dashboard-panel p-3">
        <h2 className="panel-title">Trade Journal</h2>
        <div className="table-responsive">
          <table className="table align-middle">
            <thead><tr><th>Symbol</th><th>Side</th><th>Entry</th><th>SL / Target</th><th>Exit</th><th>Status</th><th>PnL</th></tr></thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.trade_id}>
                  <td>{trade.symbol}<div className="small muted">{trade.timeframe}</div></td>
                  <td>{trade.side}</td>
                  <td>{fmt(trade.entry_price, 4)}<div className="small muted">{dateTime(trade.entry_time)}</div></td>
                  <td>{fmt(trade.stoploss, 4)} / {fmt(trade.target, 4)}</td>
                  <td>{fmt(trade.exit_price, 4)}<div className="small muted">{trade.exit_reason || "-"}</div></td>
                  <td>{trade.status}<div className="small muted">{trade.pnl_source || "-"}</div></td>
                  <td>
                    {fmt(trade.net_pnl, 4)}
                    <div className="small muted">Gross {fmt(trade.gross_pnl, 4)} | Fees {fmt(trade.charges, 4)}</div>
                    {(trade.entry_order_id || trade.exit_order_id) && (
                      <div className="small muted">Orders {trade.entry_order_id || "-"} / {trade.exit_order_id || "-"}</div>
                    )}
                  </td>
                </tr>
              ))}
              {!trades.length && <tr><td colSpan={7} className="muted">No crypto job trades yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
