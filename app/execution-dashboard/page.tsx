"use client";

import { useEffect, useState } from "react";

import { buildAuthorizedHeaders, throwIfApiError } from "@/lib/auth";

interface ExecutionStatus {
  mode: string;
  real_trading_approved: boolean;
  execution_desk_ip: string;
  client_ip: string;
  ip_verified: boolean;
  max_position_value: number;
  enforce_ip_whitelist: boolean;
  kotak_environment: string;
  dev_mode: boolean;
  allowed_indices: string[];
}

interface SignalQualifierSettings {
  enabled: boolean;
  min_score_threshold: number;
  require_htf_trend: boolean;
  require_sr_headroom: boolean;
  require_option_chain_pcr: boolean;
  chop_filter_enabled: boolean;
  min_volume_ratio: number;
  auto_breakeven_on_t1: boolean;
  partial_profit_pct: number;
}

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

export default function ExecutionDashboard() {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const [qualifierSettings, setQualifierSettings] =
    useState<SignalQualifierSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [approving, setApproving] = useState(false);
  const [qualifierUpdating, setQualifierUpdating] = useState(false);

  const fetchStatus = async () => {
    try {
      const [statusRes, qualRes] = await Promise.allSettled([
        fetch(`${BACKEND_BASE_URL}/api/v1/execution/status`, {
          headers: buildAuthorizedHeaders(),
        }),
        fetch(
          `${BACKEND_BASE_URL}/api/webhooks/tradingview/signal-qualifier/settings`,
          {
            headers: buildAuthorizedHeaders(),
          },
        ),
      ]);

      if (statusRes.status === "fulfilled") {
        await throwIfApiError(statusRes.value);
        const data: ExecutionStatus = await statusRes.value.json();
        setStatus(data);
      }
      if (qualRes.status === "fulfilled") {
        await throwIfApiError(qualRes.value);
        const qualData = await qualRes.value.json();
        if (qualData.settings) {
          setQualifierSettings(qualData.settings);
        }
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQualifier = async (
    patch: Partial<SignalQualifierSettings>,
  ) => {
    setQualifierUpdating(true);
    try {
      const res = await fetch(
        `${BACKEND_BASE_URL}/api/webhooks/tradingview/signal-qualifier/settings`,
        {
          method: "POST",
          headers: {
            ...buildAuthorizedHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        },
      );
      await throwIfApiError(res);
      const data = await res.json();
      if (data.settings) {
        setQualifierSettings(data.settings);
      }
      setSuccessMsg("Signal Gatekeeper settings updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update qualifier",
      );
    } finally {
      setQualifierUpdating(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMode = async () => {
    if (!status) return;

    const targetMode = status.mode === "paper" ? "real" : "paper";

    if (targetMode === "real") {
      if (!status.ip_verified) {
        setError(
          `Cannot enable real trading: Your IP (${status.client_ip}) is not whitelisted.` +
            (status.dev_mode
              ? " Using DEV mode? Try localhost (127.0.0.1)."
              : ""),
        );
        return;
      }

      if (!status.real_trading_approved) {
        setError("Real trading is not approved. Please approve it first.");
        return;
      }
    }

    setToggling(true);
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/v1/execution/toggle`,
        {
          method: "POST",
          headers: buildAuthorizedHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            mode: targetMode,
            reason: `User toggled from ${status.mode} to ${targetMode}`,
          }),
        },
      );

      await throwIfApiError(response);

      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setToggling(false);
    }
  };

  const handleApproveRealTrading = async (approved: boolean) => {
    if (!status) return;

    setApproving(true);
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/v1/execution/approve-real-trading`,
        {
          method: "POST",
          headers: buildAuthorizedHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            approved,
            reason: `User ${approved ? "approved" : "disapproved"} real trading`,
          }),
        },
      );

      await throwIfApiError(response);

      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval action failed");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen ts-command-shell p-4 sm:p-6">
        <div className="max-w-[1400px] mx-auto ts-card-soft rounded-2xl p-6 text-sm text-slate-400 font-mono">
          Loading execution status...
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen ts-command-shell p-4 sm:p-6">
        <div className="max-w-[1400px] mx-auto ts-card-soft rounded-2xl p-6 text-sm text-rose-400">
          Failed to load execution status.
        </div>
      </div>
    );
  }

  const isRealMode = status.mode === "real";

  return (
    <div className="min-h-screen ts-command-shell p-4 sm:p-5 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-5">
        {/* Header & Mode Banner */}
        <section
          className={`ts-card-soft rounded-2xl p-5 border ${
            isRealMode ? "border-rose-500/35" : "border-emerald-500/35"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                Trading Execution Mode & Gatekeeper
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Paper/real mode guardrails, IP whitelist verification, and
                pre-trade signal quality controls.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide border ${
                isRealMode
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRealMode ? "bg-rose-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              {isRealMode ? "REAL TRADING" : "PAPER TRADING"}
            </span>
          </div>

          {successMsg && (
            <div className="mb-4 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              {successMsg}
            </div>
          )}

          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Current Mode
              </div>
              <div className="text-base font-bold text-slate-100 mt-1">
                {status.mode.toUpperCase()}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Max Position Value
              </div>
              <div className="text-base font-bold text-slate-100 mt-1">
                ₹{status.max_position_value.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Kotak Environment
              </div>
              <div className="text-base font-bold text-slate-100 mt-1">
                {status.kotak_environment.toUpperCase()}
              </div>
            </div>
          </div>
        </section>

        {/* IP Whitelist & Allowed Indices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="ts-card-soft rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-100 tracking-tight border-b border-slate-800/80 pb-2.5">
              IP Whitelist Verification
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Your IP Address
                </div>
                <code className="block text-xs text-slate-200 mt-1 font-mono">
                  {status.client_ip}
                </code>
              </div>

              <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Whitelisted IP
                </div>
                <code className="block text-xs text-slate-200 mt-1 font-mono">
                  {status.execution_desk_ip}
                </code>
              </div>

              <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Dev Mode
                </div>
                <div className="text-xs text-slate-200 mt-1 font-mono">
                  {status.dev_mode ? "localhost (127.0.0.1) allowed" : "Disabled"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Whitelist Status
                </div>
                <div className="mt-1">
                  {status.ip_verified ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      VERIFIED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                      NOT VERIFIED
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3 text-xs text-slate-300">
              {status.ip_verified
                ? "IP verification passed for execution checks."
                : `Your IP does not match. Real trading is disabled.${
                    status.dev_mode
                      ? " Try localhost (127.0.0.1) for development."
                      : ""
                  }`}
            </div>
          </section>

          <div className="space-y-5">
            {/* Allowed Indices */}
            <section className="ts-card-soft rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-100 tracking-tight border-b border-slate-800/80 pb-2.5">
                Allowed Indices for Real Trading
              </h2>
              {status.allowed_indices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {status.allowed_indices.map((index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
                    >
                      {index}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-300">
                  No indices allowed for real trading. Only PAPER mode is
                  available.
                </p>
              )}
              <p className="text-xs text-slate-400">
                Real trades can only be executed on these indices. Configure via{" "}
                <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded">
                  ALLOWED_REAL_TRADING_INDICES
                </code>{" "}
                env var.
              </p>
            </section>

            {/* Real Trading Approval */}
            <section className="ts-card-soft rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                  Real Trading Approval
                </h2>
                {status.real_trading_approved ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    APPROVED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                    NOT APPROVED
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleApproveRealTrading(true)}
                  disabled={status.real_trading_approved || approving}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-500/35 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                >
                  {approving ? "Processing..." : "Approve Real Trading"}
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveRealTrading(false)}
                  disabled={!status.real_trading_approved || approving}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-rose-500/35 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                >
                  {approving ? "Processing..." : "Disapprove Real Trading"}
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Signal Quality Gatekeeper & Smart Exit Copilot */}
        <section className="ts-card-soft rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">
                Signal Quality Gatekeeper & Smart Exit Copilot
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Institutional pre-trade screening & profit lock to avoid
                whipsaws, noon chop, and premature exits.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                handleUpdateQualifier({ enabled: !qualifierSettings?.enabled })
              }
              disabled={qualifierUpdating}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                qualifierSettings?.enabled
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
              }`}
            >
              {qualifierSettings?.enabled
                ? "● GATEKEEPER ACTIVE"
                : "○ GATEKEEPER DISABLED"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5 space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Min Conviction Score
              </label>
              <select
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                value={qualifierSettings?.min_score_threshold ?? 70}
                onChange={(e) =>
                  handleUpdateQualifier({
                    min_score_threshold: parseInt(e.target.value, 10),
                  })
                }
                disabled={qualifierUpdating}
              >
                <option value="60">60% (Moderate)</option>
                <option value="70">70% (Recommended Default)</option>
                <option value="75">75% (High Conviction)</option>
                <option value="80">80% (Strict Institutional)</option>
              </select>
            </div>

            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5 space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                15M HTF Macro Trend
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qualifierSettings?.require_htf_trend ?? true}
                  onChange={(e) =>
                    handleUpdateQualifier({
                      require_htf_trend: e.target.checked,
                    })
                  }
                  disabled={qualifierUpdating}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                />
                <span>
                  {qualifierSettings?.require_htf_trend
                    ? "Enabled (No Counter-Trend)"
                    : "Disabled"}
                </span>
              </label>
            </div>

            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5 space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                S/R Headroom (R:R)
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qualifierSettings?.require_sr_headroom ?? true}
                  onChange={(e) =>
                    handleUpdateQualifier({
                      require_sr_headroom: e.target.checked,
                    })
                  }
                  disabled={qualifierUpdating}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                />
                <span>
                  {qualifierSettings?.require_sr_headroom
                    ? "Enabled (No Barrier Block)"
                    : "Disabled"}
                </span>
              </label>
            </div>

            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5 space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Option Chain PCR
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qualifierSettings?.require_option_chain_pcr ?? true}
                  onChange={(e) =>
                    handleUpdateQualifier({
                      require_option_chain_pcr: e.target.checked,
                    })
                  }
                  disabled={qualifierUpdating}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                />
                <span>
                  {qualifierSettings?.require_option_chain_pcr
                    ? "Enabled (OI Sentiment)"
                    : "Disabled"}
                </span>
              </label>
            </div>

            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5 space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Noon Chop Filter
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qualifierSettings?.chop_filter_enabled ?? true}
                  onChange={(e) =>
                    handleUpdateQualifier({
                      chop_filter_enabled: e.target.checked,
                    })
                  }
                  disabled={qualifierUpdating}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                />
                <span>
                  {qualifierSettings?.chop_filter_enabled
                    ? "11:30 - 13:15 Guard"
                    : "Disabled"}
                </span>
              </label>
            </div>

            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5 space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                T1 Auto-Breakeven SL
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qualifierSettings?.auto_breakeven_on_t1 ?? true}
                  onChange={(e) =>
                    handleUpdateQualifier({
                      auto_breakeven_on_t1: e.target.checked,
                    })
                  }
                  disabled={qualifierUpdating}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500"
                />
                <span>
                  {qualifierSettings?.auto_breakeven_on_t1
                    ? "Trail SL to Cost on +15%"
                    : "Disabled"}
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Mode Switch & How It Works */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="ts-card-soft rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-100 tracking-tight border-b border-slate-800/80 pb-2.5">
              Mode Switch
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Ready For Real
                </div>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  {status.ip_verified && status.real_trading_approved
                    ? "Yes"
                    : "No"}
                </div>
              </div>
              <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  IP Verified
                </div>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  {status.ip_verified ? "Yes" : "No"}
                </div>
              </div>
              <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Approved
                </div>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  {status.real_trading_approved ? "Yes" : "No"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleMode()}
              disabled={
                toggling ||
                (status.mode === "paper" &&
                  (!status.ip_verified || !status.real_trading_approved))
              }
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
                isRealMode
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/35 hover:bg-rose-500/25"
              }`}
            >
              {toggling
                ? "Switching..."
                : isRealMode
                  ? "Switch to PAPER Trading"
                  : "Switch to REAL Trading"}
            </button>

            {status.mode === "paper" &&
              (!status.ip_verified || !status.real_trading_approved) && (
                <p className="text-xs text-amber-300">
                  Cannot switch to real trading:
                  {!status.ip_verified && " Your IP is not whitelisted."}
                  {!status.real_trading_approved &&
                    " Real trading is not approved."}
                </p>
              )}
          </section>

          <section className="ts-card-soft rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-100 tracking-tight border-b border-slate-800/80 pb-2.5">
              How It Works
            </h2>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
              <li>
                <strong className="text-emerald-300">PAPER TRADING:</strong>{" "}
                Simulated trades. Always available for testing strategies.
              </li>
              <li>
                <strong className="text-rose-300">REAL TRADING:</strong> Actual
                orders via Kotak Neo API. Requires 3 conditions:
                <ul className="mt-1.5 ml-5 space-y-1 list-disc text-slate-400">
                  <li>Your IP must be whitelisted (or localhost in DEV mode)</li>
                  <li>Real trading must be explicitly approved</li>
                  <li>Symbol must be in the allowed indices list</li>
                </ul>
              </li>
            </ol>
            {status.dev_mode && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs text-amber-300">
                Development Mode Active: Localhost (127.0.0.1) is whitelisted
                for testing real trading locally.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
