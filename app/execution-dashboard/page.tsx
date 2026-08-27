'use client';

import { useEffect, useState } from 'react';
import styles from './execution-dashboard.module.css';

import { buildAuthorizedHeaders, throwIfApiError } from '@/lib/auth';

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

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? 'http://127.0.0.1:8000';

export default function ExecutionDashboard() {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const [qualifierSettings, setQualifierSettings] = useState<SignalQualifierSettings | null>(null);
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
        fetch(`${BACKEND_BASE_URL}/api/webhooks/tradingview/signal-qualifier/settings`, {
          headers: buildAuthorizedHeaders(),
        }),
      ]);

      if (statusRes.status === 'fulfilled') {
        await throwIfApiError(statusRes.value);
        const data: ExecutionStatus = await statusRes.value.json();
        setStatus(data);
      }
      if (qualRes.status === 'fulfilled') {
        await throwIfApiError(qualRes.value);
        const qualData = await qualRes.value.json();
        if (qualData.settings) {
          setQualifierSettings(qualData.settings);
        }
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQualifier = async (patch: Partial<SignalQualifierSettings>) => {
    setQualifierUpdating(true);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/webhooks/tradingview/signal-qualifier/settings`, {
        method: 'POST',
        headers: {
          ...buildAuthorizedHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      });
      await throwIfApiError(res);
      const data = await res.json();
      if (data.settings) {
        setQualifierSettings(data.settings);
      }
      setSuccessMsg('Signal Gatekeeper settings updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update qualifier');
    } finally {
      setQualifierUpdating(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleToggleMode = async () => {
    if (!status) return;

    const targetMode = status.mode === 'paper' ? 'real' : 'paper';

    // Security: Only allow real mode toggle if IP is verified AND real trading is approved
    if (targetMode === 'real') {
      if (!status.ip_verified) {
        setError(
          `❌ Cannot enable real trading: Your IP (${status.client_ip}) is not whitelisted.` +
          (status.dev_mode ? ' Using DEV mode? Try localhost (127.0.0.1).' : '')
        );
        return;
      }

      if (!status.real_trading_approved) {
        setError('❌ Real trading is not approved. Please approve it first.');
        return;
      }
    }

    setToggling(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/execution/toggle`, {
        method: 'POST',
        headers: buildAuthorizedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          mode: targetMode,
          reason: `User toggled from ${status.mode} to ${targetMode}`,
        }),
      });

      await throwIfApiError(response);

      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    } finally {
      setToggling(false);
    }
  };

  const handleApproveRealTrading = async (approved: boolean) => {
    if (!status) return;

    setApproving(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/execution/approve-real-trading`, {
        method: 'POST',
        headers: buildAuthorizedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          approved,
          reason: `User ${approved ? 'approved' : 'disapproved'} real trading`,
        }),
      });

      await throwIfApiError(response);

      await fetchStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval action failed');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return <div className={styles.container}><p>Loading execution status...</p></div>;
  }

  if (!status) {
    return <div className={styles.container}><p>Failed to load status</p></div>;
  }

  const modeColor = status.mode === 'real' ? '#ff6b6b' : '#51cf66';
  const modeLabel = status.mode === 'real' ? '🔴 REAL TRADING' : '🟢 PAPER TRADING';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Trading Execution Mode</h1>

        {/* Current Mode Display */}
        <div className={styles.modeDisplay} style={{ borderColor: modeColor }}>
          <div className={styles.modeBadge} style={{ backgroundColor: modeColor }}>
            {modeLabel}
          </div>
          <div className={styles.statusGrid}>
            <div className={styles.statusField}>
              <span className={styles.statusLabel}>Current Mode</span>
              <span className={styles.statusValue}>{status.mode.toUpperCase()}</span>
            </div>
            <div className={styles.statusField}>
              <span className={styles.statusLabel}>Max Position Value</span>
              <span className={styles.statusValue}>₹{status.max_position_value.toLocaleString()}</span>
            </div>
            <div className={styles.statusField}>
              <span className={styles.statusLabel}>Kotak Environment</span>
              <span className={styles.statusValue}>{status.kotak_environment.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* IP Verification Status */}
        <div className={styles.section}>
          <h3>🔐 IP Whitelist Verification</h3>
          <div className={styles.compactGrid}>
            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>Your IP Address</label>
              <div className={styles.fieldValue}><code>{status.client_ip}</code></div>
            </div>
            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>Whitelisted IP</label>
              <div className={styles.fieldValue}><code>{status.execution_desk_ip}</code></div>
            </div>
            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>Dev Mode</label>
              <div className={styles.fieldValue}><code>{status.dev_mode ? 'localhost (127.0.0.1) allowed' : 'Disabled'}</code></div>
            </div>
            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>Whitelist Status</label>
              <div className={styles.fieldValue}>
                {status.ip_verified ? (
                  <span className={styles.verified}>✅ VERIFIED</span>
                ) : (
                  <span className={styles.notVerified}>❌ NOT VERIFIED</span>
                )}
              </div>
            </div>
            <div className={`${styles.fieldShell} ${styles.spanTwo}`}>
              <label className={styles.fieldLabel}>Notes</label>
              <div className={styles.fieldValue}>
                {status.ip_verified
                  ? 'IP verification passed for execution checks.'
                  : `Your IP does not match. Real trading is disabled.${status.dev_mode ? ' Try localhost (127.0.0.1) for development.' : ''}`}
              </div>
            </div>
          </div>
        </div>

        {/* Index Restrictions */}
        <div className={styles.section}>
          <h3>📊 Allowed Indices for Real Trading</h3>
          <div className={styles.indicesContainer}>
            {status.allowed_indices.length > 0 ? (
              <div className={styles.indicesList}>
                {status.allowed_indices.map((index) => (
                  <span key={index} className={styles.indexBadge}>
                    {index}
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.warning}>⚠️ No indices allowed for real trading. Only PAPER mode available.</p>
            )}
            <p className={styles.helperText}>
              💡 Real trades can only be executed on these indices. Configure via <code>ALLOWED_REAL_TRADING_INDICES</code> env var.
            </p>
          </div>
        </div>

        {/* Real Trading Approval */}
        <div className={styles.section}>
          <h3>✅ Real Trading Approval</h3>
          <div className={styles.approvalStatus}>
            <div className={styles.compactGrid}>
              <div className={styles.fieldShell}>
                <label className={styles.fieldLabel}>Approval Status</label>
                <div className={styles.fieldValue}>
                  {status.real_trading_approved ? (
                    <span className={styles.approved}>✅ APPROVED</span>
                  ) : (
                    <span className={styles.notApproved}>❌ NOT APPROVED</span>
                  )}
                </div>
              </div>
              <div className={`${styles.fieldShell} ${styles.actionSpan}`}>
                <label className={styles.fieldLabel}>Approval Actions</label>
                <div className={styles.actionRow}>
                  <button
                    onClick={() => handleApproveRealTrading(true)}
                    disabled={status.real_trading_approved || approving}
                    className={styles.approveBtn}
                  >
                    {approving ? '⏳ Processing...' : '✅ Approve Real Trading'}
                  </button>
                  <button
                    onClick={() => handleApproveRealTrading(false)}
                    disabled={!status.real_trading_approved || approving}
                    className={styles.disapproveBtn}
                  >
                    {approving ? '⏳ Processing...' : '❌ Disapprove Real Trading'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signal Quality Gatekeeper & Smart Exit Copilot */}
        <div className={styles.section}>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h3 className="mb-0">🛡️ Signal Quality Gatekeeper & Smart Exit Copilot</h3>
              <p className="text-secondary small mb-0 mt-1">
                Institutional pre-trade screening & profit lock to avoid whipsaws, noon chop, and premature exits.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm fw-bold px-3 ${
                  qualifierSettings?.enabled ? 'btn-success text-white' : 'btn-secondary text-white'
                }`}
                onClick={() => handleUpdateQualifier({ enabled: !qualifierSettings?.enabled })}
                disabled={qualifierUpdating}
              >
                {qualifierSettings?.enabled ? '● GATEKEEPER ACTIVE' : '○ GATEKEEPER DISABLED'}
              </button>
            </div>
          </div>

          <div className={styles.compactGrid}>
            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>Min Conviction Score</label>
              <select
                className="form-select form-select-sm"
                value={qualifierSettings?.min_score_threshold ?? 70}
                onChange={(e) => handleUpdateQualifier({ min_score_threshold: parseInt(e.target.value) })}
                disabled={qualifierUpdating}
              >
                <option value="60">60% (Moderate)</option>
                <option value="70">70% (Recommended Default)</option>
                <option value="75">75% (High Conviction)</option>
                <option value="80">80% (Strict Institutional)</option>
              </select>
            </div>

            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>15M HTF Macro Trend</label>
              <div className="form-check form-switch pt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="reqHtfTrend"
                  checked={qualifierSettings?.require_htf_trend ?? true}
                  onChange={(e) => handleUpdateQualifier({ require_htf_trend: e.target.checked })}
                  disabled={qualifierUpdating}
                />
                <label className="form-check-label small" htmlFor="reqHtfTrend">
                  {qualifierSettings?.require_htf_trend ? 'Enabled (No Counter-Trend)' : 'Disabled'}
                </label>
              </div>
            </div>

            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>S/R Headroom (R:R)</label>
              <div className="form-check form-switch pt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="reqSrHeadroom"
                  checked={qualifierSettings?.require_sr_headroom ?? true}
                  onChange={(e) => handleUpdateQualifier({ require_sr_headroom: e.target.checked })}
                  disabled={qualifierUpdating}
                />
                <label className="form-check-label small" htmlFor="reqSrHeadroom">
                  {qualifierSettings?.require_sr_headroom ? 'Enabled (No Barrier Block)' : 'Disabled'}
                </label>
              </div>
            </div>

            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>Option Chain PCR</label>
              <div className="form-check form-switch pt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="reqPcr"
                  checked={qualifierSettings?.require_option_chain_pcr ?? true}
                  onChange={(e) => handleUpdateQualifier({ require_option_chain_pcr: e.target.checked })}
                  disabled={qualifierUpdating}
                />
                <label className="form-check-label small" htmlFor="reqPcr">
                  {qualifierSettings?.require_option_chain_pcr ? 'Enabled (OI Sentiment)' : 'Disabled'}
                </label>
              </div>
            </div>

            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>Noon Chop Filter</label>
              <div className="form-check form-switch pt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="chopFilter"
                  checked={qualifierSettings?.chop_filter_enabled ?? true}
                  onChange={(e) => handleUpdateQualifier({ chop_filter_enabled: e.target.checked })}
                  disabled={qualifierUpdating}
                />
                <label className="form-check-label small" htmlFor="chopFilter">
                  {qualifierSettings?.chop_filter_enabled ? '11:30 - 13:15 Guard' : 'Disabled'}
                </label>
              </div>
            </div>

            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>T1 Auto-Breakeven SL</label>
              <div className="form-check form-switch pt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoBe"
                  checked={qualifierSettings?.auto_breakeven_on_t1 ?? true}
                  onChange={(e) => handleUpdateQualifier({ auto_breakeven_on_t1: e.target.checked })}
                  disabled={qualifierUpdating}
                />
                <label className="form-check-label small" htmlFor="autoBe">
                  {qualifierSettings?.auto_breakeven_on_t1 ? 'Trail SL to Cost on +15%' : 'Disabled'}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Main Toggle Button */}
        <div className={styles.section}>
          <h3>⚙️ Mode Switch</h3>
          <div className={styles.compactGrid}>
            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>Ready For Real Trading</label>
              <div className={styles.fieldValue}>
                {status.ip_verified && status.real_trading_approved ? 'Yes' : 'No'}
              </div>
            </div>
            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>IP Verified</label>
              <div className={styles.fieldValue}>{status.ip_verified ? 'Yes' : 'No'}</div>
            </div>
            <div className={styles.fieldShell}>
              <label className={styles.fieldLabel}>Approval Granted</label>
              <div className={styles.fieldValue}>{status.real_trading_approved ? 'Yes' : 'No'}</div>
            </div>
            <div className={`${styles.fieldShell} ${styles.actionSpan}`}>
              <label className={styles.fieldLabel}>Mode Action</label>
              <div className={styles.actionRow}>
                <button
                  onClick={() => handleToggleMode()}
                  disabled={
                    toggling ||
                    (status.mode === 'paper' && (!status.ip_verified || !status.real_trading_approved))
                  }
                  className={`${styles.toggleBtn} ${styles[status.mode]}`}
                >
                  {toggling ? '⏳ Switching...' :
                   status.mode === 'paper' ? '🟢 → 🔴 Switch to REAL Trading' : '🔴 → 🟢 Switch to PAPER Trading'}
                </button>
              </div>
            </div>
            {status.mode === 'paper' && (!status.ip_verified || !status.real_trading_approved) && (
              <div className={`${styles.fieldShell} ${styles.spanFull}`}>
                <label className={styles.fieldLabel}>Switch Warning</label>
                <div className={`${styles.fieldValue} ${styles.warningInline}`}>
                  Cannot switch to real trading:
                  {!status.ip_verified && ' Your IP is not whitelisted.'}
                  {!status.real_trading_approved && ' Real trading is not approved.'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        )}

        {/* Info Section */}
        <div className={styles.infoSection}>
          <h4>ℹ️ How It Works</h4>
          <ol>
            <li>
              <strong>🟢 PAPER TRADING:</strong> Simulated trades. Always available. Perfect for testing strategies.
            </li>
            <li>
              <strong>🔴 REAL TRADING:</strong> Actual orders via Kotak Neo API. Requires 3 conditions:
              <ul>
                <li>✅ Your IP must be whitelisted (or localhost in DEV mode)</li>
                <li>✅ Real trading must be explicitly approved</li>
                <li>✅ Symbol must be in the allowed indices list</li>
              </ul>
            </li>
          </ol>
          {status.dev_mode && (
            <div className={styles.devModeInfo}>
              <strong>🛠️ Development Mode Active:</strong> Localhost (127.0.0.1) is whitelisted for testing real trading locally.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
