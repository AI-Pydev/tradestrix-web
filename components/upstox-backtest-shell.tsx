"use client";

import { useEffect, useState } from "react";

import {
  fetchInstrumentCatalog,
  InstrumentCatalogResponse,
  MarketDataBrokerId,
  runUpstoxOptionChainBacktest,
  UpstoxOptionChainBacktestRunRequest,
  UpstoxOptionChainBacktestRunResponse,
} from "@/lib/api";

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

function fmtNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function instrumentOptions(data: InstrumentCatalogResponse | null) {
  if (!data) {
    return { indices: [], stocks: [] };
  }
  return {
    indices: data.indices ?? [],
    stocks: data.stocks ?? [],
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
  { value: "nc_ha_call_entry", label: "NC HA CALL Entry" },
  { value: "auto_atm_otm_call", label: "Auto ATM-OTM CALL" },
  { value: "fibo_nk_call", label: "FIBO-NK CALL" },
  { value: "jk_oc_call", label: "JK OC CALL" },
  { value: "jk_oc_call_opt_int", label: "JK OC CALL OPT INT" },
  { value: "ol_oh_call", label: "OL-OH CALL" },
  { value: "momentum_call", label: "Momentum CALL" },
];

const PUT_STRATEGY_OPTIONS = [
  { value: "tv_ha_put_v2", label: "TV-HA PUT v2" },
  { value: "fibo_nk_put", label: "FIBO-NK PUT" },
  { value: "jk_ema_put", label: "JK EMA PUT" },
  { value: "ol_oh_put", label: "OL-OH PUT" },
  { value: "momentum_put", label: "Momentum PUT" },
];

const MARKET_DATA_BROKERS: { value: MarketDataBrokerId; label: string }[] = [
  { value: "dhan", label: "Dhan" },
  { value: "kite", label: "Kite" },
  { value: "upstox", label: "Upstox" },
];
const BACKTEST_INTERVAL_OPTIONS = [
  { value: "1", label: "1m" },
  { value: "3", label: "3m" },
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "25", label: "25m" },
  { value: "60", label: "60m" },
];
const DEFAULT_BACKTEST_MARKET_DATA_BROKER: MarketDataBrokerId = "dhan";
const DEFAULT_BACKTEST_FALLBACK_BROKER: MarketDataBrokerId = "kite";

function isMarketDataBrokerId(value: string | null | undefined): value is MarketDataBrokerId {
  return MARKET_DATA_BROKERS.some((option) => option.value === value);
}

function optionIntervalValue(value: string) {
  return `${value}minute`;
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
    underlying_interval: "5",
    option_interval: "1minute",
    current_option_unit: "minutes",
    current_option_interval: "1",
    strike_offset: 0,
    lots: 1,
    max_entry_ltp: 1000,
    sl_premium_pct: 0.35,
    target_premium_pct: 0.65,
    export_csv: "logs/upstox/tv_ha_call_option_backtest_api.csv",
  });
  const instruments = instrumentOptions(catalog);

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
        market_data_broker: marketDataBroker,
        fallback_broker: fallbackBroker,
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
            market_data_broker: broker,
            fallback_broker: fallbackBroker,
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
                          disabled={catalogLoading && instruments.indices.length === 0 && instruments.stocks.length === 0}
                        >
                          {catalogLoading && !instruments.indices.length && !instruments.stocks.length && (
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
                          {backtestForm.strategy_id === "nc_ha_call_entry"
                            ? "HA-based early-entry engine from NC-CALL-ENTRY.pine."
                            : "Classic TV-HA engine for the selected side."}
                        </div>
                      </div>
                      <div className="col-12 col-md-6 col-xl-3">
                        <label className="form-label">Market Data</label>
                        <select
                          className="form-select"
                          value={backtestForm.market_data_broker}
                          onChange={(e) => {
                            const broker = e.target.value as MarketDataBrokerId;
                            setBacktestForm((prev) => ({
                              ...prev,
                              market_data_broker: broker,
                              fallback_broker: prev.fallback_broker === broker ? null : prev.fallback_broker,
                            }));
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
                          {BACKTEST_INTERVAL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label">Option TF</label>
                        <select
                          className="form-select"
                          value={normalizeMinuteInterval(backtestForm.current_option_interval)}
                          onChange={(e) =>
                            setBacktestForm((prev) => ({
                              ...prev,
                              option_interval: optionIntervalValue(e.target.value),
                              current_option_unit: "minutes",
                              current_option_interval: e.target.value,
                            }))
                          }
                        >
                          {BACKTEST_INTERVAL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
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
                            : `Universe ready: ${instruments.indices.length} indices, ${instruments.stocks.length} stocks`}
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
                    Use this page to test Dhan-aware backtests. Select Dhan as Market Data, keep Kite as fallback, then
                    run the backtest and check the Logs section for `BACKTEST_START` and `BACKTEST_COMPLETE`.
                    <div className="mt-3">
                      Dhan intraday candles support 1m, 5m, 15m, 25m, and 60m intervals. Wider intervals can reduce
                      signal count, so zero P/L often means no entries matched the strategy at that timeframe.
                    </div>
                    <div className="mt-3">
                      `NC HA CALL Entry` keeps the underlying scan on Heikin Ashi candles and adds the newer
                      early-entry path from your NC Pine script.
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
                      <th>Reason</th>
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
                          <td>{fmtMoney(trade.pnl_amount)}</td>
                          <td>{trade.reason}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="empty-state">
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
    </main>
  );
}
