"use client";

import { Fragment, useEffect, useState } from "react";

import { TodayHistoryToolbar } from "@/components/today-history-toolbar";
import {
    fetchInstrumentCatalog,
    fetchUpstoxManagedBotJobs,
    InstrumentCatalogResponse,
    InstrumentItem,
    McxPreviewResponse,
    previewMcxMarket,
    runUpstoxOptionChainBot,
    squareOffUpstoxManagedBot,
    startUpstoxManagedBot,
    stopUpstoxManagedBot,
    UpstoxManagedBotJob,
    UpstoxManagedBotStartRequest,
    UpstoxOptionChainBotRunRequest,
} from "@/lib/api";
import { HistoryPreset, HistoryView, localDateKey, matchesHistoryWindow, parseIsoDate } from "@/lib/history-window";

type BotSide = "call" | "put";

type McxPreset = {
  symbol: string;
  label: string;
  lot_size: number;
  market_open: string;
  entry_cutoff: string;
  time_exit: string;
  max_entry_ltp: number;
  max_total_entry_amount: number;
  env_vars: string[];
  note: string;
};

const MCX_PRESETS: McxPreset[] = [
  {
    symbol: "CRUDEOIL",
    label: "Crude Oil",
    lot_size: 100,
    market_open: "09:00",
    entry_cutoff: "23:00",
    time_exit: "23:20",
    max_entry_ltp: 25000,
    max_total_entry_amount: 25000,
    env_vars: ["UPSTOX_MCX_CRUDEOIL_INSTRUMENT_KEY", "UPSTOX_CRUDEOIL_INSTRUMENT_KEY"],
    note: "Good starter contract for MCX testing. The repo already includes a crude-oil launcher script.",
  },
  {
    symbol: "NATURALGAS",
    label: "Natural Gas",
    lot_size: 1250,
    market_open: "09:00",
    entry_cutoff: "22:45",
    time_exit: "23:10",
    max_entry_ltp: 25000,
    max_total_entry_amount: 25000,
    env_vars: ["UPSTOX_MCX_NATURALGAS_INSTRUMENT_KEY", "UPSTOX_NATURALGAS_INSTRUMENT_KEY"],
    note: "Usually moves quickly, so wider filters and smaller size discipline matter.",
  },
  {
    symbol: "GOLD",
    label: "Gold",
    lot_size: 100,
    market_open: "09:00",
    entry_cutoff: "22:45",
    time_exit: "23:10",
    max_entry_ltp: 25000,
    max_total_entry_amount: 25000,
    env_vars: ["UPSTOX_MCX_GOLD_INSTRUMENT_KEY", "UPSTOX_GOLD_INSTRUMENT_KEY"],
    note: "Use this for bullion-focused setups once the correct MCX underlying key is configured.",
  },
  {
    symbol: "SILVER",
    label: "Silver",
    lot_size: 30,
    market_open: "09:00",
    entry_cutoff: "22:45",
    time_exit: "23:10",
    max_entry_ltp: 25000,
    max_total_entry_amount: 25000,
    env_vars: ["UPSTOX_MCX_SILVER_INSTRUMENT_KEY", "UPSTOX_SILVER_INSTRUMENT_KEY"],
    note: "A handy second bullion contract for side-by-side MCX experiments.",
  },
  {
    symbol: "COPPER",
    label: "Copper",
    lot_size: 2500,
    market_open: "09:00",
    entry_cutoff: "22:45",
    time_exit: "23:10",
    max_entry_ltp: 25000,
    max_total_entry_amount: 25000,
    env_vars: ["UPSTOX_MCX_COPPER_INSTRUMENT_KEY", "UPSTOX_COPPER_INSTRUMENT_KEY"],
    note: "Industrial metals can be useful when you want an MCX list beyond energy and bullion.",
  },
  {
    symbol: "ZINC",
    label: "Zinc",
    lot_size: 5000,
    market_open: "09:00",
    entry_cutoff: "22:45",
    time_exit: "23:10",
    max_entry_ltp: 25000,
    max_total_entry_amount: 25000,
    env_vars: ["UPSTOX_MCX_ZINC_INSTRUMENT_KEY", "UPSTOX_ZINC_INSTRUMENT_KEY"],
    note: "Included as a ready slot for multi-commodity expansion.",
  },
];

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

function metricTone(value: number) {
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "";
}

function commoditySymbol(item: InstrumentItem | null | undefined) {
  return (item?.symbol || item?.trading_symbol || item?.label || "").toUpperCase().replaceAll(" ", "");
}

function configuredCommodityKey(item: InstrumentItem | null | undefined) {
  return (item?.instrument_key || "").trim();
}

function resolvedLaunchInstrumentKey(item: InstrumentItem | null | undefined, fallbackKey: string) {
  return configuredCommodityKey(item) || fallbackKey.trim();
}

function presetForCommodity(item: InstrumentItem | null | undefined) {
  const symbol = commoditySymbol(item);
  return MCX_PRESETS.find((preset) => preset.symbol === symbol) ?? MCX_PRESETS[0];
}

function buildStorePath(symbol: string) {
  return `logs/upstox/${symbol.toLowerCase()}_tv_ha_option_chain_api.db`;
}

function appendSideToStorePath(path: string, side: BotSide) {
  const trimmed = path.trim();
  if (!trimmed) {
    return `logs/upstox/mcx_${side}.db`;
  }
  if (trimmed.endsWith(`_${side}.db`) || trimmed.endsWith(`-${side}.db`)) {
    return trimmed;
  }
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex === -1) {
    return `${trimmed}_${side}`;
  }
  return `${trimmed.slice(0, dotIndex)}_${side}${trimmed.slice(dotIndex)}`;
}

function buildManagedJobName(baseName: string, symbol: string, side: BotSide, selectedCount: number) {
  const trimmed = baseName.trim();
  if (!trimmed) {
    return `mcx-${symbol.toLowerCase()}-${side}`;
  }
  if (selectedCount > 1) {
    return `${trimmed}-${side}`;
  }
  return trimmed;
}

function isMcxJob(job: UpstoxManagedBotJob) {
  return job.instrument_key.startsWith("MCX_FO|");
}

function findCommodityByKey(catalog: InstrumentCatalogResponse | null, instrumentKey: string) {
  return (catalog?.commodities ?? []).find((item) => item.instrument_key === instrumentKey) ?? null;
}

export function McxMarketShell() {
  const [catalog, setCatalog] = useState<InstrumentCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [managedBots, setManagedBots] = useState<UpstoxManagedBotJob[]>([]);
  const [managedBotsLoading, setManagedBotsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [preview, setPreview] = useState<McxPreviewResponse | null>(null);
  const [previewRunning, setPreviewRunning] = useState(false);
  const [botRunning, setBotRunning] = useState(false);
  const [managedBotAction, setManagedBotAction] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState("CRUDEOIL");
  const [managedJobName, setManagedJobName] = useState("");
  const [managedAutoStorePath, setManagedAutoStorePath] = useState(true);
  const [enableCall, setEnableCall] = useState(true);
  const [enablePut, setEnablePut] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState("");
  const [fleetView, setFleetView] = useState<HistoryView>("today");
  const [fleetHistoryPreset, setFleetHistoryPreset] = useState<HistoryPreset>("last7");
  const [fleetHistoryFrom, setFleetHistoryFrom] = useState("");
  const [fleetHistoryTo, setFleetHistoryTo] = useState("");
  const [form, setForm] = useState<UpstoxOptionChainBotRunRequest>({
    instrument_key: "",
    expiry: "",
    side: "call",
    strategy_id: "tv_ha_call_v2",
    candle_unit: "minutes",
    candle_interval: "3",
    strike_offset: 0,
    use_greek_selection: true,
    max_entry_ltp: 25000,
    max_total_entry_amount: 25000,
    risk_model: "dynamic",
    use_time_windows: true,
    sl_premium_pct: 0.2,
    target_premium_pct: 0.36,
    min_hold_sec_before_underlying_exit: 60,
    entry_interval_sec: 60,
    exit_interval_sec: 15,
    lots: 1,
    lot_size: 100,
    market_open: "09:00",
    entry_cutoff: "23:00",
    time_exit: "23:20",
    store_path: buildStorePath("crudeoil"),
    max_cycles: null,
    once: true,
  });

  const commodities = catalog?.commodities ?? [];
  const selectedCommodityItem = commodities.find((item) => commoditySymbol(item) === selectedCommodity) ?? null;
  const selectedPreset = presetForCommodity(selectedCommodityItem);
  const selectedCommodityKey = configuredCommodityKey(selectedCommodityItem);
  const launchInstrumentKey = resolvedLaunchInstrumentKey(selectedCommodityItem, form.instrument_key);
  const plannedQuantity = Math.max(form.lots, 1) * Math.max(form.lot_size, 1);
  const totalEntryDrivenLtpCap =
    form.max_total_entry_amount != null && form.max_total_entry_amount > 0
      ? form.max_total_entry_amount / plannedQuantity
      : null;
  const effectiveEntryLtpCap =
    totalEntryDrivenLtpCap != null ? Math.min(form.max_entry_ltp, totalEntryDrivenLtpCap) : form.max_entry_ltp;
  const mcxJobs = managedBots.filter(isMcxJob);

  const fleetTodayKey = localDateKey(new Date());
  const mcxTodayJobs = mcxJobs.filter((job) => {
    if (job.status === "running" || job.status === "starting" || job.status === "stopping" || job.has_open_trade) {
      return true;
    }
    const startedAt = parseIsoDate(job.started_at);
    if (!startedAt) {
      return false;
    }
    return localDateKey(startedAt) === fleetTodayKey;
  });
  const allHistoricalMcxJobs = mcxJobs.filter((job) => {
    const startedAt = parseIsoDate(job.started_at);
    if (!startedAt) {
      return false;
    }
    return localDateKey(startedAt) < fleetTodayKey;
  });
  const mcxHistoricalJobs = allHistoricalMcxJobs.filter((job) => {
    const startedAt = parseIsoDate(job.started_at);
    if (!startedAt) {
      return false;
    }
    const startedKey = localDateKey(startedAt);
    return matchesHistoryWindow(startedKey, fleetHistoryPreset, fleetHistoryFrom, fleetHistoryTo);
  });
  const visibleMcxJobs = fleetView === "today" ? mcxTodayJobs : mcxHistoricalJobs;

  const activeMcxJobs = mcxJobs.filter((job) => ["starting", "running", "stopping"].includes(job.status));
  const openMcxTrades = mcxJobs.filter((job) => job.has_open_trade);
  const realizedMcxPnl = mcxJobs.reduce((total, job) => total + job.total_realized_pnl, 0);
  const unrealizedMcxPnl = mcxJobs.reduce((total, job) => total + (job.unrealized_pnl_amount ?? 0), 0);
  const configuredCommodityCount = commodities.filter((item) => item.instrument_key.trim()).length;
  const canSubmit = launchInstrumentKey.length > 0;
  const previewSymbol = (selectedCommodityItem?.symbol || selectedCommodity || "").toUpperCase();
  const canPreview = canSubmit;
  const mcxExecutionUnavailable = false;
  const hasKeyMismatch =
    Boolean(selectedCommodityKey) &&
    Boolean(form.instrument_key.trim()) &&
    selectedCommodityKey !== form.instrument_key.trim();

  function syncLaunchInstrumentKey(nextInstrumentKey: string) {
    const trimmedInstrumentKey = nextInstrumentKey.trim();
    if (!trimmedInstrumentKey) {
      return;
    }
    setForm((prev) => (prev.instrument_key === trimmedInstrumentKey ? prev : { ...prev, instrument_key: trimmedInstrumentKey }));
  }

  function applyCommoditySelection(nextCommodity: InstrumentItem) {
    const nextSymbol = commoditySymbol(nextCommodity);
    const preset = presetForCommodity(nextCommodity);
    setSelectedCommodity(nextSymbol);
    setForm((prev) => ({
      ...prev,
      instrument_key: nextCommodity.instrument_key || "",
      lot_size: preset.lot_size,
      market_open: preset.market_open,
      entry_cutoff: preset.entry_cutoff,
      time_exit: preset.time_exit,
      max_entry_ltp: preset.max_entry_ltp,
      max_total_entry_amount: preset.max_total_entry_amount,
      store_path: buildStorePath(nextSymbol.toLowerCase()),
    }));
    setManagedJobName((prev) => (prev.trim() ? prev : `mcx-${nextSymbol.toLowerCase()}`));
    setPreview(null);
  }

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
        const nextCommodity =
          response.commodities.find((item) => commoditySymbol(item) === selectedCommodity) ??
          response.commodities.find((item) => item.instrument_key.trim()) ??
          response.commodities[0];
        if (nextCommodity) {
          applyCommoditySelection(nextCommodity);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setCatalogError(err instanceof Error ? err.message : "Failed to load MCX instrument catalog");
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

  useEffect(() => {
    let active = true;

    async function loadManagedBots() {
      try {
        const response = await fetchUpstoxManagedBotJobs();
        if (!active) {
          return;
        }
        setManagedBots(response);
      } catch (err) {
        if (!active) {
          return;
        }
        setMessage(err instanceof Error ? err.message : "Failed to load MCX managed bots");
        setMessageTone("error");
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

  async function refreshManagedBots() {
    setManagedBots(await fetchUpstoxManagedBotJobs());
  }

  async function handlePreview() {
    try {
      setPreviewRunning(true);
      syncLaunchInstrumentKey(launchInstrumentKey);
      const response = await previewMcxMarket({
        instrument_key: launchInstrumentKey,
        commodity_symbol: previewSymbol || null,
        expiry: form.expiry?.trim() ? form.expiry.trim() : null,
        rows_limit: 12,
      });
      setPreview(response);
      syncLaunchInstrumentKey(response.instrument_key);
      if (!form.expiry?.trim() && response.resolved_expiry) {
        setForm((prev) => ({ ...prev, expiry: response.resolved_expiry }));
      }
      setMessage(response.message);
      setMessageTone("success");
    } catch (err) {
      setPreview(null);
      setMessage(err instanceof Error ? err.message : "Failed to preview MCX strategy");
      setMessageTone("error");
    } finally {
      setPreviewRunning(false);
    }
  }

  async function handleRunCycle() {
    try {
      setBotRunning(true);
      syncLaunchInstrumentKey(launchInstrumentKey);
      const payload: UpstoxOptionChainBotRunRequest = {
        ...form,
        instrument_key: launchInstrumentKey,
        commodity_symbol: previewSymbol || null,
        expiry: form.expiry?.trim() ? form.expiry.trim() : null,
        max_total_entry_amount: form.max_total_entry_amount ?? null,
        strategy_id: form.side === "put" ? "tv_ha_put_v2" : "tv_ha_call_v2",
      };
      const response = await runUpstoxOptionChainBot(payload);
      syncLaunchInstrumentKey(response.instrument_key);
      setMessage(`${response.message} DB: ${response.store_path}`);
      setMessageTone("success");
      setRunLogs(response.logs ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to run MCX bot cycle");
      setMessageTone("error");
      setRunLogs([]);
    } finally {
      setBotRunning(false);
    }
  }

  async function handleStartManagedBots() {
    const sides: BotSide[] = [];
    if (enableCall) {
      sides.push("call");
    }
    if (enablePut) {
      sides.push("put");
    }
    if (!sides.length) {
      setMessage("Select at least one side to start an MCX managed bot.");
      setMessageTone("error");
      return;
    }

    try {
      setManagedBotAction("start");
      const symbol = commoditySymbol(selectedCommodityItem) || "MCX";
      syncLaunchInstrumentKey(launchInstrumentKey);
      const started: string[] = [];
      for (const side of sides) {
        const payload: UpstoxManagedBotStartRequest = {
          job_name: buildManagedJobName(managedJobName, symbol, side, sides.length) || null,
          auto_store_path: managedAutoStorePath,
          instrument_key: launchInstrumentKey,
          commodity_symbol: previewSymbol || null,
          expiry: form.expiry?.trim() ? form.expiry.trim() : null,
          side,
          strategy_id: side === "put" ? "tv_ha_put_v2" : "tv_ha_call_v2",
          candle_unit: form.candle_unit,
          candle_interval: form.candle_interval,
          strike_offset: form.strike_offset,
          use_greek_selection: form.use_greek_selection,
          max_entry_ltp: form.max_entry_ltp,
          max_total_entry_amount: form.max_total_entry_amount ?? null,
          risk_model: form.risk_model,
          risk_amount: form.risk_amount ?? null,
          use_time_windows: form.use_time_windows,
          sl_premium_pct: form.sl_premium_pct,
          target_premium_pct: form.target_premium_pct,
          min_hold_sec_before_underlying_exit: form.min_hold_sec_before_underlying_exit,
          entry_interval_sec: form.entry_interval_sec,
          exit_interval_sec: form.exit_interval_sec,
          lots: form.lots,
          lot_size: form.lot_size,
          market_open: form.market_open,
          entry_cutoff: form.entry_cutoff,
          time_exit: form.time_exit,
          store_path:
            managedAutoStorePath || sides.length === 1
              ? form.store_path
              : appendSideToStorePath(form.store_path, side),
          max_cycles: form.max_cycles ?? null,
          once: false,
        };
        const response = await startUpstoxManagedBot(payload);
        syncLaunchInstrumentKey(response.instrument_key);
        started.push(`${response.job_name} (${response.job_id})`);
      }
      setMessage(`MCX managed bot started: ${started.join(", ")}`);
      setMessageTone("success");
      await refreshManagedBots();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to start MCX managed bot");
      setMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  async function handleStopManagedBot(jobId: string) {
    try {
      setManagedBotAction(`stop:${jobId}`);
      const response = await stopUpstoxManagedBot(jobId);
      setMessage(`MCX managed bot stop requested: ${response.job_name} (${response.job_id})`);
      setMessageTone("success");
      await refreshManagedBots();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to stop MCX managed bot");
      setMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  async function handleSquareOffManagedBot(jobId: string) {
    try {
      setManagedBotAction(`square:${jobId}`);
      const response = await squareOffUpstoxManagedBot(jobId);
      setMessage(`MCX trade squared off for ${response.job_name} (${response.job_id}).`);
      setMessageTone("success");
      await refreshManagedBots();
      setExpandedJobId(jobId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to square off MCX trade");
      setMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  const summaryCards = [
    { label: "Configured Commodities", value: `${configuredCommodityCount}/${commodities.length || MCX_PRESETS.length}` },
    { label: "Active MCX Bots", value: activeMcxJobs.length },
    { label: "Open MCX Trades", value: openMcxTrades.length },
    { label: "Realized PnL", value: fmtMoney(realizedMcxPnl), tone: metricTone(realizedMcxPnl) },
    { label: "Unrealized PnL", value: fmtMoney(unrealizedMcxPnl), tone: metricTone(unrealizedMcxPnl) },
  ];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="mcx-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#mcx-top">
              Overview
            </a>
            <a className="hero-tab" href="#mcx-controls">
              Controls
            </a>
            <a className="hero-tab" href="#mcx-fleet">
              Fleet
            </a>
            <a className="hero-tab" href="#mcx-catalog">
              Catalog
            </a>
            <a className="hero-tab" href="#mcx-notes">
              Notes
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">MCX Commodity Market</h1>
            <p className="hero-subtitle">
              Dedicated tab for MCX setup, instrument discovery, and future commodity automation support.
            </p>
          </div>
          <div className="p-3">
            {message && <div className={`alert ${messageTone === "success" ? "alert-success" : "alert-danger"}`}>{message}</div>}
            {catalogError && <div className="alert alert-danger">{catalogError}</div>}
            <div className="alert alert-warning">
              Upstox MCX support on this tab now uses Upstox option contracts plus batched option-Greek quotes to build
              the strike view and drive execution. The official Put/Call option-chain endpoint is still not exposed for
              MCX, so this page runs through the integrated fallback instead.
            </div>
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
          </div>
        </section>

        <div className="row g-4">
          <div className="col-12 col-xl-8">
            <section className="dashboard-panel h-100" id="mcx-controls">
              <h2 className="panel-title">MCX Bot Controls</h2>
              <div className="p-3">
                <div className="alert alert-warning">
                  Preview, single-cycle execution, and managed starts now run through the Upstox MCX fallback path. Keep
                  the configured MCX underlying key accurate for the selected commodity before launching a bot.
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-6 col-xl-4">
                    <label className="form-label">Commodity</label>
                    <select
                      className="form-select"
                      value={selectedCommodity}
                      onChange={(e) => {
                        const nextItem = commodities.find((item) => commoditySymbol(item) === e.target.value);
                        if (nextItem) {
                          applyCommoditySelection(nextItem);
                        }
                      }}
                      disabled={catalogLoading || commodities.length === 0}
                    >
                      {catalogLoading && !commodities.length && <option value={selectedCommodity}>Loading MCX catalog...</option>}
                      {commodities.map((item) => (
                        <option key={commoditySymbol(item)} value={commoditySymbol(item)}>
                          {item.label}
                          {item.instrument_key.trim() ? "" : " (configure key)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6 col-xl-4">
                    <label className="form-label">MCX Instrument Key</label>
                    <input
                      className="form-control"
                      placeholder="MCX_FO|123456"
                      value={form.instrument_key}
                      onChange={(e) => setForm((prev) => ({ ...prev, instrument_key: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Preview Side</label>
                    <select
                      className="form-select"
                      value={form.side}
                      onChange={(e) => setForm((prev) => ({ ...prev, side: e.target.value as BotSide }))}
                    >
                      <option value="call">Call</option>
                      <option value="put">Put</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Expiry</label>
                    <input
                      className="form-control"
                      placeholder="YYYY-MM-DD"
                      value={form.expiry ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, expiry: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Candle Interval</label>
                    <input
                      className="form-control"
                      value={form.candle_interval}
                      onChange={(e) => setForm((prev) => ({ ...prev, candle_interval: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Strike Offset</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.strike_offset}
                      onChange={(e) => setForm((prev) => ({ ...prev, strike_offset: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Max Entry LTP</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.max_entry_ltp}
                      onChange={(e) => setForm((prev) => ({ ...prev, max_entry_ltp: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Max Total Entry</label>
                    <input
                      className="form-control"
                      type="number"
                      placeholder="Unlimited"
                      value={form.max_total_entry_amount ?? ""}
                      onChange={(e) => {
                        const next = e.target.value.trim();
                        setForm((prev) => ({
                          ...prev,
                          max_total_entry_amount: next ? Math.max(Number(next) || 0, 0) : null,
                        }));
                      }}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Lots</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.lots}
                      onChange={(e) => setForm((prev) => ({ ...prev, lots: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Lot Size</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.lot_size}
                      onChange={(e) => setForm((prev) => ({ ...prev, lot_size: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Risk Model</label>
                    <select
                      className="form-select"
                      value={form.risk_model}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, risk_model: e.target.value as "dynamic" | "fixed" | "risk_amount" }))
                      }
                    >
                      <option value="dynamic">Dynamic</option>
                      <option value="fixed">Fixed %</option>
                      <option value="risk_amount">Risk Amount (₹)</option>
                    </select>
                  </div>
                  {form.risk_model === "risk_amount" && (
                    <div className="col-12 col-md-6 col-xl-2">
                      <label className="form-label">Risk Amount (₹)</label>
                      <input
                        className="form-control"
                        type="number"
                        min={1}
                        placeholder="e.g. 1000"
                        value={form.risk_amount ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, risk_amount: e.target.value ? Number(e.target.value) : null }))
                        }
                      />
                    </div>
                  )}
                  <div className="col-12 col-md-6 col-xl-2 d-flex align-items-end">
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="useTimeWindowsMcx"
                        checked={form.use_time_windows}
                        onChange={(e) => setForm((prev) => ({ ...prev, use_time_windows: e.target.checked }))}
                      />
                      <label className="form-check-label" htmlFor="useTimeWindowsMcx">
                        Time Windows
                        <div className="small text-muted">ORB / FII / MOM · EOD 15:30</div>
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Max Cycles</label>
                    <input
                      className="form-control"
                      type="number"
                      min={1}
                      placeholder="Unlimited"
                      value={form.max_cycles ?? ""}
                      onChange={(e) => {
                        const next = e.target.value.trim();
                        setForm((prev) => ({
                          ...prev,
                          max_cycles: next ? Math.max(1, Number(next) || 1) : null,
                        }));
                      }}
                    />
                  </div>
                  <div className="col-12">
                    <div className="small muted">
                      Effective entry cap at the current size is {fmtNumber(effectiveEntryLtpCap)} per unit across qty{" "}
                      {fmtNumber(plannedQuantity)}.
                    </div>
                  </div>
                  <div className="col-12 col-md-4 col-xl-2">
                    <label className="form-label">Market Open</label>
                    <input
                      className="form-control"
                      value={form.market_open}
                      onChange={(e) => setForm((prev) => ({ ...prev, market_open: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-4 col-xl-2">
                    <label className="form-label">Entry Cutoff</label>
                    <input
                      className="form-control"
                      value={form.entry_cutoff}
                      onChange={(e) => setForm((prev) => ({ ...prev, entry_cutoff: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-4 col-xl-2">
                    <label className="form-label">Time Exit</label>
                    <input
                      className="form-control"
                      value={form.time_exit}
                      onChange={(e) => setForm((prev) => ({ ...prev, time_exit: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Entry Poll (s)</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.entry_interval_sec}
                      onChange={(e) => setForm((prev) => ({ ...prev, entry_interval_sec: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Exit Poll (s)</label>
                    <input
                      className="form-control"
                      type="number"
                      value={form.exit_interval_sec}
                      onChange={(e) => setForm((prev) => ({ ...prev, exit_interval_sec: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">SL Premium %</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      value={form.sl_premium_pct}
                      onChange={(e) => setForm((prev) => ({ ...prev, sl_premium_pct: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-2">
                    <label className="form-label">Target Premium %</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      value={form.target_premium_pct}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, target_premium_pct: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className="col-12 col-xl-6">
                    <label className="form-label">Store Path</label>
                    <input
                      className="form-control"
                      value={form.store_path}
                      onChange={(e) => setForm((prev) => ({ ...prev, store_path: e.target.value }))}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <label className="form-label">Managed Job Name</label>
                    <input
                      className="form-control"
                      placeholder={`mcx-${selectedCommodity.toLowerCase()}`}
                      value={managedJobName}
                      onChange={(e) => setManagedJobName(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-xl-3 d-flex align-items-end">
                    <div className="d-flex flex-wrap gap-3 mb-2">
                      <div className="form-check">
                        <input
                          checked={enableCall}
                          className="form-check-input"
                          id="mcx-enable-call"
                          onChange={(e) => setEnableCall(e.target.checked)}
                          type="checkbox"
                        />
                        <label className="form-check-label" htmlFor="mcx-enable-call">
                          Start CALL
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          checked={enablePut}
                          className="form-check-input"
                          id="mcx-enable-put"
                          onChange={(e) => setEnablePut(e.target.checked)}
                          type="checkbox"
                        />
                        <label className="form-check-label" htmlFor="mcx-enable-put">
                          Start PUT
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="form-check mt-4 pt-2">
                      <input
                        checked={form.use_greek_selection}
                        className="form-check-input"
                        id="mcx-use-greek-selection"
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, use_greek_selection: e.target.checked }))
                        }
                        type="checkbox"
                      />
                      <label className="form-check-label" htmlFor="mcx-use-greek-selection">
                        Use Greek Selection
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="form-check mt-4 pt-2">
                      <input
                        checked={managedAutoStorePath}
                        className="form-check-input"
                        id="mcx-auto-store-path"
                        onChange={(e) => setManagedAutoStorePath(e.target.checked)}
                        type="checkbox"
                      />
                      <label className="form-check-label" htmlFor="mcx-auto-store-path">
                        Auto-generate DB per managed bot
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-xl-6 d-flex align-items-end">
                    <div className="d-grid gap-2 w-100">
                      <button
                        className="btn btn-outline-light"
                        disabled={!canPreview || previewRunning}
                        onClick={handlePreview}
                      >
                        {previewRunning ? "Previewing..." : `Preview ${previewSymbol || "MCX"} Via Upstox`}
                      </button>
                      <button
                        className="btn btn-warning"
                        disabled={!canSubmit || botRunning || mcxExecutionUnavailable}
                        onClick={handleRunCycle}
                      >
                        {mcxExecutionUnavailable
                          ? "Run Disabled For MCX"
                          : botRunning
                            ? "Running..."
                            : `Run ${form.side.toUpperCase()} Bot Cycle`}
                      </button>
                      <button
                        className="btn btn-outline-warning"
                        disabled={!canSubmit || managedBotAction === "start" || mcxExecutionUnavailable}
                        onClick={handleStartManagedBots}
                      >
                        {mcxExecutionUnavailable
                          ? "Managed Start Disabled For MCX"
                          : managedBotAction === "start"
                            ? "Starting..."
                            : `Start Managed ${enableCall && enablePut ? "CALL + PUT" : enableCall ? "CALL" : enablePut ? "PUT" : "Bots"}`}
                      </button>
                    </div>
                  </div>
                </div>

                {!canSubmit && (
                  <div className="alert alert-warning mt-4 mb-0">
                    Add the MCX underlying key here, or set one of the configured environment variables from the catalog panel first.
                  </div>
                )}

                {hasKeyMismatch && (
                  <div className="alert alert-warning mt-4 mb-0">
                    {selectedPreset.label} is configured with <code>{selectedCommodityKey}</code>. Preview, one-cycle runs,
                    and managed starts will use that selected-commodity key unless you update the configuration.
                  </div>
                )}

                <div className="alert alert-secondary mt-4 mb-0">
                  The selected commodity's configured MCX key is used when available. Current launch key:{" "}
                  <code>{launchInstrumentKey || "MCX_FO|..."}</code>.
                </div>

                {preview && (
                  <div className="mt-4 border rounded p-3" style={{ borderColor: "var(--line)" }}>
                    <div className="fw-semibold mb-2">Upstox MCX Preview</div>
                    <div className="small muted mb-2">{preview.message}</div>
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-6 col-xl-3">
                        <div className="small muted">
                          <strong>Symbol:</strong> {preview.symbol}
                        </div>
                      </div>
                      <div className="col-12 col-md-6 col-xl-3">
                        <div className="small muted">
                          <strong>Expiry:</strong> {preview.resolved_expiry}
                        </div>
                      </div>
                      <div className="col-12 col-md-6 col-xl-3">
                        <div className="small muted">
                          <strong>Contracts:</strong> {preview.contract_count}
                        </div>
                      </div>
                      <div className="col-12 col-md-6 col-xl-3">
                        <div className="small muted">
                          <strong>Shown Strikes:</strong> {preview.returned_strikes}/{preview.total_strikes}
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="fw-semibold small mb-2">Available Expiries</div>
                      <div className="d-flex flex-wrap gap-2">
                        {preview.available_expiries.map((expiry) => (
                          <button
                            key={expiry}
                            className={`btn btn-sm ${expiry === preview.resolved_expiry ? "btn-warning" : "btn-outline-light"}`}
                            onClick={() => setForm((prev) => ({ ...prev, expiry }))}
                            type="button"
                          >
                            {expiry}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-dark-shell align-middle">
                        <thead>
                          <tr>
                            <th>Strike</th>
                            <th>CE LTP</th>
                            <th>CE Delta</th>
                            <th>CE OI</th>
                            <th>PE LTP</th>
                            <th>PE Delta</th>
                            <th>PE OI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row) => (
                            <tr key={row.strike_price}>
                              <td>{fmtNumber(row.strike_price)}</td>
                              <td>{row.call?.ltp != null ? fmtNumber(row.call.ltp) : "-"}</td>
                              <td>{row.call?.delta != null ? row.call.delta.toFixed(3) : "-"}</td>
                              <td>{row.call?.oi != null ? fmtNumber(row.call.oi) : "-"}</td>
                              <td>{row.put?.ltp != null ? fmtNumber(row.put.ltp) : "-"}</td>
                              <td>{row.put?.delta != null ? row.put.delta.toFixed(3) : "-"}</td>
                              <td>{row.put?.oi != null ? fmtNumber(row.put.oi) : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-4 border rounded p-3" style={{ borderColor: "var(--line)" }}>
                  <div className="fw-semibold mb-2">Latest One-Cycle Log</div>
                  <div className="small muted mb-2">
                    Useful for testing a commodity setup before letting the managed bot loop run by itself.
                  </div>
                  <pre className="mb-0 small" style={{ maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap" }}>
                    {runLogs.length ? runLogs.join("\n") : "No MCX cycle log captured yet."}
                  </pre>
                </div>
              </div>
            </section>
          </div>

          <div className="col-12 col-xl-4">
            <section className="dashboard-panel h-100" id="mcx-notes">
              <h2 className="panel-title">Selected Commodity</h2>
              <div className="p-3">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div className="fw-semibold fs-5">{selectedPreset.label}</div>
                    <div className="muted small">{selectedPreset.note}</div>
                  </div>
                  <span className={`badge-soft ${launchInstrumentKey ? "green" : "gold"}`}>
                    {launchInstrumentKey ? "Configured" : "Needs Key"}
                  </span>
                </div>
                <div className="mt-3 d-flex flex-column gap-2 small muted">
                  <div>
                    <strong>Suggested Lot Size:</strong> {fmtNumber(selectedPreset.lot_size)}
                  </div>
                  <div>
                    <strong>Trading Window:</strong> {selectedPreset.market_open} to {selectedPreset.time_exit}
                  </div>
                  <div>
                    <strong>Suggested Max LTP:</strong> {fmtNumber(selectedPreset.max_entry_ltp)}
                  </div>
                  <div>
                    <strong>Suggested Max Total Entry:</strong> {fmtMoney(selectedPreset.max_total_entry_amount)}
                  </div>
                  <div>
                    <strong>Effective LTP Cap Now:</strong> {fmtNumber(effectiveEntryLtpCap)}
                    {form.max_total_entry_amount != null && form.max_total_entry_amount > 0
                      ? ` (${fmtMoney(form.max_total_entry_amount)} across qty ${fmtNumber(plannedQuantity)})`
                      : ""}
                  </div>
                  <div>
                    <strong>Selected Store:</strong> {form.store_path}
                  </div>
                  <div>
                    <strong>Upstox Launch Key:</strong> {launchInstrumentKey || "-"}
                  </div>
                  <div>
                    <strong>Env Keys:</strong> {selectedPreset.env_vars.join(", ")}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="fw-semibold mb-2">Why this tab helps</div>
                  <div className="small muted">
                    We can keep MCX timings, lot sizes, and commodity discovery separated from the stock/index area. This
                    tab now gives us a live Upstox preview surface and an execution path that reuses the same MCX quote fallback.
                  </div>
                </div>
                <div className="mt-4">
                  <div className="fw-semibold mb-2">Starter flow</div>
                  <ol className="small muted ps-3 mb-0">
                    <li>Select a commodity.</li>
                    <li>Confirm the Upstox MCX instrument key is filled in for that symbol.</li>
                    <li>Use Preview to inspect Upstox expiries, strikes, and Greeks, then launch a one-cycle or managed bot.</li>
                  </ol>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="dashboard-panel mt-4" id="mcx-fleet">
          <h2 className="panel-title">MCX Managed Bot Fleet</h2>
          <div className="p-3">
            <div className="small muted mb-3">
              Only MCX jobs are shown here. This keeps commodity monitoring separate from the equity/index launcher.
            </div>
            <TodayHistoryToolbar
              view={fleetView}
              onViewChange={setFleetView}
              preset={fleetHistoryPreset}
              onPresetChange={setFleetHistoryPreset}
              fromDate={fleetHistoryFrom}
              onFromDateChange={setFleetHistoryFrom}
              toDate={fleetHistoryTo}
              onToDateChange={setFleetHistoryTo}
              todayCount={mcxTodayJobs.length}
              historyCount={mcxHistoricalJobs.length}
              historyTotalCount={allHistoricalMcxJobs.length}
            />
            <div className="table-responsive">
              <table className="table table-dark-shell align-middle">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Commodity</th>
                    <th>Job</th>
                    <th>Open Trade</th>
                    <th>P&amp;L</th>
                    <th>Started</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managedBotsLoading ? (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        Loading MCX managed bots...
                      </td>
                    </tr>
                  ) : visibleMcxJobs.length ? (
                    visibleMcxJobs.map((job) => {
                      const commodity = findCommodityByKey(catalog, job.instrument_key);
                      return (
                        <Fragment key={job.job_id}>
                          <tr>
                            <td>
                              <span className={`badge-soft ${botJobTone(job.status)}`}>{job.status}</span>
                            </td>
                            <td>
                              <div className="fw-semibold">{commodity?.label ?? job.instrument_key}</div>
                              <div className="muted small">{job.side.toUpperCase()}</div>
                            </td>
                            <td>
                              <div className="fw-semibold">{job.job_name}</div>
                              <div className="muted small">{job.job_id}</div>
                            </td>
                            <td>
                              {job.has_open_trade ? (
                                <div>
                                  <div className="fw-semibold">{job.open_trade_option ?? "Open"}</div>
                                  <div className="muted small">
                                    Entry {job.open_trade_entry_ltp?.toFixed(2) ?? "-"} | Qty {job.open_trade_quantity}
                                  </div>
                                </div>
                              ) : (
                                <span className="muted">No open trade</span>
                              )}
                            </td>
                            <td>
                              {job.has_open_trade && job.unrealized_pnl_amount != null ? (
                                <div>
                                  <span className={`badge-soft ${pnlTone(job.unrealized_pnl_amount)}`}>
                                    MTM {fmtMoney(job.unrealized_pnl_amount)}
                                  </span>
                                  <div className="muted small mt-1">Realized {fmtMoney(job.total_realized_pnl)}</div>
                                </div>
                              ) : (
                                <span className={`badge-soft ${pnlTone(job.total_realized_pnl)}`}>
                                  Realized {fmtMoney(job.total_realized_pnl)}
                                </span>
                              )}
                            </td>
                            <td>{fmtDate(job.started_at)}</td>
                            <td>
                              <div className="d-flex flex-wrap gap-2">
                                <button
                                  className="btn btn-outline-light btn-sm"
                                  onClick={() => setExpandedJobId((prev) => (prev === job.job_id ? "" : job.job_id))}
                                >
                                  {expandedJobId === job.job_id ? "Hide" : "Details"}
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
                          {expandedJobId === job.job_id && (
                            <tr>
                              <td colSpan={7}>
                                <div className="row g-3">
                                  <div className="col-12 col-xl-4">
                                    <div className="small muted">
                                      <strong>Instrument Key:</strong> {job.instrument_key}
                                    </div>
                                    <div className="small muted">
                                      <strong>Greek Selection:</strong> {job.use_greek_selection ? "Enabled" : "Disabled"}
                                    </div>
                                    <div className="small muted">
                                      <strong>Cycles Limit:</strong> {job.max_cycles ?? "Unlimited"}
                                    </div>
                                    <div className="small muted">
                                      <strong>Polling:</strong> entry {job.entry_interval_sec}s / exit {job.exit_interval_sec}s
                                    </div>
                                    <div className="small muted">
                                      <strong>Current Spot:</strong> {job.current_spot != null ? job.current_spot.toFixed(2) : "-"}
                                    </div>
                                    <div className="small muted">
                                      <strong>Current Option:</strong>{" "}
                                      {job.current_option_ltp != null ? job.current_option_ltp.toFixed(2) : job.quote_error ?? "-"}
                                    </div>
                                    <div className="small muted">
                                      <strong>Store Path:</strong> {job.store_path}
                                    </div>
                                  </div>
                                  <div className="col-12 col-xl-8">
                                    <div className="fw-semibold small mb-2">Recent Logs</div>
                                    <pre className="mb-0 small" style={{ maxHeight: 240, overflow: "auto", whiteSpace: "pre-wrap" }}>
                                      {job.recent_logs.length ? job.recent_logs.join("\n") : "No logs captured yet."}
                                    </pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        {fleetView === "today"
                          ? "No MCX jobs active for today yet."
                          : "No historical MCX jobs match the selected date range."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="dashboard-panel mt-4" id="mcx-catalog">
          <h2 className="panel-title">MCX Commodity Catalog</h2>
          <div className="p-3">
            <div className="small muted mb-3">
              These are curated starter commodities. Once their underlying keys are set, they become ready to launch from this tab.
            </div>
            <div className="table-responsive">
              <table className="table table-dark-shell align-middle">
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>Status</th>
                    <th>Instrument Key</th>
                    <th>Lot Size</th>
                    <th>Trading Window</th>
                    <th>Env Variables</th>
                  </tr>
                </thead>
                <tbody>
                  {(commodities.length ? commodities : MCX_PRESETS.map((preset) => ({
                    label: preset.label,
                    instrument_key: "",
                    kind: "commodity" as const,
                    verified: false,
                    symbol: preset.symbol,
                    trading_symbol: preset.symbol,
                    exchange: "MCX",
                    isin: null,
                  }))).map((item) => {
                    const preset = presetForCommodity(item);
                    return (
                      <tr key={commoditySymbol(item)}>
                        <td>
                          <div className="fw-semibold">{item.label}</div>
                          <div className="muted small">{preset.note}</div>
                        </td>
                        <td>
                          <span className={`badge-soft ${item.instrument_key.trim() ? "green" : "gold"}`}>
                            {item.instrument_key.trim() ? "Configured" : "Pending"}
                          </span>
                        </td>
                        <td>
                          <div className="small">{item.instrument_key.trim() || "Set env var or paste manually in controls"}</div>
                        </td>
                        <td>{fmtNumber(preset.lot_size)}</td>
                        <td>
                          {preset.market_open} - {preset.time_exit}
                        </td>
                        <td>
                          <div className="small">{preset.env_vars.join(", ")}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
