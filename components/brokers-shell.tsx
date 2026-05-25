"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  authenticateKotakBroker,
  BrokerHealth,
  BrokerConnection,
  disconnectBroker,
  fetchBrokerConnections,
  fetchBrokerHealth,
  startBrokerAuth,
} from "@/lib/api";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";
const BROKER_HEALTH_INTERVAL_MS = 15 * 60 * 1000;
const BROKER_HEALTH_ORDER = ["kotakneo", "upstox", "kite"];
const BROKER_HEALTH_LABELS: Record<string, string> = {
  kotakneo: "Kotak",
  upstox: "Upstox",
  kite: "Kite",
};

function brokerSupportsWebAuth(broker: BrokerConnection) {
  return broker.capabilities.includes("webapp_ready");
}

function brokerPrimaryActionLabel(broker: BrokerConnection) {
  return broker.connected ? "Reconnect" : "Connect";
}

function isKotakManualBroker(broker: BrokerConnection) {
  return broker.broker_id === "kotakneo" && broker.auth_mode === "manual";
}

function unavailableBrokerHealth(message: string) {
  return Object.fromEntries(
    BROKER_HEALTH_ORDER.map((brokerId) => [
      brokerId,
      {
        broker_id: brokerId,
        display_name: BROKER_HEALTH_LABELS[brokerId] ?? brokerId,
        status: "red" as const,
        valid: false,
        configured: false,
        token_present: false,
        checked_at: new Date().toISOString(),
        latency_ms: null,
        message,
      },
    ]),
  );
}

function brokerHealthMap(health: BrokerHealth[]) {
  return {
    ...unavailableBrokerHealth("Broker health check missing from API response."),
    ...Object.fromEntries(health.map((item) => [item.broker_id, item])),
  };
}

type BrokersShellProps = {
  brokerQuery?: {
    broker?: string;
    broker_status?: string;
    message?: string;
  };
};

export function BrokersShell({ brokerQuery }: BrokersShellProps) {
  const router = useRouter();
  const [brokers, setBrokers] = useState<BrokerConnection[]>([]);
  const [brokerHealth, setBrokerHealth] = useState<Record<string, BrokerHealth>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brokerNotice, setBrokerNotice] = useState("");
  const [brokerNoticeTone, setBrokerNoticeTone] = useState<"success" | "error">("success");
  const [brokerAction, setBrokerAction] = useState("");
  const [copiedBrokerId, setCopiedBrokerId] = useState<string | null>(null);
  const [kotakModalBroker, setKotakModalBroker] = useState<BrokerConnection | null>(null);
  const [kotakSubmitting, setKotakSubmitting] = useState(false);
  const [showKotakTotp, setShowKotakTotp] = useState(false);
  const [showKotakMpin, setShowKotakMpin] = useState(false);
  const [kotakForm, setKotakForm] = useState({
    client_id: "",
    mobile_number: "",
    totp: "",
    mpin: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const result = await fetchBrokerConnections();
        if (!active) {
          return;
        }
        setBrokers(result);
        setError("");
        try {
          const health = await fetchBrokerHealth();
          if (active) {
            setBrokerHealth(brokerHealthMap(health));
          }
        } catch {
          if (active) {
            setBrokerHealth(
              unavailableBrokerHealth("Broker health API unavailable. Restart backend or check auth."),
            );
          }
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load broker connections");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    const intervalId = window.setInterval(load, BROKER_HEALTH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const broker = brokerQuery?.broker;
    const status = brokerQuery?.broker_status;
    const message = brokerQuery?.message;
    if (!broker || !status || !message) {
      return;
    }
    if (broker.toLowerCase() === "health") {
      router.replace("/brokers");
      return;
    }
    setBrokerNotice(`${broker.toUpperCase()}: ${message}`);
    setBrokerNoticeTone(status === "success" ? "success" : "error");
  }, [brokerQuery, router]);

  useEffect(() => {
    function handleBrokerAuthMessage(event: MessageEvent) {
      const payload = event.data as
        | {
            type?: string;
            broker?: string;
            broker_status?: string;
            message?: string;
          }
        | undefined;
      if (!payload || payload.type !== "broker-auth-complete" || !payload.broker) {
        return;
      }

      void refreshBrokers();
      if (payload.broker_status && payload.message) {
        setBrokerNotice(`${payload.broker.toUpperCase()}: ${payload.message}`);
        setBrokerNoticeTone(payload.broker_status === "success" ? "success" : "error");
        router.replace(
          `/brokers?broker=${encodeURIComponent(payload.broker)}&broker_status=${encodeURIComponent(payload.broker_status)}&message=${encodeURIComponent(payload.message)}`,
        );
      }
    }

    window.addEventListener("message", handleBrokerAuthMessage);
    return () => window.removeEventListener("message", handleBrokerAuthMessage);
  }, [router]);

  async function refreshBrokers() {
    const result = await fetchBrokerConnections();
    setBrokers(result);
    try {
      const health = await fetchBrokerHealth(true);
      setBrokerHealth(brokerHealthMap(health));
    } catch {
      setBrokerHealth(
        unavailableBrokerHealth("Broker health API unavailable. Restart backend or check auth."),
      );
    }
    setError("");
  }

  function openKotakModal(broker: BrokerConnection) {
    setKotakModalBroker(broker);
    setShowKotakTotp(false);
    setShowKotakMpin(false);
    setKotakForm({
      client_id: broker.login_defaults.client_id ?? "",
      mobile_number: broker.login_defaults.mobile_number ?? "",
      totp: "",
      mpin: "",
    });
  }

  function closeKotakModal() {
    if (kotakSubmitting) {
      return;
    }
    setKotakModalBroker(null);
    setShowKotakTotp(false);
    setShowKotakMpin(false);
  }

  async function handleConnectBroker(brokerId: string) {
    try {
      setBrokerAction(brokerId);
      const broker = brokers.find((item) => item.broker_id === brokerId);
      if (broker && isKotakManualBroker(broker)) {
        openKotakModal(broker);
        return;
      }

      const result = await startBrokerAuth(brokerId);
      const authWindow = window.open(
        result.auth_url,
        "_blank",
        "popup=yes,width=980,height=760,resizable=yes,scrollbars=yes",
      );
      if (!authWindow) {
        setBrokerNotice("Popup was blocked. Please allow popups for this site and try again.");
        setBrokerNoticeTone("error");
        return;
      }

      const pollId = window.setInterval(async () => {
        if (!authWindow.closed) {
          return;
        }

        window.clearInterval(pollId);
        try {
          const refreshed = await fetchBrokerConnections();
          setBrokers(refreshed);
          setError("");
          const updatedBroker = refreshed.find((item) => item.broker_id === brokerId);
          if (updatedBroker?.connected) {
            setBrokerNotice(`${brokerId.toUpperCase()} connected successfully.`);
            setBrokerNoticeTone("success");
            router.replace(`/brokers?broker=${encodeURIComponent(brokerId)}&broker_status=success&message=${encodeURIComponent(`${brokerId.toUpperCase()} account connected successfully.`)}`);
          }
        } catch (err) {
          setBrokerNotice(err instanceof Error ? err.message : "Failed to refresh broker connections");
          setBrokerNoticeTone("error");
        }
      }, 1000);

      setBrokerNotice(`Continue the ${brokerId.toUpperCase()} login in the opened window. You will return here after authentication.`);
      setBrokerNoticeTone("success");
    } catch (err) {
      setBrokerNotice(err instanceof Error ? err.message : "Failed to start broker authentication");
      setBrokerNoticeTone("error");
    } finally {
      setBrokerAction("");
    }
  }

  function updateKotakField(field: "client_id" | "mobile_number" | "totp" | "mpin", value: string) {
    setKotakForm((current) => ({ ...current, [field]: value }));
  }

  async function handleKotakSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setKotakSubmitting(true);
      const result = await authenticateKotakBroker(kotakForm);
      setBrokerNotice(`KOTAKNEO: ${result.message}`);
      setBrokerNoticeTone(result.success ? "success" : "error");

      if (result.success) {
        await refreshBrokers();
        closeKotakModal();
        router.replace(
          `/brokers?broker=${encodeURIComponent(result.broker_id)}&broker_status=success&message=${encodeURIComponent(result.message)}`,
        );
      }
    } catch (err) {
      setBrokerNotice(err instanceof Error ? err.message : "Failed to authenticate Kotak Neo");
      setBrokerNoticeTone("error");
    } finally {
      setKotakSubmitting(false);
    }
  }

  async function handleDisconnectBroker(brokerId: string) {
    try {
      setBrokerAction(brokerId);
      await disconnectBroker(brokerId);
      await refreshBrokers();
      setBrokerNotice(`${brokerId.toUpperCase()} disconnected.`);
      setBrokerNoticeTone("success");
    } catch (err) {
      setBrokerNotice(err instanceof Error ? err.message : "Failed to disconnect broker");
      setBrokerNoticeTone("error");
    } finally {
      setBrokerAction("");
    }
  }

  async function handleCopyAccessToken(brokerId: string, accessToken: string) {
    try {
      await navigator.clipboard.writeText(accessToken);
      setCopiedBrokerId(brokerId);
      window.setTimeout(() => {
        setCopiedBrokerId((current) => (current === brokerId ? null : current));
      }, 1500);
    } catch (err) {
      setBrokerNotice(err instanceof Error ? err.message : "Failed to copy access token");
      setBrokerNoticeTone("error");
    }
  }

  const connectedCount = brokers.filter((broker) => broker.connected).length;
  const configuredCount = brokers.filter((broker) => broker.configured).length;
  const healthyCount = Object.values(brokerHealth).filter((item) => item.valid).length;
  const webReadyCount = brokers.filter((broker) => brokerSupportsWebAuth(broker)).length;
  const missingConfigCount = brokers.filter((broker) => broker.missing_config.length > 0).length;
  const metrics = [
    { label: "Registered Brokers", value: String(brokers.length) },
    { label: "Connected", value: String(connectedCount) },
    { label: "Token Healthy", value: String(healthyCount) },
    { label: "Configured", value: String(configuredCount) },
    { label: "Web App Ready", value: String(webReadyCount) },
    { label: "Needs Config", value: String(missingConfigCount) },
  ];
  const displayError =
    error && brokers.length === 0 && !error.toLowerCase().includes("broker not found: health")
      ? error
      : "";

  return (
    <>
      <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="brokers-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#brokers-top">
              Overview
            </a>
            <a className="hero-tab" href="#broker-connections-panel">
              Connections
            </a>
            <a className="hero-tab" href="#broker-guidance-panel">
              Auth Routing
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Broker Connections</h1>
            <p className="hero-subtitle">
              Dedicated surface for broker authentication, redirect readiness, connection state, and reconnect flows.
              Refreshes every 10 seconds.
            </p>
          </div>
          <div className="p-3">
            {brokerNotice && (
              <div className={`alert ${brokerNoticeTone === "success" ? "alert-success" : "alert-danger"}`}>
                {brokerNotice}
              </div>
            )}
            {loading && <div className="muted">Loading broker connections...</div>}
            {displayError && <div className="alert alert-danger mb-0">{displayError}</div>}
            {!loading && !displayError && (
              <div className="row g-3">
                {metrics.map(({ label, value }) => (
                  <div className="col-12 col-sm-6 col-lg-4 col-xl" key={label}>
                    <div className="metric-card p-3">
                      <div className="metric-label">{label}</div>
                      <div className="metric-value mt-2">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="row g-4">
          <div className="col-12 col-xxl-8">
            <section className="dashboard-panel" id="broker-connections-panel">
              <h2 className="panel-title">Broker Connections</h2>
              <div className="p-3">
                {brokers.length ? (
                  <div className="row g-3">
                    {brokers.map((broker) => {
                      const health = brokerHealth[broker.broker_id];
                      const healthTone = health?.valid ? "green" : health ? "red" : "gold";
                      const healthLabel = health?.valid ? "API green" : health ? "API red" : "API checking";
                      return (
                      <div className="col-12 col-lg-6" key={broker.broker_id}>
                        <div className="broker-card h-100">
                          <div className="d-flex justify-content-between align-items-start gap-3">
                            <div>
                              <div className="fw-semibold fs-5">{broker.display_name}</div>
                              <div className="muted small">{broker.notes}</div>
                            </div>
                            <div className="d-flex flex-column gap-2 align-items-end">
                              <span
                                className={`badge-soft ${
                                  broker.connected
                                    ? "green"
                                    : broker.configured
                                      ? "gold"
                                      : "red"
                                }`}
                              >
                                {broker.status.replaceAll("_", " ")}
                              </span>
                              <span className={`badge-soft ${healthTone}`}>
                                {healthLabel}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 small muted">
                            Broker Health: {health?.message ?? "Checking broker API token..."}
                            {health?.latency_ms != null ? ` (${health.latency_ms} ms)` : ""}
                          </div>
                          <div className="mt-3 d-flex flex-wrap gap-2">
                            {broker.capabilities.map((capability) => (
                              <span className="badge-soft blue" key={`${broker.broker_id}-${capability}`}>
                                {capability.replaceAll("_", " ")}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 small muted">
                            Auth Mode: {broker.auth_mode.replaceAll("_", " ")}
                          </div>
                          <div className="mt-2 small muted">
                            Redirect URI: {broker.redirect_uri ?? "Not configured"}
                          </div>
                          <div className="mt-2 small muted">
                            Tokens: access {broker.access_token_present ? "present" : "missing"} / refresh{" "}
                            {broker.refresh_token_present ? "present" : "missing"}
                          </div>
                          {broker.connected && broker.access_token ? (
                            <div className="mt-3">
                              <label className="form-label small muted mb-1">Access Token</label>
                              <div className="d-flex flex-wrap gap-2 align-items-start">
                                <textarea
                                  className="form-control form-control-sm font-monospace"
                                  readOnly
                                  value={broker.access_token}
                                  rows={3}
                                  style={{ minWidth: 0, flex: "1 1 320px" }}
                                />
                                <button
                                  className="btn btn-outline-light btn-sm"
                                  type="button"
                                  onClick={() => handleCopyAccessToken(broker.broker_id, broker.access_token!)}
                                >
                                  {copiedBrokerId === broker.broker_id ? "Copied" : "Copy"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                          {!!broker.missing_config.length && (
                            <div className="mt-2 small" style={{ color: "#fbb6c2" }}>
                              Missing: {broker.missing_config.join(", ")}
                            </div>
                          )}
                          <div className="mt-3 d-flex flex-wrap gap-2">
                            <button
                              className="btn btn-warning btn-sm"
                              disabled={brokerAction === broker.broker_id}
                              onClick={() => handleConnectBroker(broker.broker_id)}
                            >
                              {brokerAction === broker.broker_id
                                ? "Connecting..."
                                : brokerPrimaryActionLabel(broker)}
                            </button>
                            {!brokerSupportsWebAuth(broker) && (
                              <span className="small muted align-self-center">
                                Update the redirect URI to enable web login.
                              </span>
                            )}
                            {broker.connected && (
                              <button
                                className="btn btn-outline-light btn-sm"
                                disabled={brokerAction === broker.broker_id}
                                onClick={() => handleDisconnectBroker(broker.broker_id)}
                              >
                                {brokerAction === broker.broker_id ? "Disconnecting..." : "Disconnect"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">No brokers registered.</div>
                )}
              </div>
            </section>
          </div>

          <div className="col-12 col-xxl-4">
            <section className="dashboard-panel mb-4" id="broker-guidance-panel">
              <h2 className="panel-title">Auth Routing</h2>
              <div className="p-3 d-grid gap-3">
                <div>
                  <div className="fw-semibold">Why this page exists</div>
                  <div className="small muted mt-1">
                    Broker login and reconnect actions now live here so the trading dashboard stays focused on bots,
                    positions, signals, and P/L.
                  </div>
                </div>
                <div>
                  <div className="fw-semibold">OAuth callback</div>
                  <div className="small muted mt-1">
                    Broker auth windows return back to this page with a success or error notice after the backend
                    finishes the callback exchange.
                  </div>
                </div>
                <div>
                  <div className="fw-semibold">Web-app ready brokers</div>
                  <div className="small muted mt-1">
                    Brokers tagged with <span className="badge-soft blue">webapp ready</span> have a redirect URI that
                    is ready for browser-based login.
                  </div>
                </div>
              </div>
            </section>

            <section className="dashboard-panel">
              <h2 className="panel-title">Quick Links</h2>
              <div className="p-3 d-grid gap-2">
                <Link className="btn btn-outline-light text-start" href="/multi-stock-monitor">
                  Open Profit / Loss Board
                </Link>
                <Link className="btn btn-outline-light text-start" href="/dashboard#bot-control-panel">
                  Open Bot Control
                </Link>
                <a className="btn btn-outline-light text-start" href={`${BACKEND_BASE_URL}/api/v1/brokers`} rel="noreferrer" target="_blank">
                  Open Broker API JSON
                </a>
                <a className="btn btn-outline-light text-start" href={`${BACKEND_BASE_URL}/docs`} rel="noreferrer" target="_blank">
                  Open FastAPI Docs
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
      </main>

      {kotakModalBroker ? (
        <div className="broker-auth-modal-backdrop" onClick={closeKotakModal} role="presentation">
          <div
            className="broker-auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kotak-auth-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="broker-auth-modal-header">
              <div>
                <div className="broker-auth-modal-title" id="kotak-auth-title">
                  Enter Kotak credentials
                </div>
                <div className="broker-auth-modal-subtitle">
                  Uses the same TOTP and MPIN flow as your Kotak script. Client ID maps to `UCC`, while the backend still uses `CONSUMER_KEY` from env.
                </div>
              </div>
              <button className="broker-auth-close" type="button" onClick={closeKotakModal} disabled={kotakSubmitting}>
                Close
              </button>
            </div>

            <form className="d-grid gap-3" onSubmit={handleKotakSubmit}>
              <div>
                <label className="form-label small muted mb-2" htmlFor="kotak-client-id">
                  Client ID
                </label>
                <input
                  id="kotak-client-id"
                  className="form-control broker-auth-input"
                  autoComplete="off"
                  value={kotakForm.client_id}
                  onChange={(event) => updateKotakField("client_id", event.target.value)}
                  placeholder="Enter Client ID"
                  required
                />
              </div>

              <div>
                <label className="form-label small muted mb-2" htmlFor="kotak-mobile-number">
                  Registered Phone Number
                </label>
                <input
                  id="kotak-mobile-number"
                  className="form-control broker-auth-input"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={kotakForm.mobile_number}
                  onChange={(event) => updateKotakField("mobile_number", event.target.value)}
                  placeholder="Enter mobile number"
                  required
                />
              </div>

              <div>
                <label className="form-label small muted mb-2" htmlFor="kotak-totp">
                  TOTP
                </label>
                <div className="broker-auth-field-row">
                  <input
                    id="kotak-totp"
                    className="form-control broker-auth-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    type={showKotakTotp ? "text" : "password"}
                    value={kotakForm.totp}
                    onChange={(event) => updateKotakField("totp", event.target.value)}
                    placeholder="Enter TOTP"
                    required
                  />
                  <button
                    className="btn btn-outline-light btn-sm broker-auth-toggle"
                    type="button"
                    onClick={() => setShowKotakTotp((current) => !current)}
                  >
                    {showKotakTotp ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label small muted mb-2" htmlFor="kotak-mpin">
                  MPIN
                </label>
                <div className="broker-auth-field-row">
                  <input
                    id="kotak-mpin"
                    className="form-control broker-auth-input"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    type={showKotakMpin ? "text" : "password"}
                    value={kotakForm.mpin}
                    onChange={(event) => updateKotakField("mpin", event.target.value)}
                    placeholder="Enter MPIN"
                    required
                  />
                  <button
                    className="btn btn-outline-light btn-sm broker-auth-toggle"
                    type="button"
                    onClick={() => setShowKotakMpin((current) => !current)}
                  >
                    {showKotakMpin ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2">
                <button className="btn btn-outline-light" type="button" onClick={closeKotakModal} disabled={kotakSubmitting}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={kotakSubmitting}>
                  {kotakSubmitting ? "Logging in..." : "Login with Kotak"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
