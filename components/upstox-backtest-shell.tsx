"use client";

import { useEffect, useState } from "react";

import {
  fetchInstrumentCatalog,
  fetchUpstoxBacktestChartCandles,
  InstrumentCatalogResponse,
  MarketDataBrokerId,
  runUpstoxOptionChainBacktest,
  UpstoxBacktestChartCandle,
  UpstoxOptionChainBacktestRunRequest,
  UpstoxOptionChainBacktestRunResponse,
  UpstoxOptionChainBacktestTrade,
} from "@/lib/api";

import { BacktestTradeChart } from "@/components/backtest-trade-chart";

function fmtDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function pnlClass(value: number) {
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "";
}

function fmtNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function instrumentOptions(data: InstrumentCatalogResponse | null) {
  if (!data) {
    return { indices: [], stocks: [], commodities: [] };
  }
  return {
    indices: data.indices ?? [],
    stocks: data.stocks ?? [],
    commodities: data.commodities ?? [],
  };
}

function instrumentLabel(item: { label: string; verified: boolean }) {
  return item.verified ? item.label : `${item.label} (unverified)`;
}

type BotSide = "call" | "put";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultBacktestDateRange() {
  const toDate = new Date();
  toDate.setDate(toDate.getDate() - 1);
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 29);
  return {
    from_date: formatDateInput(fromDate),
    to_date: formatDateInput(toDate),
  };
}

const CALL_STRATEGY_OPTIONS = [
  { value: "tv_ha_call_v2", label: "TV-HA CALL v2" },
  { value: "fibo_nk_call", label: "FIBO-NK CALL" },
  { value: "jk_al_call", label: "JK AL CALL" },
  { value: "ol_oh_call", label: "OL-OH CALL" },
];

const PUT_STRATEGY_OPTIONS = [
  { value: "tv_ha_put_v2", label: "TV-HA PUT v2" },
  { value: "fibo_nk_put", label: "FIBO-NK PUT" },
  { value: "jk_al_put", label: "JK AL PUT" },
  { value: "ol_oh_put", label: "OL-OH PUT" },
];

const MARKET_DATA_BROKERS: { value: MarketDataBrokerId; label: string }[] = [
  { value: "dhan", label: "Dhan" },
  { value: "kite", label: "Kite" },
  { value: "upstox", label: "Upstox" },
];
type BacktestIntervalOption = {
  value: string;
  label: string;
  requestUnit?: string;
  requestInterval?: string;
  expiredInterval?: string;
};

const UNDERLYING_INTERVAL_OPTIONS: BacktestIntervalOption[] = [
  { value: "1", label: "1m" },
  { value: "3", label: "3m" },
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "25", label: "25m" },
  { value: "60", label: "60m" },
];

const OPTION_INTERVAL_OPTIONS: BacktestIntervalOption[] = [
  {
    value: "15s",
    label: "15s",
    requestUnit: "minutes",
    requestInterval: "1",
    expiredInterval: "1minute",
  },
  ...UNDERLYING_INTERVAL_OPTIONS,
];
const DEFAULT_BACKTEST_MARKET_DATA_BROKER: MarketDataBrokerId = "upstox";
const DEFAULT_BACKTEST_FALLBACK_BROKER: MarketDataBrokerId = "kite";

// Minute intervals each broker can serve natively. Brokers omitted here accept
// every interval in UNDERLYING_INTERVAL_OPTIONS. Dhan only supports these, and
// its adapter would otherwise SILENTLY snap an unsupported interval (3m -> 5m),
// changing the strategy timeframe. This drives the timeframe dropdown so an
// unsupported TF can't be picked for the chosen broker. The backend enforces the
// same rule (interval_aware_chain / _BROKER_NATIVE_MINUTE_INTERVALS in
// app/services/upstox_strategy_bridge.py) — keep the two in sync.
const BROKER_SUPPORTED_MINUTE_INTERVALS: Partial<Record<MarketDataBrokerId, string[]>> = {
  dhan: ["1", "5", "15", "25", "60"],
};

const BROKER_DEFAULT_INTERVAL: Record<MarketDataBrokerId, string> = {
  dhan: "5",
  kite: "3",
  upstox: "3",
};

function underlyingIntervalsForBroker(broker: MarketDataBrokerId): BacktestIntervalOption[] {
  const allowed = BROKER_SUPPORTED_MINUTE_INTERVALS[broker];
  if (!allowed) {
    return UNDERLYING_INTERVAL_OPTIONS;
  }
  return UNDERLYING_INTERVAL_OPTIONS.filter((option) => allowed.includes(option.value));
}

function optionIntervalsForBroker(broker: MarketDataBrokerId): BacktestIntervalOption[] {
  const allowed = BROKER_SUPPORTED_MINUTE_INTERVALS[broker];
  if (!allowed) {
    return OPTION_INTERVAL_OPTIONS;
  }
  // "15s" requests a 1m candle under the hood, which every broker supports.
  return OPTION_INTERVAL_OPTIONS.filter(
    (option) => option.value === "15s" || allowed.includes(option.value),
  );
}

function coerceUnderlyingIntervalForBroker(broker: MarketDataBrokerId, current: string): string {
  const allowed = BROKER_SUPPORTED_MINUTE_INTERVALS[broker];
  const normalized = normalizeMinuteInterval(current);
  if (!allowed || allowed.includes(normalized)) {
    return normalized;
  }
  return BROKER_DEFAULT_INTERVAL[broker] ?? allowed[0];
}

function coerceOptionIntervalForBroker(broker: MarketDataBrokerId, current: string): string {
  const allowed = BROKER_SUPPORTED_MINUTE_INTERVALS[broker];
  if (!allowed || current === "15s" || allowed.includes(current)) {
    return current;
  }
  return BROKER_DEFAULT_INTERVAL[broker] ?? allowed[0];
}

function isMarketDataBrokerId(value: string | null | undefined): value is MarketDataBrokerId {
  return MARKET_DATA_BROKERS.some((option) => option.value === value);
}

function optionIntervalValue(value: string) {
  return `${value}minute`;
}

function optionTfRequest(value: string): Required<BacktestIntervalOption> {
  const selected = OPTION_INTERVAL_OPTIONS.find((option) => option.value === value) ?? OPTION_INTERVAL_OPTIONS[1];
  const requestInterval = selected.requestInterval ?? selected.value;
  return {
    value: selected.value,
    label: selected.label,
    requestUnit: selected.requestUnit ?? "minutes",
    requestInterval,
    expiredInterval: selected.expiredInterval ?? optionIntervalValue(requestInterval),
  };
}

function normalizeMinuteInterval(value: string) {
  return String(value || "1")
    .trim()
    .toLowerCase()
    .replace("minutes", "")
    .replace("minute", "")
    .replace("min", "") || "1";
}

function brokerLabel(value: string | null | undefined) {
  return MARKET_DATA_BROKERS.find((option) => option.value === value)?.label ?? value ?? "None";
}

type BacktestComparisonRow = {
  broker: MarketDataBrokerId;
  fallback_broker: MarketDataBrokerId | null;
  status: "ok" | "error";
  duration_ms: number;
  message: string;
  result?: UpstoxOptionChainBacktestRunResponse;
};

function defaultStrategyIdForSide(side: BotSide) {
  return side === "put" ? "tv_ha_put_v2" : "tv_ha_call_v2";
}

function strategyOptionsForSide(side: BotSide) {
  return side === "put" ? PUT_STRATEGY_OPTIONS : CALL_STRATEGY_OPTIONS;
}

function supportsStrategy(side: BotSide, strategyId: string) {
  return strategyOptionsForSide(side).some((option) => option.value === strategyId);
}

export function UpstoxBacktestShell() {
  const defaultDates = defaultBacktestDateRange();
  const [catalog, setCatalog] = useState<InstrumentCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [backtestRunning, setBacktestRunning] = useState(false);
  const [backtestMessage, setBacktestMessage] = useState("");
  const [backtestMessageTone, setBacktestMessageTone] = useState<"success" | "error">("success");
  const [backtestResult, setBacktestResult] = useState<UpstoxOptionChainBacktestRunResponse | null>(null);
  const [backtestLogs, setBacktestLogs] = useState<string[]>([]);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState("");
  const [chartCandles, setChartCandles] = useState<UpstoxBacktestChartCandle[]>([]);
  const [chartFocusTime, setChartFocusTime] = useState<string | null>(null);
  const [comparisonRunning, setComparisonRunning] = useState(false);
  const [comparisonRows, setComparisonRows] = useState<BacktestComparisonRow[]>([]);
  const [backtestForm, setBacktestForm] = useState<UpstoxOptionChainBacktestRunRequest>({
    instrument_key: "NSE_INDEX|Nifty 50",
    side: "call",
    strategy_id: "tv_ha_call_v2",
    market_data_broker: DEFAULT_BACKTEST_MARKET_DATA_BROKER,
    fallback_broker: DEFAULT_BACKTEST_FALLBACK_BROKER,
    from_date: defaultDates.from_date,
    to_date: defaultDates.to_date,
    underlying_unit: "minutes",
    underlying_interval: "3",
    option_interval: "1minute",
    current_option_unit: "minutes",
    current_option_interval: "1",
    strike_offset: 0,
    lots: 1,
    max_entry_ltp: 1000,
    sl_premium_pct: 0.2,
    target_premium_pct: 0.36,
    live_parity: true,
    use_time_windows: true,
    use_ema20_entry_filter: true,
    entry_exit_veto_mode: "off",
    risk_model: "dynamic",
    export_csv: "logs/upstox/tv_ha_call_option_backtest_api.csv",
  });
  const instruments = instrumentOptions(catalog);
  const selectedCommodity =
    instruments.commodities.find((item) => item.instrument_key === backtestForm.instrument_key) ?? null;

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        const response = await fetchInstrumentCatalog();
        if (!active) {
          return;
        }
        setCatalog(response);
        setCatalogError("");
      } catch (err) {
        if (!active) {
          return;
        }
        setCatalogError(err instanceof Error ? err.message : "Failed to load instrument catalog");
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }
    }

    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  async function handleRunBacktest() {
    try {
      setBacktestRunning(true);
      const marketDataBroker = isMarketDataBrokerId(backtestForm.market_data_broker)
        ? backtestForm.market_data_broker
        : DEFAULT_BACKTEST_MARKET_DATA_BROKER;
      const fallbackBroker =
        backtestForm.fallback_broker && backtestForm.fallback_broker !== marketDataBroker
          ? backtestForm.fallback_broker
          : DEFAULT_BACKTEST_FALLBACK_BROKER !== marketDataBroker
            ? DEFAULT_BACKTEST_FALLBACK_BROKER
            : null;
      const payload: UpstoxOptionChainBacktestRunRequest = {
        ...backtestForm,
        commodity_symbol: selectedCommodity?.symbol ?? null,
        market_data_broker: marketDataBroker,
        fallback_broker: fallbackBroker,
        option_interval: optionTfRequest(backtestForm.current_option_interval).expiredInterval,
        current_option_unit: optionTfRequest(backtestForm.current_option_interval).requestUnit,
        current_option_interval: optionTfRequest(backtestForm.current_option_interval).requestInterval,
        export_csv: backtestForm.export_csv?.trim() ? backtestForm.export_csv.trim() : null,
      };
      const result = await runUpstoxOptionChainBacktest(payload);
      setBacktestResult(result);
      if (result.summary.trades > 0) {
        setBacktestMessage(result.message);
        setBacktestMessageTone("success");
      } else {
        setBacktestMessage(
          result.message === "No underlying history returned."
            ? "No underlying history was returned for the selected range. Try a broader or more recent date window."
            : (result.message ||
              "Backtest completed, but no trades were generated for the selected instrument, strategy, and date range.")
        );
        setBacktestMessageTone("error");
      }
      setBacktestLogs(result.logs ?? []);
    } catch (err) {
      setBacktestResult(null);
      setBacktestMessage(err instanceof Error ? err.message : "Failed to run Upstox option-chain backtest");
      setBacktestMessageTone("error");
      setBacktestLogs([]);
    } finally {
      setBacktestRunning(false);
    }
  }

  async function handleOpenTradeChart(trade: UpstoxOptionChainBacktestTrade) {
    if (!backtestResult) return;
    setChartOpen(true);
    setChartFocusTime(trade.entry_time);
    setChartError("");
    setChartLoading(true);
    try {
      const marketDataBroker = isMarketDataBrokerId(backtestForm.market_data_broker)
        ? backtestForm.market_data_broker
        : DEFAULT_BACKTEST_MARKET_DATA_BROKER;
      const response = await fetchUpstoxBacktestChartCandles({
        instrument_key: backtestResult.instrument_key,
        commodity_symbol: selectedCommodity?.symbol ?? null,
        market_data_broker: marketDataBroker,
        fallback_broker:
          backtestForm.fallback_broker && backtestForm.fallback_broker !== marketDataBroker
            ? backtestForm.fallback_broker
            : null,
        from_date: backtestResult.from_date,
        to_date: backtestResult.to_date,
        underlying_unit: backtestForm.underlying_unit,
        underlying_interval: backtestForm.underlying_interval,
        price_mode: "heikin_ashi",
      });
      setChartCandles(response.candles);
      if (!response.candles.length) {
        setChartError("No candles returned for this window.");
      }
    } catch (err) {
      setChartCandles([]);
      setChartError(err instanceof Error ? err.message : "Failed to load chart candles");
    } finally {
      setChartLoading(false);
    }
  }

  function comparisonFallbackForBroker(broker: MarketDataBrokerId): MarketDataBrokerId | null {
    if (backtestForm.fallback_broker && backtestForm.fallback_broker !== broker) {
      return backtestForm.fallback_broker;
    }
    return broker === "kite" ? "upstox" : "kite";
  }

  async function handleCompareBrokers() {
    setComparisonRunning(true);
    setComparisonRows([]);
    const rows: BacktestComparisonRow[] = [];
    try {
      for (const option of MARKET_DATA_BROKERS) {
        const broker = option.value;
        const fallbackBroker = comparisonFallbackForBroker(broker);
        const startedAt = performance.now();
        try {
          const payload: UpstoxOptionChainBacktestRunRequest = {
            ...backtestForm,
            commodity_symbol: selectedCommodity?.symbol ?? null,
            market_data_broker: broker,
            fallback_broker: fallbackBroker,
            option_interval: optionTfRequest(backtestForm.current_option_interval).expiredInterval,
            current_option_unit: optionTfRequest(backtestForm.current_option_interval).requestUnit,
            current_option_interval: optionTfRequest(backtestForm.current_option_interval).requestInterval,
            export_csv: null,
          };
          const result = await runUpstoxOptionChainBacktest(payload);
          rows.push({
            broker,
            fallback_broker: fallbackBroker,
            status: "ok",
            duration_ms: Math.round(performance.now() - startedAt),
            message: result.message,
            result,
          });
        } catch (err) {
          rows.push({
            broker,
            fallback_broker: fallbackBroker,
            status: "error",
            duration_ms: Math.round(performance.now() - startedAt),
            message: err instanceof Error ? err.message : "Backtest failed",
          });
        }
        setComparisonRows([...rows]);
      }
    } finally {
      setComparisonRunning(false);
    }
  }

  const summaryCards = backtestResult
    ? [
        { label: "Trades", value: backtestResult.summary.trades },
        { label: "Wins", value: backtestResult.summary.wins },
        { label: "Win Rate", value: `${backtestResult.summary.win_rate}%` },
        { label: "Total PnL", value: fmtMoney(backtestResult.summary.total_pnl) },
        { label: "Average PnL", value: fmtMoney(backtestResult.summary.average_pnl) },
        { label: "Best Trade", value: fmtMoney(backtestResult.summary.best_trade) },
        { label: "Worst Trade", value: fmtMoney(backtestResult.summary.worst_trade) },
        { label: "Shown Trades", value: Math.min(backtestResult.trades.length, 20) },
      ]
    : [];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="backtest-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#backtest-top">
              Overview
            </a>
            <a className="hero-tab" href="#backtest-controls">
              Controls
            </a>
            <a className="hero-tab" href="#backtest-results">
              Results
            </a>
            <a className="hero-tab" href="#backtest-log">
              Logs
            </a>
            <a className="hero-tab" href="#backtest-notes">
              Notes
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Upstox Option Chain Backtest</h1>
            <p className="hero-subtitle">
              Dedicated tab for running and reviewing option-chain backtests without crowding the live bot dashboard.
            </p>
          </div>
          <div className="p-3">
            <div className="row g-3">
              <div className="col-lg-8">
                <div className="dashboard-panel h-100" id="backtest-controls">
                  <h2 className="panel-title">Backtest Controls</h2>
                  <div className="p-3">
                    <div className="row g-3">
                      <div className="col-12 col-md-6 col-xl-4">
                        <label className="form-label">Instrument Key</label>
                        <select
                          className="form-select"
                          value={backtestForm.instrument_key}
                          onChange={(e) => setBacktestForm((prev) => ({ ...prev, instrument_key: e.target.value }))}
                          disabled={
                            catalogLoading &&
                            instruments.indices.length === 0 &&
                            instruments.stocks.length === 0 &&
                            instruments.commodities.length === 0
                          }
                        >
                          {catalogLoading &&
                            !instruments.indices.length &&
                            !instruments.stocks.length &&
                            !instruments.commodities.length && (
                            <option value={backtestForm.instrument_key}>Loading instruments...</option>
                          )}
                          <optgroup label="Indices">
                            {instruments.indices.map((item) => (
                              <option key={item.instrument_key} value={item.instrument_key}>
                                {instrumentLabel(item)}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Stocks">
                            {instruments.stocks.slice(0, 500).map((item) => (
                              <option key={item.instrument_key} value={item.instrument_key}>
                                {instrumentLabel(item)}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Commodities">
                            {instruments.commodities.map((item) => (
                              <option
                                key={item.instrument_key || item.symbol || item.label}
                                value={item.instrument_key}
                                disabled={!item.instrument_key}
                              >
                                {instrumentLabel(item)}
                                {!item.instrument_key ? " - configure MCX key" : ""}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">Side</label>
                        <select
                          className="form-select"
                          value={backtestForm.side}
                          onChange={(e) => {
                            const side = e.target.value as BotSide;
                            setBacktestForm((prev) => ({
                              ...prev,
                              side,
                              strategy_id: supportsStrategy(side, prev.strategy_id)
                                ? prev.strategy_id
                                : defaultStrategyIdForSide(side),
                            }));
                          }}
                        >
                          <option value="call">Call</option>
                          <option value="put">Put</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-6 col-xl-3">
                        <label className="form-label">Strategy</label>
                        <select
                          className="form-select"
                          value={backtestForm.strategy_id}
                          onChange={(e) => setBacktestForm((prev) => ({ ...prev, strategy_id: e.target.value }))}
                        >
                          {strategyOptionsForSide(backtestForm.side).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="small muted mt-1">
                          Classic TV-HA engine for the selected side.
                        </div>
                      </div>
                      <div className="col-12 col-md-6 col-xl-3">
                        <label className="form-label">Market Data</label>
                        <select
                          className="form-select"
                          value={backtestForm.market_data_broker}
                          onChange={(e) => {
                            const broker = e.target.value as MarketDataBrokerId;
                            setBacktestForm((prev) => {
                              const underlyingInterval = coerceUnderlyingIntervalForBroker(
                                broker,
                                prev.underlying_interval,
                              );
                              const optionValue = coerceOptionIntervalForBroker(
                                broker,
                                prev.current_option_interval,
                              );
                              const option = optionTfRequest(optionValue);
                              return {
                                ...prev,
                                market_data_broker: broker,
                                fallback_broker:
                                  prev.fallback_broker === broker ? null : prev.fallback_broker,
                                underlying_unit: "minutes",
                                underlying_interval: underlyingInterval,
                                option_interval: option.expiredInterval,
                                current_option_unit: option.requestUnit,
                                current_option_interval: option.value,
                              };
                            });
                          }}
                        >
                          {MARKET_DATA_BROKERS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-6 col-xl-3">
                        <label className="form-label">Fallback Data</label>
                        <select
                          className="form-select"
                          value={backtestForm.fallback_broker ?? ""}
                          onChange={(e) =>
                            setBacktestForm((prev) => ({
                              ...prev,
                              fallback_broker: e.target.value ? (e.target.value as MarketDataBrokerId) : null,
                            }))
                          }
                        >
                          <option value="">None</option>
                          {MARKET_DATA_BROKERS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                              disabled={option.value === backtestForm.market_data_broker}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">From Date</label>
                        <input
                          className="form-control"
                          type="date"
                          value={backtestForm.from_date}
                          onChange={(e) => setBacktestForm((prev) => ({ ...prev, from_date: e.target.value }))}
                        />
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">To Date</label>
                        <input
                          className="form-control"
                          type="date"
                          value={backtestForm.to_date}
                          onChange={(e) => setBacktestForm((prev) => ({ ...prev, to_date: e.target.value }))}
                        />
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">Strike Offset</label>
                        <input
                          className="form-control"
                          type="number"
                          value={backtestForm.strike_offset}
                          onChange={(e) =>
                            setBacktestForm((prev) => ({ ...prev, strike_offset: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">Underlying TF</label>
                        <select
                          className="form-select"
                          value={normalizeMinuteInterval(backtestForm.underlying_interval)}
                          onChange={(e) =>
                            setBacktestForm((prev) => ({
                              ...prev,
                              underlying_unit: "minutes",
                              underlying_interval: e.target.value,
                            }))
                          }
                        >
                          {underlyingIntervalsForBroker(backtestForm.market_data_broker).map(
                            (option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">Option TF</label>
                        <select
                          className="form-select"
                          value={backtestForm.current_option_interval}
                          onChange={(e) => {
                            const selected = optionTfRequest(e.target.value);
                            setBacktestForm((prev) => ({
                              ...prev,
                              option_interval: selected.expiredInterval,
                              current_option_unit: selected.requestUnit,
                              current_option_interval: selected.value,
                            }));
                          }}
                        >
                          {optionIntervalsForBroker(backtestForm.market_data_broker).map(
                            (option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div className="col-12 col-md-6 col-xl-4">
                        <label className="form-label">Export CSV</label>
                        <input
                          className="form-control"
                          value={backtestForm.export_csv ?? ""}
                          onChange={(e) => setBacktestForm((prev) => ({ ...prev, export_csv: e.target.value }))}
                        />
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">Lots</label>
                        <input
                          className="form-control"
                          type="number"
                          value={backtestForm.lots}
                          onChange={(e) => setBacktestForm((prev) => ({ ...prev, lots: Number(e.target.value) || 1 }))}
                        />
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">Max Entry LTP</label>
                        <input
                          className="form-control"
                          type="number"
                          value={backtestForm.max_entry_ltp}
                          onChange={(e) =>
                            setBacktestForm((prev) => ({ ...prev, max_entry_ltp: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">SL Premium %</label>
                        <input
                          className="form-control"
                          type="number"
                          step="0.01"
                          value={backtestForm.sl_premium_pct}
                          onChange={(e) =>
                            setBacktestForm((prev) => ({ ...prev, sl_premium_pct: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">Target Premium %</label>
                        <input
                          className="form-control"
                          type="number"
                          step="0.01"
                          value={backtestForm.target_premium_pct}
                          onChange={(e) =>
                            setBacktestForm((prev) => ({ ...prev, target_premium_pct: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div className="col-12 col-md-6 col-xl-3">
                        <label className="form-label d-block">Execution Profile</label>
                        <label className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={Boolean(backtestForm.live_parity)}
                            onChange={(e) =>
                              setBacktestForm((prev) => ({
                                ...prev,
                                live_parity: e.target.checked,
                                market_data_broker: e.target.checked ? "upstox" : prev.market_data_broker,
                                fallback_broker: e.target.checked ? "kite" : prev.fallback_broker,
                                underlying_unit: "minutes",
                                underlying_interval: e.target.checked ? "3" : prev.underlying_interval,
                                risk_model: e.target.checked ? "dynamic" : "fixed",
                              }))
                            }
                          />
                          <span className="form-check-label">Live parity</span>
                        </label>
                        <div className="small muted mt-1">
                          Uses completed candles, next-candle fills, live EMA/time gates, and dynamic risk.
                        </div>
                      </div>
                      <div className="col-12 col-md-6 col-xl-3">
                        <label className="form-label">Entry/Exit Veto</label>
                        <select
                          className="form-select"
                          value={backtestForm.entry_exit_veto_mode ?? "off"}
                          disabled={!backtestForm.live_parity}
                          onChange={(e) =>
                            setBacktestForm((prev) => ({
                              ...prev,
                              entry_exit_veto_mode: e.target.value as "current_candle" | "prev_candle" | "off",
                            }))
                          }
                        >
                          <option value="current_candle">Current candle</option>
                          <option value="prev_candle">Previous candle</option>
                          <option value="off">Off</option>
                        </select>
                      </div>
                      <div className="col-12 col-xl-12 d-flex flex-wrap gap-3 align-items-center">
                        <button className="btn btn-warning" disabled={backtestRunning} onClick={handleRunBacktest}>
                          {backtestRunning ? "Running..." : "Run Backtest"}
                        </button>
                        <button
                          className="btn btn-outline-light"
                          disabled={backtestRunning || comparisonRunning}
                          onClick={() => void handleCompareBrokers()}
                          type="button"
                        >
                          {comparisonRunning ? "Comparing..." : "Compare Brokers"}
                        </button>
                        <div className="muted">
                          {catalogLoading
                            ? "Loading available instruments..."
                            : `Universe ready: ${instruments.indices.length} indices, ${instruments.stocks.length} stocks, ${instruments.commodities.length} commodities`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="dashboard-panel h-100" id="backtest-notes">
                  <h2 className="panel-title">Backtest Notes</h2>
                  <div className="p-3 muted">
                    Keep Live parity enabled when comparing with managed-bot trades. It uses Upstox underlying candles,
                    Kite fallback option history, completed-candle timing, and the live entry gates.
                    <div className="mt-3">
                      Portfolio allocation across other running strategies and exact broker latency cannot be replayed
                      by a single-strategy backtest, so blocked live trades remain visible only in managed-bot logs.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {catalogError && (
          <div className="alert alert-danger" role="alert">
            {catalogError}
          </div>
        )}

        {backtestMessage && (
          <div className={`alert ${backtestMessageTone === "success" ? "alert-success" : "alert-danger"}`} role="alert">
            {backtestMessage}
          </div>
        )}

        {backtestResult && (
          <div className="row g-3 mb-4">
            {summaryCards.map((metric) => (
              <div className="col-sm-6 col-xl-3" key={metric.label}>
                <div className="metric-card p-3">
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-value">{metric.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {comparisonRows.length > 0 && (
          <section className="dashboard-panel mb-4" id="broker-comparison-results">
            <h2 className="panel-title">Broker Comparison</h2>
            <div className="p-3">
              <div className="table-responsive">
                <table className="table table-dark-shell align-middle">
                  <thead>
                    <tr>
                      <th>Broker</th>
                      <th>Fallback</th>
                      <th>Status</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>Total PnL</th>
                      <th>Avg PnL</th>
                      <th>Runtime</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => {
                      const summary = row.result?.summary;
                      return (
                        <tr key={row.broker}>
                          <td>{brokerLabel(row.broker)}</td>
                          <td>{brokerLabel(row.fallback_broker)}</td>
                          <td>{row.status === "ok" ? "OK" : "Error"}</td>
                          <td>{summary ? summary.trades : "-"}</td>
                          <td>{summary ? `${summary.win_rate}%` : "-"}</td>
                          <td>{summary ? fmtMoney(summary.total_pnl) : "-"}</td>
                          <td>{summary ? fmtMoney(summary.average_pnl) : "-"}</td>
                          <td>{fmtNumber(row.duration_ms)} ms</td>
                          <td className="small muted">{row.message}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className="dashboard-panel mb-4" id="backtest-results">
          <h2 className="panel-title">Backtest Results</h2>
          {!backtestResult && <div className="empty-state">Run a backtest to populate summary metrics and recent trades.</div>}
          {backtestResult && (
            <div className="p-3">
              <div className="small muted mb-2">Strategy: {backtestResult.strategy_label}</div>
              <div className="small muted mb-2">
                Data: {backtestResult.market_data_broker || backtestForm.market_data_broker}
                {backtestResult.fallback_broker ? ` -> ${backtestResult.fallback_broker}` : ""}
              </div>
              <div className="small muted mb-3">
                Showing the latest {fmtNumber(Math.min(backtestResult.trades.length, 20))} trades for{" "}
                {backtestResult.instrument_key} between {backtestResult.from_date} and {backtestResult.to_date}.
              </div>
              <div className="table-responsive">
                <table className="table table-dark-shell align-middle">
                  <thead>
                    <tr>
                      <th>Entry</th>
                      <th>Exit</th>
                      <th>Symbol</th>
                      <th>Expiry</th>
                      <th>Strike</th>
                      <th>Entry Opt</th>
                      <th>Exit Opt</th>
                      <th>Qty</th>
                      <th>PnL</th>
                      <th>Entry Reason</th>
                      <th>Reason</th>
                      <th>Loss Reason</th>
                      <th>Chart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backtestResult.trades.length ? (
                      backtestResult.trades.slice(0, 20).map((trade, index) => (
                        <tr key={`${trade.symbol}-${trade.entry_time}-${index}`}>
                          <td>{fmtDate(trade.entry_time)}</td>
                          <td>{fmtDate(trade.exit_time)}</td>
                          <td>{trade.symbol}</td>
                          <td>{trade.expiry}</td>
                          <td>{trade.strike}</td>
                          <td>{fmtMoney(trade.entry_option)}</td>
                          <td>{fmtMoney(trade.exit_option)}</td>
                          <td>{trade.quantity}</td>
                          <td className={pnlClass(trade.pnl_amount)}>
                            <strong>{fmtMoney(trade.pnl_amount)}</strong>
                          </td>
                          <td className="small muted" style={{ minWidth: 220 }}>
                            {trade.entry_reason || "-"}
                          </td>
                          <td>{trade.reason}</td>
                          <td className="small muted" style={{ minWidth: 260 }}>
                            {trade.loss_reason || "-"}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-info"
                              onClick={() => void handleOpenTradeChart(trade)}
                              title="Show entry/exit on the underlying Heikin-Ashi candles"
                            >
                              📈 Chart
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={13} className="empty-state">
                          No backtest trades generated.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-panel" id="backtest-log">
          <h2 className="panel-title">Backtest Log</h2>
          <div className="p-3">
            <div className="small muted mb-2">Shows captured entry and exit activity from the latest backtest run.</div>
            <pre className="mb-0 small" style={{ maxHeight: 320, overflow: "auto", whiteSpace: "pre-wrap" }}>
              {backtestLogs.length ? backtestLogs.join("\n") : "No backtest log captured yet."}
            </pre>
          </div>
        </section>
      </div>

      {chartOpen && backtestResult && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setChartOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 12,
              padding: 16,
              width: "min(1200px, 96vw)",
              maxHeight: "92vh",
              overflow: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 16 }}>
                Trade chart · {backtestResult.instrument_key}
              </h3>
              <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setChartOpen(false)}>
                Close
              </button>
            </div>
            {chartLoading && <div style={{ padding: 24, color: "#94a3b8" }}>Loading candles…</div>}
            {!chartLoading && chartError && (
              <div style={{ padding: 16, color: "#f87171" }}>{chartError}</div>
            )}
            {!chartLoading && !chartError && (
              <BacktestTradeChart
                candles={chartCandles}
                trades={backtestResult.trades}
                focusTime={chartFocusTime}
                instrumentName={backtestResult.instrument_key}
                modeLabel="Heikin Ashi"
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
