"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

import {
    DashboardSnapshot,
    fetchDashboardData,
    fetchUpstoxManagedBotJobs,
    fetchUpstoxManagedBotTrades,
    InstrumentCatalogResponse,
    previewUpstoxOptionChainBot,
    runUpstoxOptionChainBot,
    squareOffUpstoxManagedBot,
    startUpstoxManagedBot,
    stopUpstoxManagedBot,
    TradeRecord,
    UpstoxManagedBotJob,
    UpstoxManagedBotStartRequest,
    UpstoxManagedBotTrade,
    UpstoxOptionChainBotPreviewResponse,
    UpstoxOptionChainBotRunRequest,
} from "@/lib/api";


type DashboardState = {
  dashboard: DashboardSnapshot;
  trades: TradeRecord[];
  instruments: InstrumentCatalogResponse;
};

type ManagedJobsView = "today" | "history";
type ManagedJobsHistoryPreset = "yesterday" | "last7" | "last30" | "custom";

function executionMetricTone(label: string, value: number) {
  if ((label === "Active Jobs" || label === "Open Bot Trades") && value > 0) {
    return "positive";
  }
  if ((label === "Today Realized P/L" || label === "Fleet Realized P/L") && value > 0) {
    return "positive";
  }
  if (label === "Gross Profit" && value > 0) {
    return "positive";
  }
  if (label === "Gross Loss" && value > 0) {
    return "negative";
  }
  if ((label === "Today Realized P/L" || label === "Fleet Realized P/L") && value < 0) {
    return "negative";
  }
  return "";
}


function fmtDate(value: string) {
  return new Date(value).toLocaleString();
}


function fmtNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}


function fmtMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function botJobTone(status: string) {
  if (status === "running" || status === "completed") {
    return "green";
  }
  if (status === "starting" || status === "stopping") {
    return "gold";
  }
  if (status === "failed") {
    return "red";
  }
  return "blue";
}

function pnlTone(value?: number | null) {
  if (value == null) {
    return "blue";
  }
  if (value > 0) {
    return "green";
  }
  if (value < 0) {
    return "red";
  }
  return "blue";
}

function instrumentOptions(data: DashboardState | null) {
  if (!data) {
    return { indices: [], stocks: [] };
  }
  return {
    indices: data.instruments?.indices ?? [],
    stocks: data.instruments?.stocks ?? [],
  };
}

function findInstrumentByKey(data: DashboardState | null, instrumentKey: string) {
  const options = instrumentOptions(data);
  return [...options.indices, ...options.stocks].find((item) => item.instrument_key === instrumentKey) ?? null;
}

function instrumentLabel(item: { label: string; verified: boolean }) {
  return item.verified ? item.label : `${item.label} (unverified)`;
}

type BotSide = "call" | "put";

const CALL_STRATEGY_OPTIONS = [
  { value: "tv_ha_call_v2", label: "TV-HA CALL v2" },
  { value: "nc_ha_call_entry", label: "NC HA CALL Entry" },
  { value: "fibo_nk_call", label: "FIBO-NK CALL" },
  { value: "ol_oh_call", label: "OL-OH CALL" },
];

const PUT_STRATEGY_OPTIONS = [
  { value: "tv_ha_put_v2", label: "TV-HA PUT v2" },
  { value: "fibo_nk_put", label: "FIBO-NK PUT" },
  { value: "ol_oh_put", label: "OL-OH PUT" },
];

function defaultStrategyIdForSide(side: BotSide) {
  return side === "put" ? "tv_ha_put_v2" : "tv_ha_call_v2";
}

function strategyOptionsForSide(side: BotSide) {
  return side === "put" ? PUT_STRATEGY_OPTIONS : CALL_STRATEGY_OPTIONS;
}

function supportsStrategy(side: BotSide, strategyId: string) {
  return strategyOptionsForSide(side).some((option) => option.value === strategyId);
}

function parseIsoDate(value?: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftLocalDate(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function managedBotStartedKey(job: UpstoxManagedBotJob) {
  const startedAt = parseIsoDate(job.started_at);
  return startedAt ? localDateKey(startedAt) : "";
}

function managedBotIsLive(job: UpstoxManagedBotJob) {
  return job.status === "starting" || job.status === "running" || job.status === "stopping" || job.has_open_trade;
}

function matchesManagedBotTodayDesk(job: UpstoxManagedBotJob, todayKey: string) {
  if (managedBotIsLive(job)) {
    return true;
  }
  return managedBotStartedKey(job) === todayKey;
}

function withinInclusiveDateRange(valueKey: string, startKey?: string, endKey?: string) {
  if (!valueKey) {
    return false;
  }
  if (startKey && valueKey < startKey) {
    return false;
  }
  if (endKey && valueKey > endKey) {
    return false;
  }
  return true;
}

function matchesManagedBotHistoryWindow(
  job: UpstoxManagedBotJob,
  preset: ManagedJobsHistoryPreset,
  customFrom: string,
  customTo: string,
) {
  const startedKey = managedBotStartedKey(job);
  if (!startedKey) {
    return false;
  }

  const now = new Date();
  const yesterdayKey = localDateKey(shiftLocalDate(now, -1));
  const last7StartKey = localDateKey(shiftLocalDate(now, -7));
  const last30StartKey = localDateKey(shiftLocalDate(now, -30));

  if (preset === "yesterday") {
    return withinInclusiveDateRange(startedKey, yesterdayKey, yesterdayKey);
  }
  if (preset === "last7") {
    return withinInclusiveDateRange(startedKey, last7StartKey, yesterdayKey);
  }
  if (preset === "last30") {
    return withinInclusiveDateRange(startedKey, last30StartKey, yesterdayKey);
  }
  return withinInclusiveDateRange(startedKey, customFrom || undefined, customTo || undefined);
}

function managedBotSortTime(job: UpstoxManagedBotJob) {
  return parseIsoDate(job.started_at)?.getTime() ?? 0;
}

function compareManagedBotsByStartedDesc(a: UpstoxManagedBotJob, b: UpstoxManagedBotJob) {
  return managedBotSortTime(b) - managedBotSortTime(a);
}

function compareManagedBotsForTodayDesk(a: UpstoxManagedBotJob, b: UpstoxManagedBotJob) {
  const liveDelta = Number(managedBotIsLive(b)) - Number(managedBotIsLive(a));
  if (liveDelta !== 0) {
    return liveDelta;
  }
  return compareManagedBotsByStartedDesc(a, b);
}

export function DashboardShell() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [botRunning, setBotRunning] = useState(false);
  const [botMessage, setBotMessage] = useState<string>("");
  const [botMessageTone, setBotMessageTone] = useState<"success" | "error">("success");
  const [botLogs, setBotLogs] = useState<string[]>([]);
  const [botPreview, setBotPreview] = useState<UpstoxOptionChainBotPreviewResponse | null>(null);
  const [previewRunning, setPreviewRunning] = useState(false);
  const [managedJobName, setManagedJobName] = useState("");
  const [managedAutoStorePath, setManagedAutoStorePath] = useState(true);
  const [managedBots, setManagedBots] = useState<UpstoxManagedBotJob[]>([]);
  const [managedBotsLoading, setManagedBotsLoading] = useState(true);
  const [managedBotAction, setManagedBotAction] = useState<string>("");
  const [expandedBotJobId, setExpandedBotJobId] = useState<string>("");
  const [managedBotTradesJob, setManagedBotTradesJob] = useState<UpstoxManagedBotJob | null>(null);
  const [managedBotTrades, setManagedBotTrades] = useState<UpstoxManagedBotTrade[]>([]);
  const [managedBotTradesLoading, setManagedBotTradesLoading] = useState(false);
  const [managedBotTradesError, setManagedBotTradesError] = useState("");
  const [managedJobsView, setManagedJobsView] = useState<ManagedJobsView>("today");
  const [managedJobsHistoryPreset, setManagedJobsHistoryPreset] = useState<ManagedJobsHistoryPreset>("last7");
  const [managedJobsHistoryFrom, setManagedJobsHistoryFrom] = useState("");
  const [managedJobsHistoryTo, setManagedJobsHistoryTo] = useState("");
  const [managedJobsStrategyFilter, setManagedJobsStrategyFilter] = useState("all");
  const [botForm, setBotForm] = useState<UpstoxOptionChainBotRunRequest>({
    instrument_key: "NSE_INDEX|Nifty 50",
    expiry: "",
    market_data_broker: "upstox",
    fallback_broker: "kite",
    force_fallback_for_test: false,
    side: "call",
    strategy_id: "tv_ha_call_v2",
    candle_unit: "minutes",
    candle_interval: "3",
    strike_offset: 0,
    use_greek_selection: true,
    max_entry_ltp: 1000,
    risk_model: "dynamic",
    risk_amount: null,
    use_time_windows: true,
    sl_premium_pct: 0.2,
    target_premium_pct: 0.36,
    min_hold_sec_before_underlying_exit: 60,
    entry_interval_sec: 60,
    exit_interval_sec: 15,
    lots: 1,
    lot_size: 65,
    market_open: "09:18",
    entry_cutoff: "15:20",
    time_exit: "15:21",
    store_path: "logs/upstox/tv_ha_call_option_chain_api.db",
    max_cycles: null,
    once: true,
  });
  const instruments = instrumentOptions(data);
  const selectedInstrument = findInstrumentByKey(data, botForm.instrument_key);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const result = await fetchDashboardData();
        if (!active) {
          return;
        }
        setData(result);
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load execution desk");
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
    let active = true;

    async function loadManagedBots() {
      try {
        const result = await fetchUpstoxManagedBotJobs();
        if (!active) {
          return;
        }
        setManagedBots(result);
      } catch (err) {
        if (!active) {
          return;
        }
        setBotMessage(err instanceof Error ? err.message : "Failed to load managed bot jobs");
        setBotMessageTone("error");
      } finally {
        if (active) {
          setManagedBotsLoading(false);
        }
      }
    }

    loadManagedBots();
    const intervalId = window.setInterval(loadManagedBots, 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleRunUpstoxBot() {
    try {
      setBotRunning(true);
      const payload: UpstoxOptionChainBotRunRequest = {
        ...botForm,
        expiry: botForm.expiry?.trim() ? botForm.expiry.trim() : null,
      };
      const result = await runUpstoxOptionChainBot(payload);
      setBotMessage(result.message);
      setBotMessageTone("success");
      setBotLogs(result.logs ?? []);
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to run Upstox option-chain bot");
      setBotMessageTone("error");
      setBotLogs([]);
    } finally {
      setBotRunning(false);
    }
  }

  async function handleStartManagedBot() {
    try {
      setManagedBotAction("start");
      const payload: UpstoxManagedBotStartRequest = {
        job_name: managedJobName.trim() || null,
        auto_store_path: managedAutoStorePath,
        instrument_key: botForm.instrument_key,
        expiry: botForm.expiry?.trim() ? botForm.expiry.trim() : null,
        market_data_broker: botForm.market_data_broker,
        fallback_broker: botForm.fallback_broker ?? null,
        force_fallback_for_test: botForm.force_fallback_for_test,
        side: botForm.side,
        strategy_id: botForm.strategy_id,
        candle_unit: botForm.candle_unit,
        candle_interval: botForm.candle_interval,
        strike_offset: botForm.strike_offset,
        use_greek_selection: botForm.use_greek_selection,
        max_entry_ltp: botForm.max_entry_ltp,
        risk_model: botForm.risk_model,
        risk_amount: botForm.risk_amount ?? null,
        use_time_windows: botForm.use_time_windows,
        sl_premium_pct: botForm.sl_premium_pct,
        target_premium_pct: botForm.target_premium_pct,
        min_hold_sec_before_underlying_exit: botForm.min_hold_sec_before_underlying_exit,
        entry_interval_sec: botForm.entry_interval_sec,
        exit_interval_sec: botForm.exit_interval_sec,
        lots: botForm.lots,
        lot_size: botForm.lot_size,
        market_open: botForm.market_open,
        entry_cutoff: botForm.entry_cutoff,
        time_exit: botForm.time_exit,
        store_path: botForm.store_path,
        max_cycles: botForm.max_cycles ?? null,
        once: false,
      };
      const result = await startUpstoxManagedBot(payload);
      setBotMessage(`Managed bot started: ${result.job_name} (${result.job_id})`);
      setBotMessageTone("success");
      setManagedJobName("");
      setManagedBots(await fetchUpstoxManagedBotJobs());
      setExpandedBotJobId(result.job_id);
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to start managed bot");
      setBotMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  async function handleStopManagedBot(jobId: string) {
    try {
      setManagedBotAction(`stop:${jobId}`);
      const result = await stopUpstoxManagedBot(jobId);
      setBotMessage(`Managed bot stop requested: ${result.job_name} (${result.job_id})`);
      setBotMessageTone("success");
      setManagedBots(await fetchUpstoxManagedBotJobs());
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to stop managed bot");
      setBotMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  async function handleSquareOffManagedBot(jobId: string) {
    try {
      setManagedBotAction(`square:${jobId}`);
      const result = await squareOffUpstoxManagedBot(jobId);
      setBotMessage(
        `Trade squared off for ${result.job_name} (${result.job_id}) at ${result.current_option_ltp ?? "latest quote"}.`,
      );
      setBotMessageTone("success");
      setManagedBots(await fetchUpstoxManagedBotJobs());
      setExpandedBotJobId(jobId);
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to square off managed bot trade");
      setBotMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  async function handleOpenManagedBotTrades(job: UpstoxManagedBotJob) {
    try {
      setManagedBotTradesError("");
      setManagedBotTradesJob(job);
      setManagedBotTradesLoading(true);
      setManagedBotTrades([]);
      const rows = await fetchUpstoxManagedBotTrades(job.job_id, 120);
      setManagedBotTrades(rows);
    } catch (err) {
      setManagedBotTradesError(err instanceof Error ? err.message : "Failed to load managed bot trades");
    } finally {
      setManagedBotTradesLoading(false);
    }
  }

  function closeManagedBotTrades() {
    setManagedBotTradesJob(null);
    setManagedBotTrades([]);
    setManagedBotTradesLoading(false);
    setManagedBotTradesError("");
  }

  async function handlePreviewUpstoxBot() {
    try {
      setPreviewRunning(true);
      const payload: UpstoxOptionChainBotRunRequest = {
        ...botForm,
        expiry: botForm.expiry?.trim() ? botForm.expiry.trim() : null,
      };
      const result = await previewUpstoxOptionChainBot(payload);
      setBotPreview(result);
      setBotMessage(result.message);
      setBotMessageTone("success");
    } catch (err) {
      setBotPreview(null);
      setBotMessage(err instanceof Error ? err.message : "Failed to preview Upstox option-chain bot");
      setBotMessageTone("error");
    } finally {
      setPreviewRunning(false);
    }
  }

  const activeManagedBots = managedBots.filter((job) =>
    job.status === "starting" || job.status === "running" || job.status === "stopping",
  ).length;
  const openManagedTrades = managedBots.filter((job) => job.has_open_trade).length;
  const totalManagedInvestment = managedBots.reduce(
    (sum, job) =>
      sum + (job.has_open_trade ? Number(job.open_trade_entry_ltp || 0) * Number(job.open_trade_quantity || 0) : 0),
    0,
  );
  const grossProfit = managedBots.reduce((sum, job) => {
    const total = Number(job.total_realized_pnl || 0) + Number(job.unrealized_pnl_amount || 0);
    return total > 0 ? sum + total : sum;
  }, 0);
  const grossLoss = managedBots.reduce((sum, job) => {
    const total = Number(job.total_realized_pnl || 0) + Number(job.unrealized_pnl_amount || 0);
    return total < 0 ? sum + Math.abs(total) : sum;
  }, 0);
  const todayRealizedPnl = managedBots.reduce((sum, job) => sum + Number(job.today_realized_pnl || 0), 0);
  const fleetRealizedPnl = managedBots.reduce((sum, job) => sum + job.total_realized_pnl, 0);
  const trackedExecutionSymbols = instruments.indices.length + instruments.stocks.length;
  const todayKey = localDateKey(new Date());
  const todayManagedBots = managedBots
    .filter((job) => matchesManagedBotTodayDesk(job, todayKey))
    .sort(compareManagedBotsForTodayDesk);
  const allHistoricalManagedBots = managedBots
    .filter((job) => !matchesManagedBotTodayDesk(job, todayKey))
    .sort(compareManagedBotsByStartedDesc);
  const historicalManagedBots = allHistoricalManagedBots
    .filter((job) =>
      matchesManagedBotHistoryWindow(
        job,
        managedJobsHistoryPreset,
        managedJobsHistoryFrom,
        managedJobsHistoryTo,
      ),
    )
    .sort(compareManagedBotsByStartedDesc);
  const managedJobsStrategyOptions = Array.from(
    new Map(
      managedBots.map((job) => [job.strategy_id, job.strategy_label || job.strategy_id]),
    ).entries(),
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const managedBotMatchesStrategy = (job: UpstoxManagedBotJob) =>
    managedJobsStrategyFilter === "all" || job.strategy_id === managedJobsStrategyFilter;
  const filteredTodayManagedBots = todayManagedBots.filter(managedBotMatchesStrategy);
  const filteredAllHistoricalManagedBots = allHistoricalManagedBots.filter(managedBotMatchesStrategy);
  const filteredHistoricalManagedBots = historicalManagedBots.filter(managedBotMatchesStrategy);
  const visibleManagedBots = managedJobsView === "today" ? filteredTodayManagedBots : filteredHistoricalManagedBots;
  const todayStartedManagedBots = filteredTodayManagedBots.filter((job) => managedBotStartedKey(job) === todayKey).length;
  const carryForwardManagedBots = filteredTodayManagedBots.filter(
    (job) => managedBotIsLive(job) && managedBotStartedKey(job) !== todayKey,
  ).length;
  const visibleManagedRealizedPnl = visibleManagedBots.reduce((sum, job) => sum + Number(job.total_realized_pnl || 0), 0);
  const visibleManagedTotalPnl = visibleManagedBots.reduce(
    (sum, job) => sum + Number(job.total_realized_pnl || 0) + Number(job.unrealized_pnl_amount || 0),
    0,
  );
  const visibleManagedTotalLoss = visibleManagedBots.reduce((sum, job) => {
    const total = Number(job.total_realized_pnl || 0) + Number(job.unrealized_pnl_amount || 0);
    return total < 0 ? sum + Math.abs(total) : sum;
  }, 0);
  const executionMetrics: Array<{ label: string; value: number; display: string }> = [
    { label: "Managed Jobs", value: managedBots.length, display: String(managedBots.length) },
    { label: "Active Jobs", value: activeManagedBots, display: String(activeManagedBots) },
    { label: "Open Bot Trades", value: openManagedTrades, display: String(openManagedTrades) },
    { label: "Total Investment", value: totalManagedInvestment, display: fmtMoney(totalManagedInvestment) },
    { label: "Today Realized P/L", value: todayRealizedPnl, display: fmtMoney(todayRealizedPnl) },
    { label: "Gross Profit", value: grossProfit, display: fmtMoney(grossProfit) },
    { label: "Gross Loss", value: grossLoss, display: fmtMoney(grossLoss) },
    { label: "Fleet Realized P/L", value: fleetRealizedPnl, display: fmtMoney(fleetRealizedPnl) },
    { label: "Tradable Symbols", value: trackedExecutionSymbols, display: String(trackedExecutionSymbols) },
  ];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="dashboard-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#dashboard-top">
              Overview
            </a>
            <a className="hero-tab" href="#bot-control-panel">
              Bot Control
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Execution Desk</h1>
            <p className="hero-subtitle">
              Focused surface for launching option-chain bots and reviewing managed jobs. Platform summary counters now
              live on Platform Home.
            </p>
          </div>
          <div className="p-3">
            {(loading || managedBotsLoading) && <div className="muted">Loading execution desk...</div>}
            {error && <div className="alert alert-danger mb-0">{error}</div>}
            {!error && !loading && !managedBotsLoading && (
              <>
                <div className="row g-3">
                  {executionMetrics.map((metric) => (
                    <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={metric.label}>
                      <div className={`metric-card ${executionMetricTone(metric.label, metric.value)} p-3`}>
                        <div className="metric-label">{metric.label}</div>
                        <div className="metric-value mt-2">{metric.display}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <div className="row g-4">
          <div className="col-12">
            <section className="dashboard-panel mb-4" id="bot-control-panel">
              <h2 className="panel-title">Upstox Option Chain Bot</h2>
              <div className="p-3">
                {botMessage && (
                  <div className={`alert ${botMessageTone === "success" ? "alert-success" : "alert-danger"}`}>
                    {botMessage}
                  </div>
                )}
                <div className="row g-3 dashboard-bot-form-grid">
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Instrument Key</label>
                    <select
                      className="form-select"
                      value={botForm.instrument_key}
                      onChange={(e) => {
                        const nextInstrumentKey = e.target.value;
                        const nextInstrument = findInstrumentByKey(data, nextInstrumentKey);
                        setBotForm((prev) => ({
                          ...prev,
                          instrument_key: nextInstrumentKey,
                          lot_size: nextInstrument?.lot_size ?? prev.lot_size,
                        }));
                      }}
                      disabled={instruments.indices.length === 0 && instruments.stocks.length === 0 && !data}
                    >
                      {!data && !instruments.indices.length && !instruments.stocks.length && (
                        <option value={botForm.instrument_key}>Loading instruments...</option>
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
                      value={botForm.side}
                      onChange={(e) => {
                        const side = e.target.value as BotSide;
                        setBotForm((prev) => ({
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
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Strategy</label>
                    <select
                      className="form-select"
                      value={botForm.strategy_id}
                      onChange={(e) => setBotForm((prev) => ({ ...prev, strategy_id: e.target.value }))}
                    >
                      {strategyOptionsForSide(botForm.side).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="small muted mt-1">
                      {botForm.strategy_id === "nc_ha_call_entry"
                        ? "HA-based early-entry engine from NC-CALL-ENTRY.pine."
                        : "Classic TV-HA engine for the selected side."}
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Data Broker</label>
                    <select
                      className="form-select"
                      value={botForm.market_data_broker}
                      onChange={(e) =>
                        setBotForm((prev) => {
                          const marketDataBroker = e.target.value as "upstox" | "kite";
                          const fallbackBroker =
                            prev.fallback_broker === marketDataBroker ? null : prev.fallback_broker;
                          return {
                            ...prev,
                            market_data_broker: marketDataBroker,
                            fallback_broker: fallbackBroker,
                          };
                        })
                      }
                    >
                      <option value="upstox">Upstox</option>
                      <option value="kite">Kite</option>
                    </select>
                    <div className="small muted mt-1">Kotak Neo stays the execution broker.</div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Fallback Broker</label>
                    <select
                      className="form-select"
                      value={botForm.fallback_broker ?? ""}
                      onChange={(e) =>
                        setBotForm((prev) => ({
                          ...prev,
                          fallback_broker: e.target.value
                            ? (e.target.value as "upstox" | "kite")
                            : null,
                        }))
                      }
                    >
                      <option value="">None</option>
                      <option value="upstox" disabled={botForm.market_data_broker === "upstox"}>
                        Upstox
                      </option>
                      <option value="kite" disabled={botForm.market_data_broker === "kite"}>
                        Kite
                      </option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6 col-xl-2 d-flex align-items-end">
                    <div className="form-check mb-2">
                      <input
                        checked={botForm.force_fallback_for_test}
                        className="form-check-input"
                        id="bot-force-fallback-for-test"
                        onChange={(e) =>
                          setBotForm((prev) => ({ ...prev, force_fallback_for_test: e.target.checked }))
                        }
                        type="checkbox"
                      />
                      <label className="form-check-label" htmlFor="bot-force-fallback-for-test">
                        Force Fallback Test
                        <div className="small text-muted">Skips the primary data broker once to test failover.</div>
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Candle Interval</label>
                    <input
                      className="form-control"
                      value={botForm.candle_interval}
                      onChange={(e) => setBotForm((prev) => ({ ...prev, candle_interval: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Strike Offset</label>
                    <input
                      className="form-control"
                      type="number"
                      value={botForm.strike_offset}
                      onChange={(e) =>
                        setBotForm((prev) => ({ ...prev, strike_offset: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Max Entry LTP</label>
                    <input
                      className="form-control"
                      type="number"
                      value={botForm.max_entry_ltp}
                      onChange={(e) =>
                        setBotForm((prev) => ({ ...prev, max_entry_ltp: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <div className="form-check mt-4 pt-2">
                      <input
                        checked={botForm.use_greek_selection}
                        className="form-check-input"
                        id="bot-use-greek-selection"
                        onChange={(e) =>
                          setBotForm((prev) => ({ ...prev, use_greek_selection: e.target.checked }))
                        }
                        type="checkbox"
                      />
                      <label className="form-check-label" htmlFor="bot-use-greek-selection">
                        Use Greek Selection
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Expiry</label>
                    <input
                      className="form-control"
                      placeholder="YYYY-MM-DD"
                      value={botForm.expiry ?? ""}
                      onChange={(e) => setBotForm((prev) => ({ ...prev, expiry: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Risk Model</label>
                    <select
                      className="form-select"
                      value={botForm.risk_model}
                      onChange={(e) =>
                        setBotForm((prev) => ({ ...prev, risk_model: e.target.value as "dynamic" | "fixed" | "risk_amount" }))
                      }
                    >
                      <option value="dynamic">Dynamic</option>
                      <option value="fixed">Fixed %</option>
                      <option value="risk_amount">Risk Amount (₹)</option>
                    </select>
                  </div>
                  {botForm.risk_model === "risk_amount" && (
                    <div className="col-12 col-md-6 col-xl-2">
                      <label className="form-label">Risk Amount (₹)</label>
                      <input
                        className="form-control"
                        type="number"
                        min={1}
                        placeholder="e.g. 1000"
                        value={botForm.risk_amount ?? ""}
                        onChange={(e) =>
                          setBotForm((prev) => ({ ...prev, risk_amount: e.target.value ? Number(e.target.value) : null }))
                        }
                      />
                      <div className="small muted mt-1">
                        SL = {botForm.risk_amount && botForm.lots && botForm.lot_size
                          ? `${(botForm.risk_amount / (botForm.lots * botForm.lot_size)).toFixed(2)} pts`
                          : "—"}
                      </div>
                    </div>
                  )}
                  <div className="col-12 col-md-6 col-xl-2 d-flex align-items-end">
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="useTimeWindowsDash"
                        checked={botForm.use_time_windows}
                        onChange={(e) => setBotForm((prev) => ({ ...prev, use_time_windows: e.target.checked }))}
                      />
                      <label className="form-check-label" htmlFor="useTimeWindowsDash">
                        Time Windows
                        <div className="small text-muted">ORB / FII / MOM · EOD 15:30</div>
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Lots</label>
                    <input
                      className="form-control"
                      type="number"
                      value={botForm.lots}
                      onChange={(e) => setBotForm((prev) => ({ ...prev, lots: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Lot Size</label>
                    <input
                      className="form-control"
                      type="number"
                      value={botForm.lot_size}
                      onChange={(e) => setBotForm((prev) => ({ ...prev, lot_size: Number(e.target.value) || 1 }))}
                    />
                    {selectedInstrument?.lot_size ? (
                      <div className="small muted mt-1">Detected lot size: {fmtNumber(selectedInstrument.lot_size)}</div>
                    ) : null}
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Max Cycles</label>
                    <input
                      className="form-control"
                      type="number"
                      min={1}
                      placeholder="Unlimited"
                      value={botForm.max_cycles ?? ""}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        setBotForm((prev) => ({
                          ...prev,
                          max_cycles: value ? Math.max(1, Number(value) || 1) : null,
                        }));
                      }}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Store Path</label>
                    <input
                      className="form-control"
                      value={botForm.store_path}
                      onChange={(e) => setBotForm((prev) => ({ ...prev, store_path: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Managed Job Name</label>
                    <input
                      className="form-control"
                      placeholder="Optional"
                      value={managedJobName}
                      onChange={(e) => setManagedJobName(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2 d-flex align-items-end">
                    <div className="form-check mb-2">
                      <input
                        checked={managedAutoStorePath}
                        className="form-check-input"
                        id="managed-auto-store-path"
                        onChange={(e) => setManagedAutoStorePath(e.target.checked)}
                        type="checkbox"
                      />
                      <label className="form-check-label small" htmlFor="managed-auto-store-path">
                        Auto DB
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-xl-6 d-flex align-items-end">
                    <div className="dashboard-bot-actions w-100">
                      <Link className="btn btn-outline-light w-100" href="/upstox-backtest">
                        Open Backtest Tab
                      </Link>
                      <button className="btn btn-outline-light w-100" disabled={previewRunning} onClick={handlePreviewUpstoxBot}>
                        {previewRunning ? "Previewing..." : "Preview Strategy"}
                      </button>
                      <button className="btn btn-warning w-100" disabled={botRunning} onClick={handleRunUpstoxBot}>
                        {botRunning ? "Running..." : "Run Bot Cycle"}
                      </button>
                      <button
                        className="btn btn-outline-warning w-100"
                        disabled={managedBotAction === "start"}
                        onClick={handleStartManagedBot}
                      >
                        {managedBotAction === "start" ? "Starting..." : "Start Managed Bot"}
                      </button>
                    </div>
                  </div>
                </div>
                {botPreview && (
                  <div className="mt-4 border rounded p-3" style={{ borderColor: "var(--line)" }}>
                    <div className="fw-semibold mb-2">Strategy Preview</div>
                    <div className="small muted mb-2">Strategy: {botPreview.strategy_label}</div>
                    <div className="small muted mb-2">Resolved expiry: {botPreview.resolved_expiry ?? "Not resolved"}</div>
                    <div className="small muted mb-3">Open trade present: {botPreview.has_open_trade ? "Yes" : "No"}</div>
                    {botPreview.signal && (
                      <div className="mb-3">
                        <div className="fw-semibold small mb-2">Latest signal snapshot</div>
                        <pre className="mb-0 small">{JSON.stringify(botPreview.signal, null, 2)}</pre>
                      </div>
                    )}
                    {botPreview.candidate && (
                      <div>
                        <div className="fw-semibold small mb-2">Selected option candidate</div>
                        <pre className="mb-0 small">{JSON.stringify(botPreview.candidate, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4 border rounded p-3" style={{ borderColor: "var(--line)" }}>
                  <div className="fw-semibold mb-2">Live Bot Log</div>
                  <div className="small muted mb-2">Shows output captured from the latest bot cycle run inside FastAPI.</div>
                  <pre className="mb-0 small" style={{ maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap" }}>
                    {botLogs.length ? botLogs.join("\n") : "No bot log captured yet."}
                  </pre>
                </div>
                <div className="mt-4 border rounded p-3" style={{ borderColor: "var(--line)" }}>
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                    <div>
                      <div className="fw-semibold">Managed Bot Fleet</div>
                      <div className="small muted">
                        Table overview for all managed bots, with live P&L and manual square-off for open trades.
                        Square Off exits the current position only. Use Stop as well if you do not want re-entry.
                      </div>
                    </div>
                    <div className="small muted align-self-center">
                      {managedAutoStorePath
                        ? "Managed starts generate a unique DB automatically."
                        : "Managed starts will use the exact Store Path from the form."}
                    </div>
                  </div>
                  <div className="execution-jobs-view-switcher mb-3">
                    <button
                      className={`execution-jobs-view-tab ${managedJobsView === "today" ? "active" : ""}`}
                      onClick={() => setManagedJobsView("today")}
                      type="button"
                    >
                      <span>Today</span>
                      <strong>{filteredTodayManagedBots.length}</strong>
                    </button>
                    <button
                      className={`execution-jobs-view-tab ${managedJobsView === "history" ? "active" : ""}`}
                      onClick={() => setManagedJobsView("history")}
                      type="button"
                    >
                      <span>History</span>
                      <strong>{filteredAllHistoricalManagedBots.length}</strong>
                    </button>
                  </div>
                  <div className="execution-jobs-toolbar mb-3">
                    <div>
                      <div className="fw-semibold">
                        {managedJobsView === "today" ? "Today execution queue" : "Historical job archive"}
                      </div>
                      <div className="small muted">
                        {managedJobsView === "today"
                          ? "Today keeps jobs started today, plus live carry-forward bots from earlier sessions."
                          : "History filters use each job's start date so the desk stays operationally clean."}
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {managedJobsView === "today" ? (
                          <>
                            <span className="badge-soft blue">Started today {todayStartedManagedBots}</span>
                            <span className="badge-soft gold">Carry-forward live {carryForwardManagedBots}</span>
                          </>
                        ) : (
                          <span className="badge-soft blue">
                            Showing {filteredHistoricalManagedBots.length} of {filteredAllHistoricalManagedBots.length} older jobs
                          </span>
                        )}
                        <span className={`badge-soft ${pnlTone(visibleManagedRealizedPnl)}`}>
                          Realized P/L {fmtMoney(visibleManagedRealizedPnl)}
                        </span>
                        <span className={`badge-soft ${pnlTone(visibleManagedTotalPnl)}`}>
                          Total P/L {fmtMoney(visibleManagedTotalPnl)}
                        </span>
                        <span className={`badge-soft ${visibleManagedTotalLoss > 0 ? "red" : "blue"}`}>
                          Total Loss {fmtMoney(visibleManagedTotalLoss)}
                        </span>
                      </div>
                    </div>
                    <div className="execution-jobs-filter-shell">
                      <label className="execution-jobs-filter-field">
                        <span>Strategy</span>
                        <select
                          className="execution-jobs-filter-input"
                          onChange={(e) => setManagedJobsStrategyFilter(e.target.value)}
                          value={managedJobsStrategyFilter}
                        >
                          <option value="all">All strategies</option>
                          {managedJobsStrategyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {managedJobsView === "history" && (
                        <div className="execution-jobs-filter-pills">
                          {[
                            { value: "yesterday", label: "Yesterday" },
                            { value: "last7", label: "Last 7 Days" },
                            { value: "last30", label: "Last 30 Days" },
                            { value: "custom", label: "Custom Range" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              className={`execution-jobs-filter-pill ${
                                managedJobsHistoryPreset === option.value ? "active" : ""
                              }`}
                              onClick={() =>
                                setManagedJobsHistoryPreset(option.value as ManagedJobsHistoryPreset)
                              }
                              type="button"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {managedJobsView === "history" && managedJobsHistoryPreset === "custom" && (
                          <div className="execution-jobs-filter-grid">
                            <label className="execution-jobs-filter-field">
                              <span>From</span>
                              <input
                                className="execution-jobs-filter-input"
                                max={managedJobsHistoryTo || undefined}
                                onChange={(e) => setManagedJobsHistoryFrom(e.target.value)}
                                type="date"
                                value={managedJobsHistoryFrom}
                              />
                            </label>
                            <label className="execution-jobs-filter-field">
                              <span>To</span>
                              <input
                                className="execution-jobs-filter-input"
                                min={managedJobsHistoryFrom || undefined}
                                onChange={(e) => setManagedJobsHistoryTo(e.target.value)}
                                type="date"
                                value={managedJobsHistoryTo}
                              />
                            </label>
                          </div>
                      )}
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-dark-shell align-middle">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Job</th>
                          <th>Instrument</th>
                          <th>Store</th>
                          <th>Open Trade</th>
                          <th>LTP / P&amp;L</th>
                          <th>Started</th>
                          <th>Last Log</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managedBotsLoading ? (
                          <tr>
                            <td colSpan={9} className="empty-state">
                              Loading managed bot jobs...
                            </td>
                          </tr>
                        ) : visibleManagedBots.length ? (
                          visibleManagedBots.map((job) => (
                            <Fragment key={job.job_id}>
                              <tr>
                                <td>
                                  <span className={`badge-soft ${botJobTone(job.status)}`}>{job.status}</span>
                                </td>
                                <td>
                                  <div className="fw-semibold">{job.job_name}</div>
                                  <div className="muted small">{job.strategy_label}</div>
                                  <div className="muted small">{job.job_id}</div>
                                </td>
                                <td>
                                  <div>{job.instrument_key}</div>
                                  <div className="muted small">
                                    {job.side.toUpperCase()} | PID {job.pid ?? "-"}
                                  </div>
                                </td>
                                <td>
                                  <div className="small">{job.store_path}</div>
                                  <div className="muted small">
                                    <button
                                      className="dashboard-trades-link"
                                      onClick={() => handleOpenManagedBotTrades(job)}
                                      type="button"
                                    >
                                      Trades {job.trade_count} | Closed {job.closed_trade_count}
                                    </button>
                                  </div>
                                </td>
                                <td>
                                  {job.has_open_trade ? (
                                    <div>
                                      <div className="fw-semibold">{job.open_trade_option ?? "Open"}</div>
                                      <div className="muted small">
                                        {job.open_trade_opened_at ? fmtDate(job.open_trade_opened_at) : "-"}
                                      </div>
                                      <div className="muted small">
                                        Entry {job.open_trade_entry_ltp?.toFixed(2) ?? "-"} | SL{" "}
                                        {job.open_trade_stop_ltp?.toFixed(2) ?? "-"} | TGT{" "}
                                        {job.open_trade_target_ltp?.toFixed(2) ?? "-"}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="muted">No</span>
                                  )}
                                </td>
                                <td>
                                  {job.has_open_trade ? (
                                    <div>
                                      <div className="fw-semibold">
                                        {job.current_option_ltp != null ? job.current_option_ltp.toFixed(2) : "-"}
                                      </div>
                                      {job.unrealized_pnl_amount != null ? (
                                        <span className={`badge-soft ${pnlTone(job.unrealized_pnl_amount)}`}>
                                          MTM {fmtMoney(job.unrealized_pnl_amount)}
                                        </span>
                                      ) : (
                                        <div className="muted small">{job.quote_error ?? "Live quote pending"}</div>
                                      )}
                                      <div className="muted small">Realized {fmtMoney(job.total_realized_pnl)}</div>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className={`badge-soft ${pnlTone(job.total_realized_pnl)}`}>
                                        Realized {fmtMoney(job.total_realized_pnl)}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td>{fmtDate(job.started_at)}</td>
                                <td>{job.last_log_at ? fmtDate(job.last_log_at) : "-"}</td>
                                <td>
                                  <div className="d-flex flex-wrap gap-2">
                                    <button
                                      className="btn btn-outline-light btn-sm"
                                      onClick={() => setExpandedBotJobId((prev) => (prev === job.job_id ? "" : job.job_id))}
                                    >
                                      {expandedBotJobId === job.job_id ? "Hide" : "Details"}
                                    </button>
                                    {job.has_open_trade && (
                                      <button
                                        className="btn btn-outline-danger btn-sm"
                                        disabled={
                                          managedBotAction === `square:${job.job_id}` ||
                                          managedBotAction === `stop:${job.job_id}`
                                        }
                                        onClick={() => handleSquareOffManagedBot(job.job_id)}
                                      >
                                        {managedBotAction === `square:${job.job_id}` ? "Squaring..." : "Square Off"}
                                      </button>
                                    )}
                                    {(job.status === "starting" || job.status === "running" || job.status === "stopping") && (
                                      <button
                                        className="btn btn-warning btn-sm"
                                        disabled={
                                          managedBotAction === `stop:${job.job_id}` ||
                                          managedBotAction === `square:${job.job_id}`
                                        }
                                        onClick={() => handleStopManagedBot(job.job_id)}
                                      >
                                        {managedBotAction === `stop:${job.job_id}` ? "Stopping..." : "Stop"}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {expandedBotJobId === job.job_id && (
                                <tr>
                                  <td colSpan={9}>
                                    <div className="row g-3">
                                      <div className="col-12 col-xl-4">
                                        <div className="small muted">
                                          <strong>Run Mode:</strong> {job.once ? "Single pass" : "Managed loop"}
                                        </div>
                                        <div className="small muted">
                                          <strong>Cycles Limit:</strong> {job.max_cycles ?? "Unlimited"}
                                        </div>
                                        <div className="small muted">
                                          <strong>Polling:</strong> entry {job.entry_interval_sec}s / exit {job.exit_interval_sec}s
                                        </div>
                                        <div className="small muted">
                                          <strong>Greek Selection:</strong> {job.use_greek_selection ? "Enabled" : "Disabled"}
                                        </div>
                                        <div className="small muted">
                                          <strong>Lots:</strong> {job.lots} x {job.lot_size}
                                        </div>
                                        <div className="small muted">
                                          <strong>Qty:</strong> {job.open_trade_quantity || job.lots * job.lot_size}
                                        </div>
                                        <div className="small muted">
                                          <strong>Current Option LTP:</strong>{" "}
                                          {job.current_option_ltp != null ? job.current_option_ltp.toFixed(2) : "-"}
                                        </div>
                                        <div className="small muted">
                                          <strong>Current Spot:</strong> {job.current_spot != null ? job.current_spot.toFixed(2) : "-"}
                                        </div>
                                        <div className="small muted">
                                          <strong>MTM:</strong>{" "}
                                          {job.unrealized_pnl_amount != null
                                            ? `${fmtMoney(job.unrealized_pnl_amount)} (${job.unrealized_pnl_points?.toFixed(2) ?? "-"} pts)`
                                            : job.quote_error ?? "-"}
                                        </div>
                                        <div className="small muted">
                                          <strong>Total Realized:</strong> {fmtMoney(job.total_realized_pnl)}
                                        </div>
                                        <div className="small muted">
                                          <strong>Stopped:</strong> {job.stopped_at ? fmtDate(job.stopped_at) : "-"}
                                        </div>
                                        <div className="small muted">
                                          <strong>Last Error:</strong> {job.last_error ?? "-"}
                                        </div>
                                      </div>
                                      <div className="col-12 col-xl-8">
                                        <div className="fw-semibold small mb-2">Recent Logs</div>
                                        <pre className="mb-0 small" style={{ maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap" }}>
                                          {job.recent_logs.length ? job.recent_logs.join("\n") : "No logs captured yet."}
                                        </pre>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="empty-state">
                              {managedJobsView === "today"
                                ? "No jobs are active for today yet."
                                : "No historical jobs match the selected date range."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>

      {managedBotTradesJob ? (
        <div className="dashboard-trades-modal-backdrop" onClick={closeManagedBotTrades} role="presentation">
          <div
            className="dashboard-trades-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Managed bot trades"
          >
            <div className="dashboard-trades-modal-header">
              <div>
                <div className="dashboard-trades-modal-title">Managed Bot Trades</div>
                <div className="dashboard-trades-modal-subtitle">
                  {managedBotTradesJob.job_name} | {managedBotTradesJob.instrument_key} |{" "}
                  {managedBotTradesJob.side.toUpperCase()} | {managedBotTradesJob.strategy_label}
                </div>
              </div>
              <button className="dashboard-trades-close" onClick={closeManagedBotTrades} type="button">
                Close
              </button>
            </div>

            {managedBotTradesError ? (
              <div className="alert alert-danger mb-0">{managedBotTradesError}</div>
            ) : managedBotTradesLoading ? (
              <div className="muted">Loading trades...</div>
            ) : managedBotTrades.length ? (
              <div className="table-responsive">
                <table className="table table-dark-shell align-middle dashboard-trades-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Opened</th>
                      <th>Closed</th>
                      <th>Option</th>
                      <th>Qty</th>
                      <th>Entry</th>
                      <th>Exit</th>
                      <th>P&amp;L</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managedBotTrades.map((trade) => (
                      <tr key={trade.id}>
                        <td className="mono">{trade.id}</td>
                        <td>
                          <span className={`badge-soft ${trade.status === "OPEN" ? "blue" : "gold"}`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="small">{trade.opened_at ? fmtDate(trade.opened_at) : "-"}</td>
                        <td className="small">{trade.closed_at ? fmtDate(trade.closed_at) : "-"}</td>
                        <td>
                          <div className="fw-semibold">{trade.option_symbol}</div>
                          <div className="muted small">
                            {trade.expiry} | {trade.option_type} {trade.strike}
                          </div>
                        </td>
                        <td className="mono">{trade.quantity}</td>
                        <td className="mono">{trade.entry_ltp?.toFixed(2) ?? "-"}</td>
                        <td className="mono">{trade.exit_ltp != null ? trade.exit_ltp.toFixed(2) : "-"}</td>
                        <td>
                          {trade.pnl_amount != null ? (
                            <span className={`badge-soft ${pnlTone(trade.pnl_amount)}`}>
                              {fmtMoney(trade.pnl_amount)}
                            </span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td className="small">
                          <div>{trade.entry_reason || "-"}</div>
                          <div className="muted">{trade.exit_reason || ""}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="muted">No trades recorded for this bot store yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
