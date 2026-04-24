'use client';

import { useEffect, useState } from 'react';
import styles from './execution-dashboard.module.css';

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

export default function ExecutionDashboard() {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [approving, setApproving] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/execution/status');
      if (!response.ok) throw new Error('Failed to fetch execution status');
      const data: ExecutionStatus = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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
      const response = await fetch('http://localhost:8000/api/v1/execution/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: targetMode,
          reason: `User toggled from ${status.mode} to ${targetMode}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Toggle failed');
      }

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
      const response = await fetch('http://localhost:8000/api/v1/execution/approve-real-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          reason: `User ${approved ? 'approved' : 'disapproved'} real trading`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Approval action failed');
      }

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
