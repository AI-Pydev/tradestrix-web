"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  BrokerConnection,
  disconnectBroker,
  fetchBrokerConnections,
  startBrokerAuth,
} from "@/lib/api";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

function brokerSupportsWebAuth(broker: BrokerConnection) {
  return broker.capabilities.includes("webapp_ready");
}

function brokerPrimaryActionLabel(broker: BrokerConnection) {
  return broker.connected ? "Reconnect" : "Connect";
}

type BrokersShellProps = {
  brokerQuery?: {
    broker?: string;
    broker_status?: string;
    message?: string;
  };
};

export function BrokersShell({ brokerQuery }: BrokersShellProps) {
  const [brokers, setBrokers] = useState<BrokerConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brokerNotice, setBrokerNotice] = useState("");
  const [brokerNoticeTone, setBrokerNoticeTone] = useState<"success" | "error">("success");
  const [brokerAction, setBrokerAction] = useState("");

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
    const intervalId = window.setInterval(load, 10000);
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
    setBrokerNotice(`${broker.toUpperCase()}: ${message}`);
    setBrokerNoticeTone(status === "success" ? "success" : "error");
  }, [brokerQuery]);

  async function refreshBrokers() {
    const result = await fetchBrokerConnections();
    setBrokers(result);
    setError("");
  }

  async function handleConnectBroker(brokerId: string) {
    try {
      setBrokerAction(brokerId);
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
      setBrokerNotice(`Continue the ${brokerId.toUpperCase()} login in the opened window. You will return here after authentication.`);
      setBrokerNoticeTone("success");
    } catch (err) {
      setBrokerNotice(err instanceof Error ? err.message : "Failed to start broker authentication");
      setBrokerNoticeTone("error");
    } finally {
      setBrokerAction("");
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

  const connectedCount = brokers.filter((broker) => broker.connected).length;
  const configuredCount = brokers.filter((broker) => broker.configured).length;
  const webReadyCount = brokers.filter((broker) => brokerSupportsWebAuth(broker)).length;
  const missingConfigCount = brokers.filter((broker) => broker.missing_config.length > 0).length;
  const metrics = [
    { label: "Registered Brokers", value: String(brokers.length) },
    { label: "Connected", value: String(connectedCount) },
    { label: "Configured", value: String(configuredCount) },
    { label: "Web App Ready", value: String(webReadyCount) },
    { label: "Needs Config", value: String(missingConfigCount) },
  ];

  return (
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
            {error && <div className="alert alert-danger mb-0">{error}</div>}
            {!loading && !error && (
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
                    {brokers.map((broker) => (
                      <div className="col-12 col-lg-6" key={broker.broker_id}>
                        <div className="broker-card h-100">
                          <div className="d-flex justify-content-between align-items-start gap-3">
                            <div>
                              <div className="fw-semibold fs-5">{broker.display_name}</div>
                              <div className="muted small">{broker.notes}</div>
                            </div>
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
                    ))}
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
                <Link className="btn btn-outline-light text-start" href="/dashboard#trades-panel">
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
  );
}
