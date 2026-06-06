"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TodayHistoryToolbar } from "@/components/today-history-toolbar";
import {
    DeltaCryptoBalance,
    DeltaCryptoDashboardResponse,
    DeltaCryptoUnderlying,
    DeltaDemoOrdersResponse,
    DeltaDemoTrackedOrder,
    DeltaOptionChainResponse,
    DeltaSavedStrategyResponse,
    DeltaStrategyCandidate,
    DeltaStrategyPreviewResponse,
    SharedStrategyId,
    createDeltaSavedStrategy,
    deleteDeltaSavedStrategy,
    fetchDeltaCryptoDashboard,
    fetchDeltaDemoOrders,
    listDeltaSavedStrategies,
    placeDeltaDemoOrder,
    previewDeltaOptionChain,
    previewDeltaStrategy,
} from "@/lib/api";
import { HistoryPreset, HistoryView, localDateKey, matchesHistoryWindow, parseIsoDate } from "@/lib/history-window";

function fmtNumber(value?: number | null, maximumFractionDigits = 2) {
  if (value == null) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

function fmtUsd(value?: number | null, maximumFractionDigits = 2) {
  if (value == null) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

function fmtDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function metricTone(value?: number | null) {
  if (value == null || value === 0) {
    return "";
  }
  return value > 0 ? "positive" : "negative";
}

function balanceHeadline(balance: DeltaCryptoBalance | undefined) {
  if (!balance) {
    return "No balances";
  }
  return `${balance.asset_symbol} ${fmtNumber(balance.balance, 4)}`;
}

function totalLiveContracts(dashboard: DeltaCryptoDashboardResponse | null) {
  return (dashboard?.underlyings ?? []).reduce((sum, item) => sum + item.live_contract_count, 0);
}

function isDemoBaseUrl(url?: string | null) {
  const value = (url || "").toLowerCase();
  return value.includes("testnet") || value.includes("demo");
}

function getCandidateBookPrice(candidate: DeltaStrategyCandidate | null | undefined, orderSide: "buy" | "sell") {
  if (!candidate) {
    return null;
  }
  return orderSide === "buy" ? candidate.best_ask ?? null : candidate.best_bid ?? null;
}

function getCandidateBookSize(candidate: DeltaStrategyCandidate | null | undefined, orderSide: "buy" | "sell") {
  if (!candidate) {
    return null;
  }
  return orderSide === "buy" ? candidate.ask_size ?? null : candidate.bid_size ?? null;
}

type CryptoFormState = {
  underlying_asset_symbol: string;
  expiry_date: string;
  instrument_type: "option" | "future";
  direction: "long" | "short";
  rows_limit: number;
  option_preference: "call" | "put" | "both";
  target_delta: number;
  max_mark_price: number;
  min_open_interest: number;
  candidate_side: "call" | "put";
  order_side: "buy" | "sell";
  order_type: "market_order" | "limit_order";
  size: number;
  limit_price: string;
  max_order_value: number;
  max_spread_pct: number;
  allow_unbounded_risk: boolean;
  strategy_name: string;
  alert_name: string;
  strategy_type: SharedStrategyId;
};

const DEFAULT_FORM: CryptoFormState = {
  underlying_asset_symbol: "BTC",
  expiry_date: "",
  instrument_type: "option",
  direction: "long",
  rows_limit: 12,
  option_preference: "both",
  target_delta: 0.35,
  max_mark_price: 2000,
  min_open_interest: 0,
  candidate_side: "call",
  order_side: "buy",
  order_type: "limit_order",
  size: 1,
  limit_price: "",
  max_order_value: 2000,
  max_spread_pct: 5,
  allow_unbounded_risk: false,
  strategy_name: "BTC TV-HA CALL v2",
  alert_name: "M-CRYPTO-DELTA-BTC-CALL",
  strategy_type: "tv_ha_call_v2",
};

const CALL_STRATEGY_OPTIONS: { value: SharedStrategyId; label: string }[] = [
  { value: "tv_ha_call_v2", label: "TV-HA CALL v2" },
  { value: "nc_ha_call_entry", label: "NC HA CALL Entry" },
  { value: "fibo_nk_call", label: "FIBO-NK CALL" },
  { value: "jk_al_call", label: "JK AL CALL" },
  { value: "ol_oh_call", label: "OL-OH CALL" },
  { value: "momentum_call", label: "Momentum CALL" },
];

const PUT_STRATEGY_OPTIONS: { value: SharedStrategyId; label: string }[] = [
  { value: "tv_ha_put_v2", label: "TV-HA PUT v2" },
  { value: "fibo_nk_put", label: "FIBO-NK PUT" },
  { value: "jk_al_put", label: "JK AL PUT" },
  { value: "ol_oh_put", label: "OL-OH PUT" },
  { value: "momentum_put", label: "Momentum PUT" },
];

function defaultStrategyIdForSide(side: "call" | "put"): SharedStrategyId {
  return side === "put" ? "tv_ha_put_v2" : "tv_ha_call_v2";
}

function strategyOptionsForSide(side: "call" | "put") {
  return side === "put" ? PUT_STRATEGY_OPTIONS : CALL_STRATEGY_OPTIONS;
}

function supportsStrategy(side: "call" | "put", strategyId: SharedStrategyId) {
  return strategyOptionsForSide(side).some((option) => option.value === strategyId);
}

function strategyLabel(strategyId: SharedStrategyId) {
  return [...CALL_STRATEGY_OPTIONS, ...PUT_STRATEGY_OPTIONS].find((option) => option.value === strategyId)?.label ?? strategyId;
}

function defaultCryptoAlertName(symbol: string, side: "call" | "put") {
  return `M-CRYPTO-DELTA-${symbol || "BTC"}-${side.toUpperCase()}`;
}

function resolveCryptoAlertName(prev: CryptoFormState, symbol: string, side: "call" | "put") {
  const current = prev.alert_name.trim();
  const isGeneratedName = /^M-CRYPTO-DELTA-[A-Z0-9]+-(CALL|PUT|FUTURE-(LONG|SHORT))$/.test(current);
  if (current && !isGeneratedName) {
    return prev.alert_name;
  }
  if (prev.instrument_type === "future") {
    return `M-CRYPTO-DELTA-${symbol || "BTC"}-FUTURE-${prev.direction.toUpperCase()}`;
  }
  return defaultCryptoAlertName(symbol, side);
}

export function CryptoMarketShell() {
  const [dashboard, setDashboard] = useState<DeltaCryptoDashboardResponse | null>(null);
  const [preview, setPreview] = useState<DeltaOptionChainResponse | null>(null);
  const [strategyPreview, setStrategyPreview] = useState<DeltaStrategyPreviewResponse | null>(null);
  const [demoOrders, setDemoOrders] = useState<DeltaDemoOrdersResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [strategySaving, setStrategySaving] = useState(false);
  const [strategyDeletingId, setStrategyDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [form, setForm] = useState<CryptoFormState>(DEFAULT_FORM);
  const [savedStrategies, setSavedStrategies] = useState<DeltaSavedStrategyResponse[]>([]);
  const [ordersView, setOrdersView] = useState<HistoryView>("today");
  const [ordersHistoryPreset, setOrdersHistoryPreset] = useState<HistoryPreset>("last7");
  const [ordersHistoryFrom, setOrdersHistoryFrom] = useState("");
  const [ordersHistoryTo, setOrdersHistoryTo] = useState("");

  const selectedUnderlying = useMemo<DeltaCryptoUnderlying | null>(() => {
    return (
      dashboard?.underlyings.find((item) => item.symbol === form.underlying_asset_symbol) ??
      dashboard?.underlyings[0] ??
      null
    );
  }, [dashboard, form.underlying_asset_symbol]);

  const demoEnvironment = isDemoBaseUrl(dashboard?.api_base_url);

  const orderRows = demoOrders?.orders ?? [];
  const orderTodayKey = localDateKey(new Date());
  const ordersToday = orderRows.filter((order) => {
    const createdAt = parseIsoDate(order.created_at);
    if (!createdAt) {
      return false;
    }
    return localDateKey(createdAt) === orderTodayKey;
  });
  const ordersHistoryAll = orderRows.filter((order) => {
    const createdAt = parseIsoDate(order.created_at);
    if (!createdAt) {
      return false;
    }
    return localDateKey(createdAt) < orderTodayKey;
  });
  const ordersHistory = ordersHistoryAll.filter((order) => {
    const createdAt = parseIsoDate(order.created_at);
    if (!createdAt) {
      return false;
    }
    return matchesHistoryWindow(localDateKey(createdAt), ordersHistoryPreset, ordersHistoryFrom, ordersHistoryTo);
  });
  const visibleOrders = ordersView === "today" ? ordersToday : ordersHistory;
  const activeCandidate =
    form.instrument_type === "future"
      ? null
      : form.candidate_side === "call"
        ? strategyPreview?.call_candidate ?? null
        : strategyPreview?.put_candidate ?? null;
  const candidateBookPrice =
    form.instrument_type === "future" ? null : getCandidateBookPrice(activeCandidate, form.order_side);
  const candidateBookSize =
    form.instrument_type === "future" ? null : getCandidateBookSize(activeCandidate, form.order_side);
  const resolvedLimitPrice =
    form.instrument_type === "future" || form.order_type !== "limit_order"
      ? undefined
      : Number(form.limit_price) || candidateBookPrice || undefined;
  const sizeFitsVisibleBook =
    form.instrument_type === "future" ? true : candidateBookSize == null ? false : Number(form.size) <= candidateBookSize;
  const boundedRiskReady = form.instrument_type === "future" || form.order_side === "buy" || form.allow_unbounded_risk;
  const canPlaceDemoOrder = Boolean(
    dashboard?.configured &&
      demoEnvironment &&
      !orderPlacing &&
      boundedRiskReady &&
      form.size >= 1 &&
      (form.instrument_type === "future" || activeCandidate) &&
      (form.instrument_type === "future" || candidateBookPrice) &&
      (form.instrument_type === "future" || candidateBookSize) &&
      sizeFitsVisibleBook &&
      (form.instrument_type === "future" || form.order_type !== "limit_order" || resolvedLimitPrice),
  );

  useEffect(() => {
    if (form.instrument_type === "future" || form.order_type !== "limit_order") {
      return;
    }
    if (!candidateBookPrice || Number.isNaN(candidateBookPrice)) {
      return;
    }
    const nextPrice = String(candidateBookPrice);
    setForm((prev) => (prev.limit_price === nextPrice ? prev : { ...prev, limit_price: nextPrice }));
  }, [candidateBookPrice, form.order_type]);

  async function loadOrders() {
    try {
      setOrdersLoading(true);
      const result = await fetchDeltaDemoOrders();
      setDemoOrders(result);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load Delta demo orders");
      setMessageTone("error");
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadSavedStrategies() {
    try {
      const result = await listDeltaSavedStrategies();
      setSavedStrategies(result);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load crypto strategies");
      setMessageTone("error");
    }
  }

  async function loadPreview(symbol: string, expiryDate: string, rowsLimit: number) {
    try {
      setPreviewLoading(true);
      const result = await previewDeltaOptionChain({
        underlying_asset_symbol: symbol,
        expiry_date: expiryDate || undefined,
        rows_limit: rowsLimit,
      });
      setPreview(result);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load Delta option chain preview");
      setMessageTone("error");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function loadStrategy(symbol: string, expiryDate: string) {
    try {
      setStrategyLoading(true);
      const result = await previewDeltaStrategy({
        underlying_asset_symbol: symbol,
        expiry_date: expiryDate || undefined,
        option_preference: form.option_preference,
        target_delta: form.target_delta,
        max_mark_price: form.max_mark_price,
        min_open_interest: form.min_open_interest,
      });
      setStrategyPreview(result);
      if (form.option_preference === "call") {
        setForm((prev) => ({
          ...prev,
          candidate_side: "call",
          strategy_type: supportsStrategy("call", prev.strategy_type)
            ? prev.strategy_type
            : defaultStrategyIdForSide("call"),
          alert_name: resolveCryptoAlertName(prev, prev.underlying_asset_symbol, "call"),
        }));
      } else if (form.option_preference === "put") {
        setForm((prev) => ({
          ...prev,
          candidate_side: "put",
          strategy_type: supportsStrategy("put", prev.strategy_type)
            ? prev.strategy_type
            : defaultStrategyIdForSide("put"),
          alert_name: resolveCryptoAlertName(prev, prev.underlying_asset_symbol, "put"),
        }));
      } else if (result.preferred_candidate?.side === "put") {
        setForm((prev) => ({
          ...prev,
          candidate_side: "put",
          strategy_type: supportsStrategy("put", prev.strategy_type)
            ? prev.strategy_type
            : defaultStrategyIdForSide("put"),
          alert_name: resolveCryptoAlertName(prev, prev.underlying_asset_symbol, "put"),
        }));
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to preview Delta strategy");
      setMessageTone("error");
      setStrategyPreview(null);
    } finally {
      setStrategyLoading(false);
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
        alert_name: resolveCryptoAlertName(prev, selectedSymbol, prev.candidate_side),
      }));

      if (selected) {
        await Promise.all([
          loadPreview(selectedSymbol, resolvedExpiry, form.rows_limit),
          loadStrategy(selectedSymbol, resolvedExpiry),
          loadOrders(),
          loadSavedStrategies(),
        ]);
      } else {
        await Promise.all([loadOrders(), loadSavedStrategies()]);
      }

      setMessage(result.message);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load Delta crypto dashboard");
      setMessageTone("error");
    } finally {
      setDashboardLoading(false);
    }
  }

  async function handlePlaceDemoOrder() {
    try {
      setOrderPlacing(true);
      const result = await placeDeltaDemoOrder({
        underlying_asset_symbol: form.underlying_asset_symbol,
        expiry_date: form.expiry_date || undefined,
        instrument_type: form.instrument_type,
        candidate_side: form.candidate_side,
        direction: form.direction,
        order_side: form.order_side,
        order_type: form.order_type,
        size: Math.max(1, Number(form.size) || 1),
        limit_price: resolvedLimitPrice,
        option_preference: form.option_preference,
        target_delta: form.target_delta,
        max_mark_price: form.max_mark_price,
        min_open_interest: form.min_open_interest,
        max_order_value: form.max_order_value,
        max_spread_pct: form.max_spread_pct,
        allow_unbounded_risk: form.allow_unbounded_risk,
        source: "crypto-market-ui",
      });
      setStrategyPreview(result.strategy);
      setDemoOrders((prev) => {
        const existing = prev?.orders ?? [];
        return {
          broker_id: result.broker_id,
          broker_name: result.broker_name,
          base_url: result.base_url,
          demo_environment: result.demo_environment,
          summary: {
            total_orders: existing.length + 1,
            active_orders:
              existing.filter((item) => ["open", "pending"].includes((item.remote_state || "").toLowerCase())).length +
              (["open", "pending"].includes((result.placed_order.remote_state || "").toLowerCase()) ? 1 : 0),
            buy_orders: existing.filter((item) => item.order_side === "buy").length + (result.placed_order.order_side === "buy" ? 1 : 0),
            sell_orders:
              existing.filter((item) => item.order_side === "sell").length + (result.placed_order.order_side === "sell" ? 1 : 0),
            latest_order_at: result.placed_order.created_at,
          },
          orders: [result.placed_order, ...existing].slice(0, 50),
          message: "Showing locally tracked crypto demo orders.",
        };
      });
      setMessage(result.message);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to place Delta demo order");
      setMessageTone("error");
    } finally {
      setOrderPlacing(false);
    }
  }

  async function handleSaveStrategy() {
    try {
      setStrategySaving(true);
      const result = await createDeltaSavedStrategy({
        strategy_name: form.strategy_name.trim() || `${form.underlying_asset_symbol} ${strategyLabel(form.strategy_type)}`,
        strategy_type: form.strategy_type,
        underlying_asset_symbol: form.underlying_asset_symbol,
        expiry_date: form.expiry_date || undefined,
        option_preference: form.option_preference,
        target_delta: form.target_delta,
        max_mark_price: form.max_mark_price,
        min_open_interest: form.min_open_interest,
        candidate_side: form.candidate_side,
        order_side: form.order_side,
        order_type: form.order_type,
        size: Math.max(1, Number(form.size) || 1),
        limit_price: resolvedLimitPrice,
        max_order_value: form.max_order_value,
        max_spread_pct: form.max_spread_pct,
        allow_unbounded_risk: form.allow_unbounded_risk,
      });
      setSavedStrategies((prev) => [result, ...prev.filter((item) => item.strategy_id !== result.strategy_id)]);
      setMessage(`Saved crypto strategy ${result.strategy_name}.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save crypto strategy");
      setMessageTone("error");
    } finally {
      setStrategySaving(false);
    }
  }

  async function handleDeleteStrategy(strategyId: string) {
    try {
      setStrategyDeletingId(strategyId);
      await deleteDeltaSavedStrategy(strategyId);
      setSavedStrategies((prev) => prev.filter((item) => item.strategy_id !== strategyId));
      setMessage("Deleted crypto strategy.");
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete crypto strategy");
      setMessageTone("error");
    } finally {
      setStrategyDeletingId(null);
    }
  }

  function handleLoadSavedStrategy(strategy: DeltaSavedStrategyResponse) {
    const config = strategy.config as Record<string, string | number | boolean | null>;
    const nextSymbol = String(config.underlying_asset_symbol || form.underlying_asset_symbol);
    const nextCandidateSide = String(config.candidate_side || form.candidate_side) as "call" | "put";
    const nextExpiry = String(config.expiry_date || "");
    const nextRowsLimit = form.rows_limit;
    setForm((prev) => ({
      ...prev,
      strategy_name: strategy.strategy_name,
      strategy_type: strategy.strategy_type,
      underlying_asset_symbol: nextSymbol,
      expiry_date: nextExpiry,
      option_preference: (String(config.option_preference || prev.option_preference) as "call" | "put" | "both"),
      target_delta: Number(config.target_delta || prev.target_delta),
      max_mark_price: Number(config.max_mark_price || prev.max_mark_price),
      min_open_interest: Number(config.min_open_interest || prev.min_open_interest),
      candidate_side: nextCandidateSide,
      order_side: (String(config.order_side || prev.order_side) as "buy" | "sell"),
      order_type: (String(config.order_type || prev.order_type) as "market_order" | "limit_order"),
      size: Math.max(1, Number(config.size || prev.size)),
      limit_price: config.limit_price == null ? "" : String(config.limit_price),
      max_order_value: Number(config.max_order_value || prev.max_order_value),
      max_spread_pct: Number(config.max_spread_pct || prev.max_spread_pct),
      allow_unbounded_risk: Boolean(config.allow_unbounded_risk),
      alert_name: resolveCryptoAlertName(prev, nextSymbol, nextCandidateSide),
    }));
    void loadPreview(nextSymbol, nextExpiry, nextRowsLimit);
    void loadStrategy(nextSymbol, nextExpiry);
    setMessage(`Loaded strategy ${strategy.strategy_name} into the scanner.`);
    setMessageTone("success");
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const summaryCards = [
    { label: "Delta Auth", value: dashboard?.configured ? "Connected" : "Market Only" },
    { label: "Environment", value: demoEnvironment ? "Demo/Testnet" : "Live URL" },
    { label: "Tracked Underlyings", value: dashboard?.underlyings.length ?? 0 },
    { label: "Live Option Contracts", value: totalLiveContracts(dashboard) },
    { label: "Net Equity", value: fmtUsd(dashboard?.wallet?.net_equity), tone: metricTone(dashboard?.wallet?.net_equity) },
    { label: "Largest Balance", value: balanceHeadline(dashboard?.balances[0]) },
  ];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="crypto-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#crypto-top">
              Overview
            </a>
            <a className="hero-tab" href="#crypto-controls">
              Python Scanner
            </a>
            <Link className="hero-tab" href="/crypto-tradingview-templates">
              Crypto TV Templates
            </Link>
            <a className="hero-tab" href="#crypto-orders">
              Demo Orders
            </a>
            <a className="hero-tab" href="#crypto-account">
              Account
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Crypto Market</h1>
            <p className="hero-subtitle">
              Separate Delta crypto workspace for Python strategy scanning, saved strategy setup, and demo-order validation.
            </p>
          </div>
          <div className="p-3">
            {message && <div className={`alert ${messageTone === "success" ? "alert-success" : "alert-danger"}`}>{message}</div>}
            <div className={`alert ${demoEnvironment ? "alert-secondary" : "alert-warning"}`}>
              {demoEnvironment
                ? "Delta demo/testnet base URL is active, so Python scanner demo orders and TradingView alert executions stay inside the separate demo environment."
                : "Crypto demo order placement is blocked until DELTA_API_BASE_URL points to the Delta testnet/demo URL."}
            </div>
            {form.instrument_type === "future" ? (
              <div className="alert alert-secondary">
                Future demo orders use Delta perpetual or nearest futures selection and are submitted as market orders from this page.
              </div>
            ) : activeCandidate ? (
              <div className={`alert ${sizeFitsVisibleBook ? "alert-secondary" : "alert-warning"}`}>
                {`Active ${form.candidate_side.toUpperCase()} ${form.order_side.toUpperCase()} book uses ${
                  form.order_side === "buy" ? "best ask" : "best bid"
                } ${fmtUsd(candidateBookPrice)} with visible size ${fmtNumber(candidateBookSize, 4)}.`}
                {!sizeFitsVisibleBook && " Lower the order size or choose a more liquid contract before placing the demo order."}
              </div>
            ) : null}
            {!boundedRiskReady && form.instrument_type !== "future" && (
              <div className="alert alert-warning">
                Crypto option sell entries are blocked until the unbounded-risk override is enabled.
              </div>
            )}
            <div className="row g-3">
              {summaryCards.map((card) => (
                <div className="col-12 col-sm-6 col-xl" key={card.label}>
                  <div className={`metric-card ${"tone" in card ? card.tone : ""} p-3`}>
                    <div className="metric-label">{card.label}</div>
                    <div className="metric-value mt-2">{card.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 border rounded p-3" style={{ borderColor: "var(--line)" }}>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <div className="fw-semibold">Crypto TradingView Templates</div>
                  <div className="small muted">
                    The dedicated template desk now lives on its own page. Use it to create lightweight TradingView webhook payloads while keeping backend execution profiles separate from this Python scanner surface.
                  </div>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span className="badge-soft blue">SEPARATE PAGE</span>
                  <Link className="btn btn-warning" href="/crypto-tradingview-templates">
                    Open Crypto TV Templates
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="row g-4">
          <div className="col-12 col-xl-8">
            <section className="dashboard-panel h-100" id="crypto-controls">
              <h2 className="panel-title">Python Strategy Scanner</h2>
              <div className="p-3">
                <div className="alert alert-secondary">
                  This panel runs the Python scan for the current setup and can place a demo order from that result. It does not yet launch multiple long-running crypto Python strategy workers in parallel.
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label">Underlying</label>
                    <select
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
                          alert_name: resolveCryptoAlertName(prev, nextSymbol, prev.candidate_side),
                        }));
                      }}
                    >
                      {dashboardLoading && !dashboard?.underlyings.length && <option value={form.underlying_asset_symbol}>Loading…</option>}
                      {(dashboard?.underlyings ?? []).map((item) => (
                        <option key={item.symbol} value={item.symbol}>
                          {item.symbol} / {item.quoting_symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Execution Instrument</label>
                    <select
                      className="form-select"
                      value={form.instrument_type}
                      onChange={(e) =>
                        setForm((prev) => {
                          const nextInstrumentType = e.target.value as "option" | "future";
                          const nextForm: CryptoFormState = {
                            ...prev,
                            instrument_type: nextInstrumentType,
                            order_side: nextInstrumentType === "future" ? (prev.direction === "short" ? "sell" : "buy") : prev.order_side,
                            order_type: nextInstrumentType === "future" ? "market_order" : prev.order_type,
                            limit_price: nextInstrumentType === "future" ? "" : prev.limit_price,
                          };
                          return {
                            ...nextForm,
                            alert_name: resolveCryptoAlertName(nextForm, nextForm.underlying_asset_symbol, nextForm.candidate_side),
                          };
                        })
                      }
                    >
                      <option value="option">Option</option>
                      <option value="future">Future</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Expiry</label>
                    <select
                      className="form-select"
                      disabled={form.instrument_type === "future"}
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
                    <label className="form-label">Preview Rows</label>
                    <input
                      className="form-control"
                      max={50}
                      min={1}
                      type="number"
                      value={form.rows_limit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          rows_limit: Math.min(50, Math.max(1, Number(e.target.value) || 12)),
                        }))
                      }
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">Strategy Name</label>
                    <input
                      className="form-control"
                      maxLength={80}
                      minLength={3}
                      value={form.strategy_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, strategy_name: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Strategy Preference</label>
                    <select
                      className="form-select"
                      disabled={form.instrument_type === "future"}
                      value={form.option_preference}
                      onChange={(e) =>
                        setForm((prev) => {
                          const nextSide =
                            e.target.value === "put" ? "put" : e.target.value === "call" ? "call" : prev.candidate_side;
                          return {
                            ...prev,
                            option_preference: e.target.value as "call" | "put" | "both",
                            candidate_side: nextSide,
                            strategy_type: supportsStrategy(nextSide, prev.strategy_type)
                              ? prev.strategy_type
                              : defaultStrategyIdForSide(nextSide),
                            alert_name: resolveCryptoAlertName(prev, prev.underlying_asset_symbol, nextSide),
                          };
                        })
                      }
                    >
                      <option value="both">Best of Call + Put</option>
                      <option value="call">Call Only</option>
                      <option value="put">Put Only</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Execution Profile</label>
                    <select
                      className="form-select"
                      disabled={form.instrument_type === "future"}
                      value={form.strategy_type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          strategy_type: e.target.value as SharedStrategyId,
                        }))
                      }
                    >
                      {strategyOptionsForSide(form.candidate_side).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Target Delta</label>
                    <input
                      className="form-control"
                      disabled={form.instrument_type === "future"}
                      max={0.95}
                      min={0.05}
                      step="0.01"
                      type="number"
                      value={form.target_delta}
                      onChange={(e) => setForm((prev) => ({ ...prev, target_delta: Number(e.target.value) || 0.35 }))}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Max Mark Price</label>
                    <input
                      className="form-control"
                      disabled={form.instrument_type === "future"}
                      min={1}
                      step="0.01"
                      type="number"
                      value={form.max_mark_price}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_mark_price: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Min Open Interest</label>
                    <input
                      className="form-control"
                      disabled={form.instrument_type === "future"}
                      min={0}
                      step="0.01"
                      type="number"
                      value={form.min_open_interest}
                      onChange={(e) => setForm((prev) => ({ ...prev, min_open_interest: Number(e.target.value) || 0 }))}
                    />
                  </div>

                  {form.instrument_type === "future" ? (
                    <>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Direction</label>
                        <select
                          className="form-select"
                          value={form.direction}
                          onChange={(e) =>
                            setForm((prev) => {
                              const nextDirection = e.target.value as "long" | "short";
                              const nextForm: CryptoFormState = {
                                ...prev,
                                direction: nextDirection,
                                order_side: nextDirection === "short" ? "sell" : "buy",
                                order_type: "market_order",
                                limit_price: "",
                              };
                              return {
                                ...nextForm,
                                alert_name: resolveCryptoAlertName(nextForm, nextForm.underlying_asset_symbol, nextForm.candidate_side),
                              };
                            })
                          }
                        >
                          <option value="long">Long Future</option>
                          <option value="short">Short Future</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Order Side</label>
                        <input className="form-control" readOnly value={form.direction === "short" ? "sell" : "buy"} />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Order Type</label>
                        <input className="form-control" readOnly value="market_order" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Candidate Side</label>
                        <select
                          className="form-select"
                          value={form.candidate_side}
                          onChange={(e) =>
                            setForm((prev) => {
                              const nextSide = e.target.value as "call" | "put";
                              return {
                                ...prev,
                                candidate_side: nextSide,
                                strategy_type: supportsStrategy(nextSide, prev.strategy_type)
                                  ? prev.strategy_type
                                  : defaultStrategyIdForSide(nextSide),
                                alert_name: resolveCryptoAlertName(prev, prev.underlying_asset_symbol, nextSide),
                              };
                            })
                          }
                        >
                          <option value="call">Call Candidate</option>
                          <option value="put">Put Candidate</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Order Side</label>
                        <select
                          className="form-select"
                          value={form.order_side}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              order_side: e.target.value as "buy" | "sell",
                              limit_price:
                                prev.order_type === "limit_order" && activeCandidate
                                  ? String(getCandidateBookPrice(activeCandidate, e.target.value as "buy" | "sell") ?? prev.limit_price)
                                  : prev.limit_price,
                            }))
                          }
                        >
                          <option value="buy">Buy</option>
                          <option value="sell">Sell</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Order Type</label>
                        <select
                          className="form-select"
                          value={form.order_type}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              order_type: e.target.value as "market_order" | "limit_order",
                              limit_price:
                                e.target.value === "limit_order" && candidateBookPrice ? String(candidateBookPrice) : prev.limit_price,
                            }))
                          }
                        >
                          <option value="market_order">Market</option>
                          <option value="limit_order">Limit</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Order Size</label>
                    <input
                      className="form-control"
                      min={1}
                      type="number"
                      value={form.size}
                      onChange={(e) => setForm((prev) => ({ ...prev, size: Math.max(1, Number(e.target.value) || 1) }))}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Limit Price</label>
                    <input
                      className="form-control"
                      disabled={form.instrument_type === "future" || form.order_type !== "limit_order"}
                      placeholder="Optional for market"
                      type="number"
                      value={form.limit_price}
                      onChange={(e) => setForm((prev) => ({ ...prev, limit_price: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Max Premium Risk</label>
                    <input
                      className="form-control"
                      disabled={form.instrument_type === "future"}
                      min={1}
                      step="0.01"
                      type="number"
                      value={form.max_order_value}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_order_value: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Max Spread %</label>
                    <input
                      className="form-control"
                      disabled={form.instrument_type === "future"}
                      max={100}
                      min={0.1}
                      step="0.1"
                      type="number"
                      value={form.max_spread_pct}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_spread_pct: Number(e.target.value) || 5 }))}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Risk Override</label>
                    <div className="form-check form-switch mt-2">
                      <input
                        checked={form.allow_unbounded_risk}
                        className="form-check-input"
                        id="crypto-allow-unbounded-risk"
                        disabled={form.instrument_type === "future"}
                        type="checkbox"
                        onChange={(e) => setForm((prev) => ({ ...prev, allow_unbounded_risk: e.target.checked }))}
                      />
                      <label className="form-check-label small muted" htmlFor="crypto-allow-unbounded-risk">
                        Allow option sell entries
                      </label>
                    </div>
                  </div>
                  <div className="col-12 d-flex flex-wrap gap-2">
                    <button className="btn btn-outline-info" disabled={strategySaving} onClick={handleSaveStrategy}>
                      {strategySaving ? "Saving Strategy..." : "Save Strategy"}
                    </button>
                    <button
                      className="btn btn-outline-light"
                      disabled={!form.underlying_asset_symbol || previewLoading}
                      onClick={() => loadPreview(form.underlying_asset_symbol, form.expiry_date, form.rows_limit)}
                    >
                      {previewLoading ? "Refreshing..." : "Refresh Option Chain"}
                    </button>
                    <button
                      className="btn btn-outline-warning"
                      disabled={!form.underlying_asset_symbol || strategyLoading}
                      onClick={() => loadStrategy(form.underlying_asset_symbol, form.expiry_date)}
                    >
                      {strategyLoading ? "Scanning..." : "Run Python Scan"}
                    </button>
                    <button className="btn btn-outline-secondary" disabled={ordersLoading} onClick={() => void loadOrders()}>
                      {ordersLoading ? "Refreshing..." : "Refresh Demo Orders"}
                    </button>
                    <button className="btn btn-warning" disabled={!canPlaceDemoOrder} onClick={handlePlaceDemoOrder}>
                      {orderPlacing ? "Placing Demo Order..." : "Place Demo Order"}
                    </button>
                  </div>
                  <div className="col-12">
                    <div className="small muted">
                      Safer default: limit orders use the visible best ask for buys or best bid for sells. Demo orders are blocked
                      when the requested size is larger than the visible orderbook size.
                    </div>
                    <div className="small muted mt-2">
                      Multi-template concurrent testing is available in the TradingView section below because each template has its own access token and Pine strategy ID.
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="border rounded p-3" style={{ borderColor: "var(--line)" }}>
                      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                        <div>
                          <div className="fw-semibold">Configured Crypto Strategies</div>
                          <div className="small muted">
                            These are saved Python scanner setups for Delta. They are separate from TradingView templates and give us the base we need for future multi-run management.
                          </div>
                        </div>
                        <span className="badge-soft blue">{savedStrategies.length} saved</span>
                      </div>

                      {savedStrategies.length ? (
                        <div className="d-flex flex-column gap-3">
                          {savedStrategies.map((strategy) => {
                            const config = strategy.config as Record<string, string | number | boolean | null>;
                            return (
                              <div className="border rounded p-3" key={strategy.strategy_id} style={{ borderColor: "var(--line)" }}>
                                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                  <div>
                                    <div className="fw-semibold">{strategy.strategy_name}</div>
                                    <div className="small muted">{strategy.strategy_id}</div>
                                  </div>
                                  <span className="badge-soft gold">{strategy.runner_status.toUpperCase()}</span>
                                </div>
                                <div className="small muted d-flex flex-column gap-1 mb-3">
                                  <div>
                                    <strong>Scanner:</strong> {strategyLabel(strategy.strategy_type)} / {String(config.candidate_side || "-").toUpperCase()} / {String(config.underlying_asset_symbol || "-")}
                                  </div>
                                  <div>
                                    <strong>Expiry:</strong> {String(config.expiry_date || "Auto")} | <strong>Order:</strong> {String(config.order_side || "-").toUpperCase()} {String(config.order_type || "-")} x {String(config.size || "-")}
                                  </div>
                                  <div>
                                    <strong>Filters:</strong> delta {fmtNumber(Number(config.target_delta || 0), 2)} / mark {fmtUsd(Number(config.max_mark_price || 0))} / OI {fmtNumber(Number(config.min_open_interest || 0), 0)}
                                  </div>
                                  <div>
                                    <strong>Updated:</strong> {fmtDate(strategy.updated_at)}
                                  </div>
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                  <button className="btn btn-sm btn-outline-light" onClick={() => handleLoadSavedStrategy(strategy)}>
                                    Load Into Scanner
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    disabled={strategyDeletingId === strategy.strategy_id}
                                    onClick={() => void handleDeleteStrategy(strategy.strategy_id)}
                                  >
                                    {strategyDeletingId === strategy.strategy_id ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="empty-state">
                          No saved crypto strategies yet. Save each Python scanner setup you want to keep separate from TradingView alert templates.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {strategyPreview && (
                  <div className="mt-4 border rounded p-3" style={{ borderColor: "var(--line)" }}>
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                      <div>
                        <div className="fw-semibold">Python Strategy Scan Preview</div>
                        <div className="small muted">{strategyPreview.message}</div>
                      </div>
                      <span className={`badge-soft ${strategyPreview.entry_ready ? "green" : "gold"}`}>
                        {strategyPreview.entry_ready ? "Candidate Ready" : "No Entry"}
                      </span>
                    </div>
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-3">
                        <div className="small muted">
                          <strong>Spot:</strong> {fmtUsd(strategyPreview.spot_price)}
                        </div>
                      </div>
                      <div className="col-12 col-md-3">
                        <div className="small muted">
                          <strong>ATM Strike:</strong> {fmtNumber(strategyPreview.atm_strike)}
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="small muted">
                          <strong>Next Step:</strong> {strategyPreview.next_step}
                        </div>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-dark-shell align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Symbol</th>
                            <th>Strike</th>
                            <th>Mark</th>
                            <th>Bid</th>
                            <th>Ask</th>
                            <th>Book Size</th>
                            <th>Delta</th>
                            <th>OI</th>
                            <th>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            strategyPreview.call_candidate
                              ? { label: "CALL", value: strategyPreview.call_candidate }
                              : null,
                            strategyPreview.put_candidate
                              ? { label: "PUT", value: strategyPreview.put_candidate }
                              : null,
                          ]
                            .filter((item): item is { label: string; value: NonNullable<DeltaStrategyPreviewResponse["call_candidate"]> } => Boolean(item))
                            .map((item) => (
                              <tr key={`${item.label}-${item.value.product_id || item.value.symbol}`}>
                                <td>
                                  <span className={`badge-soft ${strategyPreview.preferred_candidate?.side === item.value.side ? "green" : "blue"}`}>
                                    {item.label}
                                  </span>
                                </td>
                                <td>{item.value.symbol || "-"}</td>
                                <td>{fmtNumber(item.value.strike_price)}</td>
                                <td>{fmtUsd(item.value.mark_price)}</td>
                                <td>{fmtUsd(item.value.best_bid)}</td>
                                <td>{fmtUsd(item.value.best_ask)}</td>
                                <td>{fmtNumber(getCandidateBookSize(item.value, form.order_side), 4)}</td>
                                <td>{fmtNumber(item.value.delta, 3)}</td>
                                <td>{fmtNumber(item.value.oi)}</td>
                                <td>{fmtNumber(item.value.score, 3)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {preview && (
                  <div className="mt-4 border rounded p-3" style={{ borderColor: "var(--line)" }}>
                    <div className="fw-semibold mb-2">Option Chain Snapshot</div>
                    <div className="small muted mb-3">{preview.message}</div>
                    <div className="table-responsive">
                      <table className="table table-dark-shell align-middle">
                        <thead>
                          <tr>
                            <th>Strike</th>
                            <th>CE Mark</th>
                            <th>CE Delta</th>
                            <th>CE OI</th>
                            <th>PE Mark</th>
                            <th>PE Delta</th>
                            <th>PE OI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row) => (
                            <tr key={row.strike_price}>
                              <td>{fmtNumber(row.strike_price)}</td>
                              <td>{fmtUsd(row.call?.mark_price)}</td>
                              <td>{fmtNumber(row.call?.delta, 3)}</td>
                              <td>{fmtNumber(row.call?.oi)}</td>
                              <td>{fmtUsd(row.put?.mark_price)}</td>
                              <td>{fmtNumber(row.put?.delta, 3)}</td>
                              <td>{fmtNumber(row.put?.oi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="col-12 col-xl-4">
            <section className="dashboard-panel h-100" id="crypto-account">
              <h2 className="panel-title">Delta Account</h2>
              <div className="p-3">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div className="fw-semibold fs-5">{dashboard?.profile?.account_name || "Delta Exchange"}</div>
                    <div className="muted small">{dashboard?.api_base_url || "Loading Delta API configuration..."}</div>
                  </div>
                  <span className={`badge-soft ${dashboard?.configured ? "green" : "gold"}`}>
                    {dashboard?.configured ? "Credentials Present" : "Market Data Only"}
                  </span>
                </div>

                <div className="mt-3 d-flex flex-column gap-2 small muted">
                  <div>
                    <strong>Mode:</strong> {demoEnvironment ? "Demo/Testnet" : "Live URL"}
                  </div>
                  <div>
                    <strong>Country:</strong> {dashboard?.profile?.country || "-"}
                  </div>
                  <div>
                    <strong>Margin Mode:</strong> {dashboard?.profile?.margin_mode || "-"}
                  </div>
                  <div>
                    <strong>Portfolio Index:</strong> {dashboard?.profile?.pf_index_symbol || "-"}
                  </div>
                  <div>
                    <strong>Net Equity:</strong> {fmtUsd(dashboard?.wallet?.net_equity)}
                  </div>
                  <div>
                    <strong>Robo Trading Equity:</strong> {fmtUsd(dashboard?.wallet?.robo_trading_equity)}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="fw-semibold mb-2">Top Balances</div>
                  <div className="table-responsive">
                    <table className="table table-dark-shell align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Asset</th>
                          <th>Balance</th>
                          <th>Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardLoading ? (
                          <tr>
                            <td className="empty-state" colSpan={3}>
                              Loading balances...
                            </td>
                          </tr>
                        ) : dashboard?.balances.length ? (
                          dashboard.balances.map((balance) => (
                            <tr key={balance.asset_symbol}>
                              <td>{balance.asset_symbol}</td>
                              <td>{fmtNumber(balance.balance, 4)}</td>
                              <td>{fmtNumber(balance.available_balance, 4)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="empty-state" colSpan={3}>
                              {dashboard?.configured ? "No wallet balances returned." : "Add Delta API keys to unlock wallet balances."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <section className="dashboard-panel mt-4" id="crypto-template">
              <h2 className="panel-title">Crypto TV Templates</h2>
              <div className="p-3">
                <div className="d-flex flex-column gap-2 small muted mb-3">
                  <div>
                    <strong>Webhook:</strong> /api/v1/crypto/delta/webhook
                  </div>
                  <div>
                    <strong>Signal Source:</strong> TradingView alerts
                  </div>
                  <div>
                    <strong>Dedicated Page:</strong> /crypto-tradingview-templates
                  </div>
                </div>
                <div className="small muted mb-3">
                  The full TradingView template builder now lives on its own page so `/crypto-market` can stay focused on Python scanning, saved crypto strategies, and demo-order review.
                </div>
                <Link className="btn btn-warning w-100" href="/crypto-tradingview-templates">
                  Open Crypto TradingView Templates
                </Link>
              </div>
            </section>
          </div>
        </div>

        <section className="dashboard-panel mt-4" id="crypto-orders">
          <h2 className="panel-title">Crypto Demo Orders</h2>
          <div className="p-3">
            <div className="small muted mb-3">
              These are tracked separately from the Indian stock/index bots and are intended only for Delta demo/testnet workflows.
            </div>
            <TodayHistoryToolbar
              view={ordersView}
              onViewChange={setOrdersView}
              preset={ordersHistoryPreset}
              onPresetChange={setOrdersHistoryPreset}
              fromDate={ordersHistoryFrom}
              onFromDateChange={setOrdersHistoryFrom}
              toDate={ordersHistoryTo}
              onToDateChange={setOrdersHistoryTo}
              todayCount={ordersToday.length}
              historyCount={ordersHistory.length}
              historyTotalCount={ordersHistoryAll.length}
            />
            <div className="table-responsive">
              <table className="table table-dark-shell align-middle">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Underlying</th>
                    <th>Contract</th>
                    <th>Side</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>State</th>
                    <th>Remote ID</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersLoading ? (
                    <tr>
                      <td className="empty-state" colSpan={8}>
                        Loading crypto demo orders...
                      </td>
                    </tr>
                  ) : visibleOrders.length ? (
                    visibleOrders.map((order: DeltaDemoTrackedOrder) => (
                      <tr key={order.local_order_id}>
                        <td>{fmtDate(order.created_at)}</td>
                        <td>{order.underlying_asset_symbol}</td>
                        <td>{order.product_symbol || order.product_id || "-"}</td>
                        <td>{order.order_side.toUpperCase()}</td>
                        <td>{order.order_type}</td>
                        <td>{fmtNumber(order.size)}</td>
                        <td>
                          <span className={`badge-soft ${["open", "pending"].includes((order.remote_state || "").toLowerCase()) ? "green" : "blue"}`}>
                            {order.remote_state || "-"}
                          </span>
                        </td>
                        <td>{order.remote_order_id || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="empty-state" colSpan={8}>
                        {ordersView === "today"
                          ? "No crypto demo orders tracked today."
                          : "No historical crypto demo orders match the selected date range."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
