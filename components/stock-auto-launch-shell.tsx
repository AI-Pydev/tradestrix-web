"use client";

import { useEffect, useState } from "react";

import {
    disableUpstoxStockAutoLaunch,
    enableUpstoxStockAutoLaunch,
    fetchUpstoxStockAutoLaunchStatus,
    syncUpstoxStockAutoLaunch,
    UpstoxStockAutoLaunchStatus,
} from "@/lib/api";

function fmtDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function fmtMoney(value?: number | null) {
  if (value == null) {
    return "-";
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function boolTone(value: boolean) {
  return value ? "green" : "gold";
}

export function StockAutoLaunchShell() {
  const [status, setStatus] = useState<UpstoxStockAutoLaunchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStatus(options?: { quiet?: boolean }) {
      try {
        if (!options?.quiet) {
          setLoading(true);
        }
        const result = await fetchUpstoxStockAutoLaunchStatus();
        if (!active) {
          return;
        }
        setStatus(result);
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load stock auto-launch status");
      } finally {
        if (active && !options?.quiet) {
          setLoading(false);
        }
      }
    }

    void loadStatus();
    const intervalId = window.setInterval(() => {
      void loadStatus({ quiet: true });
    }, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleAction(kind: "enable" | "disable" | "sync") {
    try {
      setAction(kind);
      setError("");
      const result =
        kind === "enable"
          ? await enableUpstoxStockAutoLaunch()
          : kind === "disable"
            ? await disableUpstoxStockAutoLaunch()
            : await syncUpstoxStockAutoLaunch();
      setStatus(result);
      setMessage(
        kind === "enable"
          ? "Stock auto launch is enabled."
          : kind === "disable"
            ? "Stock auto launch is disabled."
            : "Stock auto-launch sync completed.",
      );
      setMessageTone(result.last_error ? "error" : "success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update stock auto-launch");
      setMessageTone("error");
    } finally {
      setAction("");
    }
  }

  const isLive = status?.execution_broker === "kotak_neo";

  const metrics = [
    { label: "Automation", value: status?.enabled ? "Enabled" : "Disabled", tone: boolTone(Boolean(status?.enabled)) },
    { label: "Execution", value: isLive ? "Live - Kotak" : "Paper", tone: isLive ? "gold" : "blue" },
    {
      label: "Launch Window",
      value: status?.launch_window_open ? "Open" : "Closed",
      tone: boolTone(Boolean(status?.launch_window_open)),
    },
    {
      label: "Qualified Targets",
      value: String(status?.summary.desired_job_count ?? 0),
      tone: "blue",
    },
  ];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="stock-auto-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#stock-auto-top">
              Overview
            </a>
            <a className="hero-tab" href="#stock-auto-targets">
              Qualified Targets
            </a>
            <a className="hero-tab" href="#stock-auto-jobs">
              Active Jobs
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Stock Auto Launch</h1>
            <p className="hero-subtitle">
              Isolated automation for a small qualified stock universe. It launches exactly the strategies the
              assignment engine qualified (PnL + win-rate gated) for each stock, and defaults to paper execution.
            </p>
          </div>
          <div className="p-3">
            {message ? (
              <div className={`alert ${messageTone === "success" ? "alert-success" : "alert-danger"}`}>{message}</div>
            ) : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}
            {loading && !status ? <div className="muted">Loading stock auto-launch status...</div> : null}
            <div className="row g-3">
              {metrics.map((metric) => (
                <div className="col-12 col-sm-6 col-lg-3" key={metric.label}>
                  <div className="metric-card p-3 h-100">
                    <div className="metric-label">{metric.label}</div>
                    <div className={`badge-soft ${metric.tone} mt-3`}>{metric.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="d-flex flex-wrap gap-2 mt-3">
              <button
                className="btn btn-warning"
                disabled={action !== "" || status?.enabled}
                onClick={() => void handleAction("enable")}
                type="button"
              >
                {action === "enable" ? "Enabling..." : "Enable Auto Launch"}
              </button>
              <button
                className="btn btn-outline-danger"
                disabled={action !== "" || !status?.enabled}
                onClick={() => void handleAction("disable")}
                type="button"
              >
                {action === "disable" ? "Disabling..." : "Disable"}
              </button>
              <button
                className="btn btn-outline-light"
                disabled={action !== ""}
                onClick={() => void handleAction("sync")}
                type="button"
              >
                {action === "sync" ? "Syncing..." : "Sync Now"}
              </button>
            </div>
            {isLive ? (
              <div className="small text-warning mt-3">
                Live mode places real Kotak Neo orders for qualified stock jobs. Switch via
                UPSTOX_STOCK_AUTO_EXECUTION_BROKER.
              </div>
            ) : (
              <div className="small muted mt-3">Paper mode records simulated auto-launch trades.</div>
            )}
            <div className="muted mt-3">
              Market clock: {fmtDateTime(status?.market_now)} | Open {status?.config.market_open ?? "-"} | Cutoff{" "}
              {status?.config.entry_cutoff ?? "-"} | Exit {status?.config.time_exit ?? "-"}
            </div>
          </div>
        </section>

        <div className="row g-4">
          <div className="col-12 col-xl-8">
            <section className="dashboard-panel" id="stock-auto-targets">
              <h2 className="panel-title">Qualified Stock Targets</h2>
              <div className="p-3">
                {!status?.targets.length ? (
                  <div className="empty-state">
                    No qualified stock targets yet. Run a strategy-assignment batch (win-rate + net-PnL gated) for
                    these stocks to populate the launcher.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-dark-shell align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Stock</th>
                          <th>Side</th>
                          <th>Strategy</th>
                          <th>Lot</th>
                          <th>Win %</th>
                          <th>Net PnL</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.targets.map((target) => (
                          <tr key={`${target.instrument_key}:${target.side}:${target.strategy_id}`}>
                            <td>
                              <div className="fw-semibold">{target.label}</div>
                              <div className="muted small">{target.instrument_key}</div>
                            </td>
                            <td>
                              <span className={`badge-soft ${target.side === "call" ? "blue" : "gold"}`}>
                                {target.side.toUpperCase()}
                              </span>
                            </td>
                            <td>{target.strategy_label}</td>
                            <td>{target.lot_size ?? "-"}</td>
                            <td>{target.win_rate.toFixed(1)}%</td>
                            <td>{fmtMoney(target.total_pnl)}</td>
                            <td>
                              <span className={`badge-soft ${target.active ? "green" : "gold"}`}>
                                {target.active ? "Active" : "Waiting"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="col-12 col-xl-4">
            <section className="dashboard-panel">
              <h2 className="panel-title">Auto Launch Notes</h2>
              <div className="p-3">
                <div className="row g-2">
                  {[
                    { label: "Last Run", value: fmtDateTime(status?.last_run_at) },
                    { label: "Last Success", value: fmtDateTime(status?.last_success_at) },
                    { label: "Started Last Sync", value: String(status?.summary.started_count ?? 0) },
                    { label: "Failed Last Sync", value: String(status?.summary.failed_count ?? 0) },
                  ].map((item) => (
                    <div className="col-12" key={item.label}>
                      <div
                        className="d-flex justify-content-between align-items-center gap-3 px-3 py-2"
                        style={{ border: "1px solid rgba(255, 255, 255, 0.06)", background: "rgba(8, 19, 33, 0.28)" }}
                      >
                        <div className="metric-label">{item.label}</div>
                        <div className="badge-soft blue">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {status?.last_error ? (
                  <div className="alert alert-danger mt-3 mb-0">{status.last_error}</div>
                ) : (
                  <div className="muted mt-3">
                    No launcher error is currently recorded. If targets stay in waiting state during market hours,
                    use Sync Now once to inspect the latest result.
                  </div>
                )}
                <div className="mt-3 muted">
                  {status?.notes.map((note) => (
                    <div className="mt-2" key={note}>
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="dashboard-panel mt-4" id="stock-auto-jobs">
          <h2 className="panel-title">Current Auto-Managed Jobs</h2>
          <div className="p-3">
            {!status?.active_jobs.length ? (
              <div className="empty-state">No active stock auto-launch jobs are running right now.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark-shell align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Stock</th>
                      <th>Side</th>
                      <th>Status</th>
                      <th>Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.active_jobs.map((job) => (
                      <tr key={job.job_id}>
                        <td>
                          <div className="fw-semibold">{job.job_name}</div>
                          <div className="muted small">{job.job_id}</div>
                        </td>
                        <td>{job.label}</td>
                        <td>
                          <span className={`badge-soft ${job.side === "call" ? "blue" : "gold"}`}>
                            {job.side.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-soft ${job.status === "running" ? "green" : "gold"}`}>
                            {job.status}
                          </span>
                        </td>
                        <td>{job.strategy_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
