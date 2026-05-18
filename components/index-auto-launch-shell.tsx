"use client";

import { useEffect, useState } from "react";

import {
    disableUpstoxIndexAutoLaunch,
    enableUpstoxIndexAutoLaunch,
    fetchUpstoxIndexAutoLaunchStatus,
    setUpstoxIndexAutoLaunchDefaultStrategies,
    setUpstoxIndexAutoLaunchStrategy,
    syncUpstoxIndexAutoLaunch,
    UpstoxIndexAutoLaunchStatus,
} from "@/lib/api";

const CALL_STRATEGY_OPTIONS = [
  { value: "tv_ha_call_v2", label: "TV-HA CALL v2" },
  { value: "nc_ha_call_entry", label: "NC HA CALL Entry" },
  { value: "fibo_nk_call", label: "FIBO-NK CALL" },
  { value: "jk_oc_call_opt_int", label: "JK OC CALL OPT INT" },
  { value: "ol_oh_call", label: "OL-OH CALL" },
  { value: "momentum_call", label: "Momentum CALL" },
];

const PUT_STRATEGY_OPTIONS = [
  { value: "tv_ha_put_v2", label: "TV-HA PUT v2" },
  { value: "fibo_nk_put", label: "FIBO-NK PUT" },
  { value: "ol_oh_put", label: "OL-OH PUT" },
  { value: "momentum_put", label: "Momentum PUT" },
];

const STRATEGY_BASKET_PRESETS = [
  {
    key: "tv_ha",
    label: "TV-HA Basket",
    callStrategyId: "tv_ha_call_v2",
    putStrategyId: "tv_ha_put_v2",
  },
  {
    key: "fibo",
    label: "FIBO-NK Basket",
    callStrategyId: "fibo_nk_call",
    putStrategyId: "fibo_nk_put",
  },
  {
    key: "ol_oh",
    label: "OL-OH Basket",
    callStrategyId: "ol_oh_call",
    putStrategyId: "ol_oh_put",
  },
];

const STRATEGY_BASKET_LABELS: Record<string, string> = Object.fromEntries(
  [
    ["default", "Default Basket"],
    ...STRATEGY_BASKET_PRESETS.map((preset): [string, string] => [preset.key, preset.label]),
  ],
);

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

function boolTone(value: boolean) {
  return value ? "green" : "gold";
}

function strategyOptionLabel(side: "call" | "put", strategyId?: string | null) {
  const options = side === "put" ? PUT_STRATEGY_OPTIONS : CALL_STRATEGY_OPTIONS;
  return options.find((item) => item.value === strategyId)?.label ?? strategyId ?? "-";
}

export function IndexAutoLaunchShell() {
  const [status, setStatus] = useState<UpstoxIndexAutoLaunchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [error, setError] = useState("");
  const [savingStrategy, setSavingStrategy] = useState<string | null>(null); // "instrumentKey:side"
  const [savingPreset, setSavingPreset] = useState<string | null>(null);
  const [savingBroker, setSavingBroker] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadStatus(options?: { quiet?: boolean }) {
      try {
        if (!options?.quiet) {
          setLoading(true);
        }
        const result = await fetchUpstoxIndexAutoLaunchStatus();
        if (!active) {
          return;
        }
        setStatus(result);
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load index auto-launch status");
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
          ? await enableUpstoxIndexAutoLaunch()
          : kind === "disable"
            ? await disableUpstoxIndexAutoLaunch()
            : await syncUpstoxIndexAutoLaunch();
      setStatus(result);
      setMessage(
        kind === "enable"
          ? "Indices-only auto launch is enabled."
          : kind === "disable"
            ? "Indices-only auto launch is disabled."
            : "Index auto-launch sync completed.",
      );
      setMessageTone(result.last_error ? "error" : "success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update index auto-launch");
      setMessageTone("error");
    } finally {
      setAction("");
    }
  }

  async function handleSetStrategy(instrument_key: string, side: "call" | "put", strategy_id: string) {
    const key = `${instrument_key}:${side}`;
    try {
      setSavingStrategy(key);
      setError("");
      const result = await setUpstoxIndexAutoLaunchStrategy(instrument_key, side, strategy_id);
      setStatus(result);
      setMessage(`Strategy updated to "${strategy_id}" for ${side.toUpperCase()} on ${instrument_key}.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update strategy");
      setMessageTone("error");
    } finally {
      setSavingStrategy(null);
    }
  }

  async function handleApplyPreset(preset: (typeof STRATEGY_BASKET_PRESETS)[number]) {
    try {
      setSavingPreset(preset.key);
      setError("");
      const result = await setUpstoxIndexAutoLaunchDefaultStrategies({
        call_strategy_id: preset.callStrategyId,
        put_strategy_id: preset.putStrategyId,
        apply_to_targets: true,
      });
      setStatus(result);
      setMessage(`${preset.label} applied to all eligible indices.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to apply strategy basket");
      setMessageTone("error");
    } finally {
      setSavingPreset(null);
    }
  }

  async function handleSetBroker(brokerName: string) {
    try {
      setSavingBroker(true);
      setMessage("");
      const result = await setUpstoxIndexAutoLaunchDefaultStrategies({
        execution_broker: brokerName as "paper" | "kotak_neo" | "upstox" | "kite",
      });
      setStatus(result);
      setMessage(`Execution broker set to ${brokerName === "paper" ? "Paper" : brokerName}.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update broker");
      setMessageTone("error");
    } finally {
      setSavingBroker(false);
    }
  }

  const metrics = [
    { label: "Automation", value: status?.enabled ? "Enabled" : "Disabled", tone: boolTone(Boolean(status?.enabled)) },
    {
      label: "Launch Window",
      value: status?.launch_window_open ? "Open" : "Closed",
      tone: boolTone(Boolean(status?.launch_window_open)),
    },
    {
      label: "Eligible Indices",
      value: String(status?.summary.eligible_index_count ?? 0),
      tone: "blue",
    },
    {
      label: "Active Jobs",
      value: String(status?.summary.active_job_count ?? 0),
      tone: "blue",
    },
  ];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="index-auto-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#index-auto-top">
              Overview
            </a>
            <a className="hero-tab" href="#index-auto-targets">
              Eligible Indices
            </a>
            <a className="hero-tab" href="#index-auto-jobs">
              Active Jobs
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Index Auto Launch</h1>
            <p className="hero-subtitle">
              Isolated automation for verified index CALL and PUT bots only. It arms during market hours and leaves the
              manual launcher untouched.
            </p>
          </div>
          <div className="p-3">
            {message ? (
              <div className={`alert ${messageTone === "success" ? "alert-success" : "alert-danger"}`}>{message}</div>
            ) : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}
            {loading && !status ? <div className="muted">Loading index auto-launch status...</div> : null}
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
                disabled={action !== "" || savingPreset !== null || status?.enabled}
                onClick={() => void handleAction("enable")}
                type="button"
              >
                {action === "enable" ? "Enabling..." : "Enable Auto Launch"}
              </button>
              <button
                className="btn btn-outline-danger"
                disabled={action !== "" || savingPreset !== null || !status?.enabled}
                onClick={() => void handleAction("disable")}
                type="button"
              >
                {action === "disable" ? "Disabling..." : "Disable"}
              </button>
              <button
                className="btn btn-outline-light"
                disabled={action !== "" || savingPreset !== null}
                onClick={() => void handleAction("sync")}
                type="button"
              >
                {action === "sync" ? "Syncing..." : "Sync Now"}
              </button>
            </div>
            <div
              className="mt-3 p-3"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(8, 19, 33, 0.28)" }}
            >
              <div className="metric-label">Strategy Basket Presets</div>
              <div className="muted mt-1">
                Apply a full CALL and PUT pair across all eligible indices. This also becomes the default for new
                verified indices that do not have a manual override yet.
              </div>
              <div className="d-flex flex-wrap gap-2 mt-3">
                {STRATEGY_BASKET_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    className="btn btn-outline-light"
                    disabled={action !== "" || savingPreset !== null || savingStrategy !== null}
                    onClick={() => void handleApplyPreset(preset)}
                    type="button"
                  >
                    {savingPreset === preset.key ? `Applying ${preset.label}...` : preset.label}
                  </button>
                ))}
              </div>
              <div className="d-flex gap-2 align-items-end flex-wrap mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem" }}>
                <div>
                  <label className="form-label">Execution Broker</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: "160px" }}
                    disabled={action !== "" || savingPreset !== null || savingStrategy !== null || savingBroker}
                    value={status?.config.execution_broker ?? "paper"}
                    onChange={(e) => void handleSetBroker(e.target.value)}
                  >
                    <option value="paper">Paper Trading</option>
                    <option value="kotak_neo">Kotak Neo</option>
                    <option value="upstox">Upstox</option>
                    <option value="kite">Kite (Zerodha)</option>
                  </select>
                  {savingBroker && <div className="small muted mt-1">Updating...</div>}
                </div>
              </div>
              <div className="muted mt-3">
                Default CALL: {strategyOptionLabel("call", status?.config.default_call_strategy_id)} | Default PUT:{" "}
                {strategyOptionLabel("put", status?.config.default_put_strategy_id)}
              </div>
              <div className="muted mt-2">
                Active test baskets:{" "}
                {status?.config.enabled_strategy_basket_ids
                  .map((basketId) => STRATEGY_BASKET_LABELS[basketId] ?? basketId)
                  .join(", ") || "-"}
              </div>
            </div>
            <div className="muted mt-3">
              Market clock: {fmtDateTime(status?.market_now)} | Open {status?.config.market_open ?? "-"} | Cutoff{" "}
              {status?.config.entry_cutoff ?? "-"} | Exit {status?.config.time_exit ?? "-"}
            </div>
          </div>
        </section>

        <div className="row g-4">
          <div className="col-12 col-xl-8">
            <section className="dashboard-panel" id="index-auto-targets">
              <h2 className="panel-title">Eligible Index Basket</h2>
              <div className="p-3">
                {!status?.targets.length ? (
                  <div className="empty-state">No verified index instruments are ready for auto launch yet.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-dark-shell align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Index</th>
                          <th>Lot Size</th>
                          <th>CALL Strategy</th>
                          <th>CALL</th>
                          <th>PUT Strategy</th>
                          <th>PUT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.targets.map((target) => (
                          <tr key={target.instrument_key}>
                            <td>
                              <div className="fw-semibold">{target.label}</div>
                              <div className="muted small">{target.instrument_key}</div>
                            </td>
                            <td>{target.lot_size ?? "-"}</td>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                disabled={
                                  savingPreset !== null || savingStrategy === `${target.instrument_key}:call`
                                }
                                onChange={(e) =>
                                  void handleSetStrategy(target.instrument_key, "call", e.target.value)
                                }
                                style={{ background: "var(--color-surface-2, #0d1b2a)", color: "inherit", border: "1px solid rgba(255,255,255,0.15)" }}
                                value={target.call_strategy_id}
                              >
                                {CALL_STRATEGY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span className={`badge-soft ${target.call_active ? "green" : "gold"}`}>
                                {target.call_active ? "Active" : "Waiting"}
                              </span>
                            </td>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                disabled={
                                  savingPreset !== null || savingStrategy === `${target.instrument_key}:put`
                                }
                                onChange={(e) =>
                                  void handleSetStrategy(target.instrument_key, "put", e.target.value)
                                }
                                style={{ background: "var(--color-surface-2, #0d1b2a)", color: "inherit", border: "1px solid rgba(255,255,255,0.15)" }}
                                value={target.put_strategy_id}
                              >
                                {PUT_STRATEGY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span className={`badge-soft ${target.put_active ? "green" : "gold"}`}>
                                {target.put_active ? "Active" : "Waiting"}
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
                    No launcher error is currently recorded. If the basket stays in waiting state during market hours,
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

        <section className="dashboard-panel mt-4" id="index-auto-jobs">
          <h2 className="panel-title">Current Auto-Managed Jobs</h2>
          <div className="p-3">
            {!status?.active_jobs.length ? (
              <div className="empty-state">No active index auto-launch jobs are running right now.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark-shell align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Index</th>
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
                          <span className={`badge-soft ${job.side === "call" ? "blue" : "gold"}`}>{job.side.toUpperCase()}</span>
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
