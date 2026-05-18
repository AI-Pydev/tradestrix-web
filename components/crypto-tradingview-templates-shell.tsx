"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
    createDeltaTradingViewTemplate,
    deleteDeltaTradingViewTemplate,
    DeltaCryptoDashboardResponse,
    DeltaCryptoUnderlying,
    DeltaTradingViewTemplateResponse,
    fetchDeltaCryptoDashboard,
    fetchTradingViewAlertTemplateEvents,
    listDeltaTradingViewTemplates,
    listTradingViewAlertTemplates,
    SharedStrategyId,
    TradingViewAlertTemplateStats,
    TradingViewWebhookEvent,
} from "@/lib/api";

function isDemoBaseUrl(url?: string | null) {
  const value = (url || "").toLowerCase();
  return value.includes("testnet") || value.includes("demo");
}

function fmtNumber(value?: number | null, maximumFractionDigits = 2) {
  if (value == null) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

function defaultStrategyIdForSide(side: "call" | "put"): SharedStrategyId {
  return side === "put" ? "tv_ha_put_v2" : "tv_ha_call_v2";
}

function defaultCryptoAlertName(
  symbol: string,
  side: "call" | "put",
  instrumentType: "option" | "future" = "option",
  direction: "long" | "short" = "long",
) {
  if (instrumentType === "future") {
    return `M-CRYPTO-DELTA-${symbol || "BTC"}-FUTURE-${direction.toUpperCase()}`;
  }
  return `M-CRYPTO-DELTA-${symbol || "BTC"}-${side.toUpperCase()}`;
}

type TemplateFormState = {
  alert_name: string;
  instrument_type: "option" | "future";
  underlying_asset_symbol: string;
  expiry_date: string;
  option_preference: "call" | "put" | "both";
  candidate_side: "call" | "put";
  direction: "long" | "short";
  strategy_type: SharedStrategyId;
  order_side: "buy" | "sell";
  order_type: "market_order" | "limit_order";
  size: number;
  target_delta: number;
  max_mark_price: number;
  min_open_interest: number;
  max_order_value: number;
  max_spread_pct: number;
  allow_unbounded_risk: boolean;
};

type ActivityMode = "today" | "history";

type DeltaTemplateWithStats = DeltaTradingViewTemplateResponse & {
  stats_today: TradingViewAlertTemplateStats;
  stats_all: TradingViewAlertTemplateStats;
};

function templateSetupLabel(template: DeltaTradingViewTemplateResponse) {
  if (template.instrument_type === "future") {
    return `FUTURE / ${template.underlying_asset_symbol} / ${template.direction.toUpperCase()} / ${template.session}`;
  }
  return `OPTION / ${template.underlying_asset_symbol} / ${template.candidate_side.toUpperCase()} / ${template.session}`;
}

const EMPTY_STATS: TradingViewAlertTemplateStats = {
  total_events: 0,
  entry_events: 0,
  exit_events: 0,
  ignored_events: 0,
  executed_events: 0,
  rejected_events: 0,
  total_trades: 0,
  win_trades: 0,
  loss_trades: 0,
  win_rate: 0,
  gross_pnl: 0,
  gross_profit: 0,
  gross_loss: 0,
};

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

function asNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function payloadNumber(payload: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!payload) {
    return null;
  }
  for (const key of keys) {
    const value = asNumber(payload[key]);
    if (value != null) {
      return value;
    }
  }
  return null;
}

function fmtPrice(value: number | null | undefined) {
  return value == null ? "-" : `₹${value.toFixed(2)}`;
}

function cleanActivityDetail(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !part.toLowerCase().startsWith("total=") && !part.toLowerCase().startsWith("strategy_id="))
    .join(" | ");
}

function safeJson(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function activityStatusBadge(status?: string | null) {
  if (status === "accepted") {
    return "green";
  }
  if (status === "ignored") {
    return "gold";
  }
  return "red";
}

const DEFAULT_FORM: TemplateFormState = {
  alert_name: "M-CRYPTO-DELTA-BTC-CALL",
  instrument_type: "option",
  underlying_asset_symbol: "BTC",
  expiry_date: "",
  option_preference: "both",
  candidate_side: "call",
  direction: "long",
  strategy_type: "tv_ha_call_v2",
  order_side: "buy",
  order_type: "market_order",
  size: 1,
  target_delta: 0.35,
  max_mark_price: 2000,
  min_open_interest: 0,
  max_order_value: 2000,
  max_spread_pct: 5,
  allow_unbounded_risk: false,
};

export function CryptoTradingViewTemplatesShell() {
  const [dashboard, setDashboard] = useState<DeltaCryptoDashboardResponse | null>(null);
  const [templates, setTemplates] = useState<DeltaTemplateWithStats[]>([]);
  const [latestTemplate, setLatestTemplate] = useState<DeltaTemplateWithStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [templateCreating, setTemplateCreating] = useState(false);
  const [templateCopying, setTemplateCopying] = useState(false);
  const [templateDeletingId, setTemplateDeletingId] = useState<string | null>(null);
  const [activityTemplate, setActivityTemplate] = useState<DeltaTemplateWithStats | null>(null);
  const [activityMode, setActivityMode] = useState<ActivityMode>("today");
  const [activityEvents, setActivityEvents] = useState<TradingViewWebhookEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [payloadExpanded, setPayloadExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [form, setForm] = useState<TemplateFormState>(DEFAULT_FORM);

  const selectedUnderlying = useMemo<DeltaCryptoUnderlying | null>(() => {
    return (
      dashboard?.underlyings.find((item) => item.symbol === form.underlying_asset_symbol) ??
      dashboard?.underlyings[0] ??
      null
    );
  }, [dashboard, form.underlying_asset_symbol]);

  const demoEnvironment = isDemoBaseUrl(dashboard?.api_base_url);
  const resolvedOrderSide = form.instrument_type === "future" ? (form.direction === "short" ? "sell" : "buy") : form.order_side;
  const boundedRiskReady = form.instrument_type === "future" || resolvedOrderSide === "buy" || form.allow_unbounded_risk;
  const generatedTemplateJson = latestTemplate ? JSON.stringify(latestTemplate.generated.message, null, 2) : "";
  const totalsToday = useMemo(() => {
    return templates.reduce(
      (acc, template) => {
        acc.accepted += template.stats_today.executed_events;
        acc.rejected += template.stats_today.rejected_events;
        acc.ignored += template.stats_today.ignored_events;
        return acc;
      },
      { accepted: 0, rejected: 0, ignored: 0 },
    );
  }, [templates]);
  const activitySummary = useMemo(() => {
    if (!activityTemplate) {
      return null;
    }
    return activityMode === "today" ? activityTemplate.stats_today : activityTemplate.stats_all;
  }, [activityMode, activityTemplate]);

  async function loadTemplates() {
    try {
      const [deltaTemplates, allTemplates] = await Promise.all([listDeltaTradingViewTemplates(), listTradingViewAlertTemplates()]);
      const statsByTemplateId = new Map(
        allTemplates.map((template) => [template.template_id, { today: template.stats_today, all: template.stats_all }]),
      );
      const enrichedTemplates = deltaTemplates.map((template) => {
        const stats = statsByTemplateId.get(template.template_id);
        return {
          ...template,
          stats_today: stats?.today ?? EMPTY_STATS,
          stats_all: stats?.all ?? EMPTY_STATS,
        };
      });
      setTemplates(enrichedTemplates);
      setLatestTemplate((prev) => prev ?? enrichedTemplates[0] ?? null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load crypto TradingView templates");
      setMessageTone("error");
    }
  }

  async function loadDashboard() {
    try {
      setDashboardLoading(true);
      const result = await fetchDeltaCryptoDashboard();
      setDashboard(result);

      const firstUnderlying = result.underlyings[0] ?? null;
      const selectedSymbol = result.underlyings.some((item) => item.symbol === form.underlying_asset_symbol)
        ? form.underlying_asset_symbol
        : firstUnderlying?.symbol || DEFAULT_FORM.underlying_asset_symbol;
      const selected = result.underlyings.find((item) => item.symbol === selectedSymbol) ?? firstUnderlying;
      const resolvedExpiry = selected?.expiries.find((item) => item === form.expiry_date) || selected?.expiries[0] || "";

      setForm((prev) => ({
        ...prev,
        underlying_asset_symbol: selectedSymbol,
        expiry_date: resolvedExpiry,
        alert_name: defaultCryptoAlertName(selectedSymbol, prev.candidate_side, prev.instrument_type, prev.direction),
      }));

      await loadTemplates();
      setMessage(result.message);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load crypto TradingView template desk");
      setMessageTone("error");
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleCreateTradingViewTemplate() {
    try {
      setTemplateCreating(true);
      const candidateSide = form.instrument_type === "future" ? (form.direction === "short" ? "put" : "call") : form.candidate_side;
      const orderSide = form.instrument_type === "future" ? (form.direction === "short" ? "sell" : "buy") : form.order_side;
      const result = await createDeltaTradingViewTemplate({
        alert_name: form.alert_name.trim() || defaultCryptoAlertName(form.underlying_asset_symbol, candidateSide, form.instrument_type, form.direction),
        strategy_type: defaultStrategyIdForSide(candidateSide),
        instrument_type: form.instrument_type,
        underlying_asset_symbol: form.underlying_asset_symbol,
        expiry_date: form.instrument_type === "option" ? form.expiry_date || undefined : undefined,
        candidate_side: candidateSide,
        direction: form.direction,
        order_side: orderSide,
        order_type: form.order_type,
        size: Math.max(1, Number(form.size) || 1),
        option_preference: form.option_preference,
        target_delta: form.target_delta,
        max_mark_price: form.max_mark_price,
        min_open_interest: form.min_open_interest,
        max_order_value: form.max_order_value,
        max_spread_pct: form.max_spread_pct,
        allow_unbounded_risk: form.allow_unbounded_risk,
      });
      const createdWithStats: DeltaTemplateWithStats = {
        ...result,
        stats_today: EMPTY_STATS,
        stats_all: EMPTY_STATS,
      };
      setLatestTemplate(createdWithStats);
      setTemplates((prev) => [createdWithStats, ...prev.filter((template) => template.template_id !== result.template_id)]);
      setMessage(result.message);
      setMessageTone("success");
      await loadTemplates();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create crypto TradingView template");
      setMessageTone("error");
    } finally {
      setTemplateCreating(false);
    }
  }

  async function handleCopyTradingViewPayload() {
    if (!generatedTemplateJson || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      setTemplateCopying(true);
      await navigator.clipboard.writeText(generatedTemplateJson);
      setMessage("Crypto TradingView payload copied.");
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to copy TradingView payload");
      setMessageTone("error");
    } finally {
      setTemplateCopying(false);
    }
  }

  async function handleCopyTemplatePayload(template: DeltaTradingViewTemplateResponse) {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      setTemplateCopying(true);
      await navigator.clipboard.writeText(JSON.stringify(template.generated.message, null, 2));
      setMessage(`Copied payload for ${template.alert_name}.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to copy TradingView payload");
      setMessageTone("error");
    } finally {
      setTemplateCopying(false);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    try {
      setTemplateDeletingId(templateId);
      await deleteDeltaTradingViewTemplate(templateId);
      setTemplates((prev) => {
        const nextTemplates = prev.filter((template) => template.template_id !== templateId);
        setLatestTemplate((current) => {
          if (current?.template_id !== templateId) {
            return current;
          }
          return nextTemplates[0] ?? null;
        });
        return nextTemplates;
      });
      if (activityTemplate?.template_id === templateId) {
        closeActivity();
      }
      setMessage("Deleted crypto TradingView template.");
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete crypto TradingView template");
      setMessageTone("error");
    } finally {
      setTemplateDeletingId(null);
    }
  }

  function closeActivity() {
    setActivityTemplate(null);
    setPayloadExpanded(false);
    setActivityEvents([]);
    setActivityError("");
    setActivityLoading(false);
  }

  async function openActivity(template: DeltaTemplateWithStats, mode: ActivityMode = "today") {
    try {
      setActivityTemplate(template);
      setActivityMode(mode);
      setPayloadExpanded(false);
      setActivityEvents([]);
      setActivityError("");
      setActivityLoading(true);
      const events = await fetchTradingViewAlertTemplateEvents(template.template_id, mode === "today" ? 120 : 300, mode === "today" ? "today" : "all");
      setActivityEvents(events);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : "Failed to load alert activity");
    } finally {
      setActivityLoading(false);
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <section className="hero-shell">
        <div className="hero-tabs">
          <Link className="hero-tab" href="/crypto-market">
            Crypto Market
          </Link>
          <a className="hero-tab" href="#crypto-tv-create">
            Create Template
          </a>
          <a className="hero-tab" href="#crypto-tv-templates">
            Saved Templates
          </a>
        </div>
        <div className="hero-header">
          <h1 className="hero-title">Crypto TradingView Templates</h1>
          <p className="hero-subtitle">
            Dedicated template desk for Delta crypto alerts. TradingView sends the signal, and each template keeps the backend execution profile.
          </p>
        </div>
        <div className="p-3">
          {message ? <div className={`alert ${messageTone === "success" ? "alert-success" : "alert-danger"}`}>{message}</div> : null}
          <div className={`alert ${demoEnvironment ? "alert-secondary" : "alert-warning"}`}>
            {demoEnvironment
              ? "Delta demo/testnet base URL is active, so template-driven alert executions stay inside the separate demo environment."
              : "Template creation will work, but alert-driven demo execution stays blocked until DELTA_API_BASE_URL points to the Delta testnet/demo URL."}
          </div>
          <div className="row g-3">
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="metric-card p-3">
                <div className="metric-label">Saved Templates</div>
                <div className="metric-value mt-2">{templates.length}</div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="metric-card p-3">
                <div className="metric-label">Today Accepted</div>
                <div className="metric-value mt-2">{totalsToday.accepted}</div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="metric-card p-3">
                <div className="metric-label">Today Rejected</div>
                <div className="metric-value mt-2">{totalsToday.rejected}</div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="metric-card p-3">
                <div className="metric-label">Current Symbol</div>
                <div className="metric-value mt-2">{form.underlying_asset_symbol}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <section className="dashboard-panel h-100" id="crypto-tv-create">
            <h2 className="panel-title">Template Builder</h2>
            <div className="p-3">
              <div className="small muted mb-3">
                This mirrors `/tradingview-alerts`, but for Delta crypto. Choose option for ATM option entries or future for directional Delta futures entries.
              </div>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="crypto-tv-alert-name">Template Alert Name</label>
                  <input
                    id="crypto-tv-alert-name"
                    className="form-control"
                    maxLength={80}
                    minLength={3}
                    value={form.alert_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, alert_name: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label" htmlFor="crypto-tv-instrument-type">Instrument</label>
                  <select
                    id="crypto-tv-instrument-type"
                    className="form-select"
                    value={form.instrument_type}
                    onChange={(e) =>
                      setForm((prev) => {
                        const nextInstrumentType = e.target.value as "option" | "future";
                        return {
                          ...prev,
                          instrument_type: nextInstrumentType,
                          order_side: nextInstrumentType === "future" ? (prev.direction === "short" ? "sell" : "buy") : prev.order_side,
                          alert_name: defaultCryptoAlertName(prev.underlying_asset_symbol, prev.candidate_side, nextInstrumentType, prev.direction),
                        };
                      })
                    }
                  >
                    <option value="option">Option</option>
                    <option value="future">Future</option>
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label" htmlFor="crypto-tv-underlying">Underlying</label>
                  <select
                    id="crypto-tv-underlying"
                    className="form-select"
                    disabled={dashboardLoading || !dashboard?.underlyings.length}
                    value={form.underlying_asset_symbol}
                    onChange={(e) => {
                      const nextSymbol = e.target.value;
                      const nextUnderlying = dashboard?.underlyings.find((item) => item.symbol === nextSymbol);
                      setForm((prev) => ({
                        ...prev,
                        underlying_asset_symbol: nextSymbol,
                        expiry_date: nextUnderlying?.expiries[0] ?? "",
                        alert_name: defaultCryptoAlertName(nextSymbol, prev.candidate_side, prev.instrument_type, prev.direction),
                      }));
                    }}
                  >
                    {dashboardLoading && !dashboard?.underlyings.length ? <option value={form.underlying_asset_symbol}>Loading...</option> : null}
                    {(dashboard?.underlyings ?? []).map((item) => (
                      <option key={item.symbol} value={item.symbol}>
                        {item.symbol} / {item.quoting_symbol}
                      </option>
                    ))}
                  </select>
                </div>
                {form.instrument_type === "option" ? (
                  <>
                    <div className="col-12 col-md-4">
                      <label className="form-label" htmlFor="crypto-tv-expiry">Expiry</label>
                      <select
                        id="crypto-tv-expiry"
                        className="form-select"
                        value={form.expiry_date}
                        onChange={(e) => setForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                      >
                        {(selectedUnderlying?.expiries ?? []).map((expiry) => (
                          <option key={expiry} value={expiry}>
                            {expiry}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label" htmlFor="crypto-tv-candidate-side">Candidate Side</label>
                      <select
                        id="crypto-tv-candidate-side"
                        className="form-select"
                        value={form.candidate_side}
                        onChange={(e) =>
                          setForm((prev) => {
                            const nextSide = e.target.value as "call" | "put";
                            return {
                              ...prev,
                              candidate_side: nextSide,
                              strategy_type: defaultStrategyIdForSide(nextSide),
                              alert_name: defaultCryptoAlertName(prev.underlying_asset_symbol, nextSide, prev.instrument_type, prev.direction),
                            };
                          })
                        }
                      >
                        <option value="call">Call Candidate</option>
                        <option value="put">Put Candidate</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="col-12 col-md-4">
                    <label className="form-label" htmlFor="crypto-tv-direction">Direction</label>
                    <select
                      id="crypto-tv-direction"
                      className="form-select"
                      value={form.direction}
                      onChange={(e) =>
                        setForm((prev) => {
                          const nextDirection = e.target.value as "long" | "short";
                          return {
                            ...prev,
                            direction: nextDirection,
                            order_side: nextDirection === "short" ? "sell" : "buy",
                            alert_name: defaultCryptoAlertName(prev.underlying_asset_symbol, prev.candidate_side, prev.instrument_type, nextDirection),
                          };
                        })
                      }
                    >
                      <option value="long">Long Future</option>
                      <option value="short">Short Future</option>
                    </select>
                  </div>
                )}
                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="crypto-tv-size">Size</label>
                  <input
                    id="crypto-tv-size"
                    className="form-control"
                    min={1}
                    type="number"
                    value={form.size}
                    onChange={(e) => setForm((prev) => ({ ...prev, size: Math.max(1, Number(e.target.value) || 1) }))}
                  />
                </div>
                <div className="col-12 d-flex flex-wrap gap-2">
                  <button
                    className="btn btn-warning"
                    disabled={templateCreating || !boundedRiskReady}
                    onClick={handleCreateTradingViewTemplate}
                  >
                    {templateCreating ? "Creating Template..." : "Create TV Template"}
                  </button>
                  <button className="btn btn-outline-light" disabled={templateCreating} onClick={() => void loadTemplates()}>
                    Refresh
                  </button>
                  <Link className="btn btn-outline-secondary" href="/crypto-market">
                    Back To Crypto Market
                  </Link>
                </div>
              </div>

              {latestTemplate ? (
                <div className="mt-4 border rounded p-3" style={{ borderColor: "var(--line)" }}>
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                    <div className="small muted">
                      <strong>Latest:</strong> {latestTemplate.alert_name}
                    </div>
                    <button
                      className="btn btn-sm btn-outline-light"
                      disabled={templateCopying || !generatedTemplateJson}
                      onClick={handleCopyTradingViewPayload}
                    >
                      {templateCopying ? "Copying..." : "Copy Payload"}
                    </button>
                  </div>
                  <div className="small muted mb-2">
                    <strong>Pine Strategy ID:</strong> {latestTemplate.pine_strategy_id}
                  </div>
                  <div className="small muted mb-2">
                    <strong>Template Setup:</strong> {templateSetupLabel(latestTemplate)}
                  </div>
                  <textarea
                    className="form-control"
                    readOnly
                    rows={10}
                    style={{ fontFamily: "monospace", fontSize: 12 }}
                    value={generatedTemplateJson}
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-4">
          <section className="dashboard-panel h-100">
            <h2 className="panel-title">Template Context</h2>
            <div className="p-3 d-flex flex-column gap-2 small muted">
              <div>
                <strong>Webhook:</strong> /api/v1/crypto/delta/webhook
              </div>
              <div>
                <strong>Signal Source:</strong> TradingView alerts
              </div>
              <div>
                <strong>Base URL:</strong> {dashboard?.api_base_url || "Loading..."}
              </div>
              <div>
                <strong>Mode:</strong> {demoEnvironment ? "Demo/Testnet" : "Live URL"}
              </div>
              <div>
                <strong>Tracked Underlyings:</strong> {dashboard?.underlyings.length ?? 0}
              </div>
              <div>
                <strong>Live Contracts:</strong> {fmtNumber((dashboard?.underlyings ?? []).reduce((sum, item) => sum + item.live_contract_count, 0), 0)}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="dashboard-panel" id="crypto-tv-templates">
        <h2 className="panel-title">Saved Crypto TradingView Templates</h2>
        <div className="p-3">
          <div className="small muted mb-3">
            Every template keeps its own access token, Pine strategy ID, and backend execution profile. TradingView alerts only need to identify the template and signal entry or exit.
          </div>
          <div className="row g-3">
            {templates.length ? (
              templates.map((template) => (
                <div className="col-12 col-md-6 col-xl-4" key={template.template_id}>
                  <div className="border rounded p-3 h-100 d-flex flex-column" style={{ borderColor: "var(--line)" }}>
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <div className="fw-semibold">{template.alert_name}</div>
                        <div className="small muted">{template.template_id}</div>
                      </div>
                      <span className={`badge-soft ${template.instrument_type === "future" ? "gold" : template.candidate_side === "call" ? "green" : "blue"}`}>
                        {template.instrument_type === "future" ? template.direction.toUpperCase() : template.candidate_side.toUpperCase()}
                      </span>
                    </div>
                    <div className="small muted d-flex flex-column gap-1 mb-3">
                      <div>
                        <strong>Template Setup:</strong> {templateSetupLabel(template)}
                      </div>
                      <div>
                        <strong>Order:</strong> {template.order_side.toUpperCase()} {template.order_type} x {template.size}
                      </div>
                      <div>
                        <strong>Pine Strategy ID:</strong> {template.pine_strategy_id}
                      </div>
                      <div>
                        <strong>Today:</strong> Accepted {template.stats_today.executed_events} | Rejected {template.stats_today.rejected_events} | Ignored {template.stats_today.ignored_events}
                      </div>
                      <div>
                        <strong>History:</strong> Trades {template.stats_all.total_trades} | Win {template.stats_all.win_trades} | Loss {template.stats_all.loss_trades} | Gross PnL {fmtNumber(template.stats_all.gross_pnl)}
                      </div>
                    </div>
                    <div className="d-flex gap-2 mb-2">
                      <button
                        className="btn btn-sm btn-outline-light flex-fill"
                        disabled={templateCopying}
                        onClick={() => void handleCopyTemplatePayload(template)}
                      >
                        {templateCopying ? "Copying..." : "Copy Payload"}
                      </button>
                      <button className="btn btn-sm btn-outline-light" onClick={() => void openActivity(template, "today")}>
                        Today
                      </button>
                      <button className="btn btn-sm btn-outline-light" onClick={() => void openActivity(template, "history")}>
                        History
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={templateDeletingId === template.template_id}
                        onClick={() => void handleDeleteTemplate(template.template_id)}
                      >
                        {templateDeletingId === template.template_id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                    <textarea
                      className="form-control mt-auto"
                      readOnly
                      rows={7}
                      style={{ fontFamily: "monospace", fontSize: 12 }}
                      value={JSON.stringify(template.generated.message, null, 2)}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No crypto TradingView templates yet. Create one for each alert-driven strategy variant you want to test.</div>
            )}
          </div>
        </div>
      </section>

      {activityTemplate ? (
        <div
          className="dashboard-trades-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeActivity();
            }
          }}
        >
          <div
            className="dashboard-trades-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Crypto TradingView alert activity"
          >
            <div className="dashboard-trades-modal-header">
              <div>
                <div className="dashboard-trades-modal-title">
                  {activityMode === "today" ? "Today's Crypto TradingView Alerts" : "Historical Crypto TradingView Alerts"}
                </div>
                <div className="dashboard-trades-modal-subtitle">
                  {activityTemplate.alert_name} | {templateSetupLabel(activityTemplate)}
                </div>
              </div>
              <button className="dashboard-trades-close" onClick={closeActivity} type="button">
                Close
              </button>
            </div>

            {activityError ? (
              <div className="alert alert-danger mb-0">{activityError}</div>
            ) : activityLoading ? (
              <div className="muted">Loading activity...</div>
            ) : (
              <>
                {activitySummary ? (
                  <div className="row g-2 mb-3">
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Accepted</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          {activitySummary.executed_events}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Rejected</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          {activitySummary.rejected_events}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Ignored</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          {activitySummary.ignored_events}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Gross PnL</div>
                        <div className={`metric-value ${activitySummary.gross_pnl >= 0 ? "text-success" : "text-danger"}`} style={{ fontSize: "1.08rem" }}>
                          {fmtNumber(activitySummary.gross_pnl)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activityEvents[0]?.payload ? (
                  <div className="mb-3">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <button className="dashboard-trades-link" onClick={() => setPayloadExpanded((prev) => !prev)} type="button">
                        Last received payload <span className="badge-soft blue ms-2">{payloadExpanded ? "Hide" : "Show"}</span>
                      </button>
                    </div>
                    {payloadExpanded ? (
                      <pre
                        className="form-control mt-2"
                        style={{ minHeight: 100, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                      >
                        {safeJson(activityEvents[0]?.payload)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                {activityEvents.length ? (
                  <div className="table-responsive">
                    <table className="table table-dark-shell align-middle dashboard-trades-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Action</th>
                          <th>Status</th>
                          <th>Exec</th>
                          <th>Entry LTP</th>
                          <th>Exit LTP</th>
                          <th>Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityEvents.map((event, idx) => (
                          <tr key={`${event.received_at}-${idx}`}>
                            <td className="small">{fmtDateTime(event.received_at)}</td>
                            <td className="mono">{event.normalized_action || "-"}</td>
                            <td>
                              <span className={`badge-soft ${activityStatusBadge(event.status)}`}>
                                {event.status}
                              </span>
                            </td>
                            <td className="small">{event.execution_status ?? "-"}</td>
                            <td className="mono">{fmtPrice(asNumber(event.entry_ltp) ?? payloadNumber(event.payload, "entry_ltp", "entry_price", "ltp"))}</td>
                            <td className="mono">{fmtPrice(asNumber(event.exit_ltp) ?? payloadNumber(event.payload, "exit_ltp", "exit_price"))}</td>
                            <td className="small">{cleanActivityDetail(event.detail) || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="muted">No activity events in this window.</div>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
