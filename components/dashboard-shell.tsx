"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import {
    ActivityIcon,
    BotIcon,
    ChartCandlestickIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    CoinsIcon,
    FileTextIcon,
    FilterIcon,
    Layers3Icon,
    RefreshCwIcon,
    SlidersHorizontalIcon,
    SquareIcon,
    TargetIcon,
    TerminalIcon,
    Trash2Icon,
    TrendingDownIcon,
    TrendingUpIcon,
} from "@/components/dashboard/icons";

import {
    bulkDeleteUpstoxManagedBots,
    DashboardSnapshot,
    deleteAllUpstoxManagedBotHistory,
    deleteUpstoxManagedBot,
    fetchDashboardData,
    fetchUpstoxEntryRejectionSummary,
    fetchUpstoxManagedBotDashboardJobs,
    fetchUpstoxManagedBotDashboardSummary,
    fetchUpstoxManagedBotTrades,
    InstrumentCatalogResponse,
    MarketDataBrokerId,
    previewUpstoxOptionChainBot,
    runUpstoxOptionChainBot,
    setUpstoxManagedBotMode,
    squareOffUpstoxManagedBot,
    startUpstoxManagedBot,
    stopUpstoxManagedBot,
    TradeRecord,
    UpstoxEntryRejectionSummary,
    UpstoxManagedBotDashboardSummary,
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
const DASHBOARD_REFRESH_MS = 15000;
const MANAGED_BOTS_REFRESH_MS = 15000;
const MARKET_DATA_BROKERS: { value: MarketDataBrokerId; label: string }[] = [
  { value: "dhan", label: "Dhan" },
  { value: "upstox", label: "Upstox" },
  { value: "kite", label: "Kite" },
];



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

function botStatusMeta(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "running") {
    return { color: "#55D6A0", glow: "rgba(85, 214, 160, 0.5)", label: "Running" };
  }
  if (s === "completed") {
    return { color: "#E8BC55", glow: "rgba(232, 188, 85, 0.5)", label: "Completed" };
  }
  if (s === "failed" || s === "error") {
    return { color: "#F17884", glow: "rgba(241, 120, 132, 0.5)", label: "Failed" };
  }
  if (s === "starting" || s === "stopping") {
    return { color: "#6EA8FE", glow: "rgba(110, 168, 254, 0.5)", label: s === "starting" ? "Starting" : "Stopping" };
  }
  return { color: "#94A3B8", glow: "rgba(148, 163, 184, 0.4)", label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Idle" };
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

function pnlClass(amount?: number | null) {
  if (!amount) return "";
  if (amount > 0) return "text-[#55D6A0]";
  if (amount < 0) return "text-[#F17884]";
  return "";
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

function formatCleanInstrumentName(instrumentKey?: string | null, data?: DashboardState | null): string {
  if (!instrumentKey) return "-";
  const matched = data ? findInstrumentByKey(data, instrumentKey) : null;
  let raw = (matched?.label || instrumentKey).trim();

  // Strip segment prefixes like BSE_INDEX|, NSE_INDEX|, NSE_EQ|, BSE_EQ|, MCX_COMM|, etc.
  if (raw.includes("|")) {
    const parts = raw.split("|");
    raw = parts[parts.length - 1].trim();
  }

  // Handle standard index naming
  const upper = raw.toUpperCase();
  if (upper === "NIFTY 50" || upper === "NIFTY50" || upper === "NIFTY") return "NIFTY 50";
  if (upper === "NIFTY BANK" || upper === "BANKNIFTY" || upper === "NIFTY_BANK") return "BANKNIFTY";
  if (upper === "NIFTY FIN SERVICE" || upper === "FINNIFTY" || upper === "NIFTY_FIN_SERVICE") return "FINNIFTY";
  if (upper === "NIFTY MID SELECT" || upper === "MIDCPNIFTY" || upper === "NIFTY_MID_SELECT") return "MIDCPNIFTY";
  if (upper === "SENSEX" || upper === "BSE SENSEX") return "SENSEX";
  if (upper === "BANKEX" || upper === "BSE BANKEX") return "BANKEX";

  return raw;
}

function instrumentLabel(item: { label: string; verified: boolean }) {
  const clean = formatCleanInstrumentName(item.label);
  return item.verified ? clean : `${clean} (unverified)`;
}

type BotSide = "call" | "put";

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

// Today's date as YYYY-MM-DD in Asia/Kolkata. Used by the dashboard "today"
// view so jobs stay visible until IST midnight regardless of whether the user
// is browsing from a different timezone.
function istTodayKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // en-CA already produces YYYY-MM-DD, but be defensive about locale variants.
  return parts.length === 10 ? parts : parts.replace(/\//g, "-");
}

// Shape the {status_group, started_from, started_to} params for the dashboard
// managed-jobs list. "today" view returns every job started today (running OR
// closed) so day trades stay on the dashboard until IST midnight, then they
// roll off into history automatically.
function buildJobListingParams(
  view: ManagedJobsView,
  historyRange: { startedFrom?: string; startedTo?: string },
): { status_group: "active" | "history" | "all"; started_from?: string; started_to?: string } {
  if (view === "today") {
    return {
      status_group: "all",
      started_from: istTodayKey(),
      started_to: undefined,
    };
  }
  return {
    status_group: "history",
    started_from: historyRange.startedFrom,
    started_to: historyRange.startedTo,
  };
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

function latestManagedBotExecutionLine(job: UpstoxManagedBotJob) {
  const markers = [
    "] ENTRY",
    "] EXIT",
    "] HOLD",
    "] SKIP",
    "LIVE ENTRY ORDER REJECTED",
    "LIVE EXIT ORDER REJECTED",
    "SQUARE OFF",
  ];
  return [...(job.recent_logs ?? [])]
    .reverse()
    .find((line) => markers.some((marker) => line.toUpperCase().includes(marker)));
}


function reasonCodePatterns(reasonCode?: string | null): string[] {
  const normalized = String(reasonCode || "").trim().toLowerCase();
  if (!normalized) {
    return [];
  }
  const table: Record<string, string[]> = {
    no_signal: ["no", "entry signal"],
    entry_filter: ["entry filter", "ema20"],
    time_window: ["no_trade_window", "trading window"],
    exit_active: ["exit signal is active"],
    min_bid_qty: ["min_entry_bid_qty", "bid quantity"],
    min_volume: ["min_entry_volume", "volume"],
    min_oi: ["min_entry_oi", "open interest"],
    spread: ["spread"],
    oi_wall: ["oi wall"],
    security_mismatch: ["security id", "security-id"],
    selection_failed: ["option selection failed"],
    live_validation: ["live entry validation", "wait"],
    broker_rejected: ["rejected", "broker error"],
  };
  return table[normalized] ?? [normalized.replace(/_/g, " "), normalized];
}

function managedJobMatchesReasonHint(job: UpstoxManagedBotJob, reasonCode?: string | null) {
  const patterns = reasonCodePatterns(reasonCode);
  if (!patterns.length) {
    return false;
  }
  const haystack = [
    latestManagedBotExecutionLine(job) || "",
    ...(job.recent_logs ?? []).slice(-10),
  ]
    .join("\n")
    .toLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern));
}

function managedBotHistoryRange(
  preset: ManagedJobsHistoryPreset,
  customFrom: string,
  customTo: string,
) {
  const now = new Date();
  const yesterdayKey = localDateKey(shiftLocalDate(now, -1));
  const last7StartKey = localDateKey(shiftLocalDate(now, -7));
  const last30StartKey = localDateKey(shiftLocalDate(now, -30));

  if (preset === "yesterday") {
    return { startedFrom: yesterdayKey, startedTo: yesterdayKey };
  }
  if (preset === "last7") {
    return { startedFrom: last7StartKey, startedTo: yesterdayKey };
  }
  if (preset === "last30") {
    return { startedFrom: last30StartKey, startedTo: yesterdayKey };
  }
  return {
    startedFrom: customFrom || undefined,
    startedTo: customTo || undefined,
  };
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

function isManagedBotDeletable(job: UpstoxManagedBotJob) {
  return !managedBotIsLive(job) && !job.has_open_trade;
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
  const [managedBotsSummary, setManagedBotsSummary] = useState<UpstoxManagedBotDashboardSummary | null>(null);
  const [rejectionSummary, setRejectionSummary] = useState<UpstoxEntryRejectionSummary | null>(null);
  const [rejectionSummaryError, setRejectionSummaryError] = useState("");
  const [rejectionSinceHours, setRejectionSinceHours] = useState(24);
  const [rejectionInstrumentFilter, setRejectionInstrumentFilter] = useState("all");
  const [rejectionStrategyFilter, setRejectionStrategyFilter] = useState("all");
  const [managedBotsLoading, setManagedBotsLoading] = useState(true);
  const [managedBotAction, setManagedBotAction] = useState<string>("");
  const [expandedBotJobId, setExpandedBotJobId] = useState<string>("");
  const [managedBotTradesJob, setManagedBotTradesJob] = useState<UpstoxManagedBotJob | null>(null);
  const [managedBotTrades, setManagedBotTrades] = useState<UpstoxManagedBotTrade[]>([]);
  const [managedBotTradesLoading, setManagedBotTradesLoading] = useState(false);
  const [managedBotTradesError, setManagedBotTradesError] = useState("");
  const [managedBotModeId, setManagedBotModeId] = useState<string | null>(null);
  const [managedJobsView, setManagedJobsView] = useState<ManagedJobsView>("today");
  const [managedJobsHistoryPreset, setManagedJobsHistoryPreset] = useState<ManagedJobsHistoryPreset>("last7");
  const [managedJobsHistoryFrom, setManagedJobsHistoryFrom] = useState("");
  const [managedJobsHistoryTo, setManagedJobsHistoryTo] = useState("");
  const [managedJobsStrategyFilter, setManagedJobsStrategyFilter] = useState("all");
  const [managedJobsInstrumentFilter, setManagedJobsInstrumentFilter] = useState("all");
  const [managedJobsReasonHint, setManagedJobsReasonHint] = useState<string | null>(null);
  const [managedJobsMatchedOnly, setManagedJobsMatchedOnly] = useState(false);
  const [managedJobsLiveOnly, setManagedJobsLiveOnly] = useState(false);
  const [managedBotsTotalCount, setManagedBotsTotalCount] = useState(0);
  const [managedBotsCurrentPage, setManagedBotsCurrentPage] = useState(1);
  const [managedBotsTotalPages, setManagedBotsTotalPages] = useState(1);
  const [managedBotsPageSize, setManagedBotsPageSize] = useState(20);
  const [selectedManagedBotIds, setSelectedManagedBotIds] = useState<string[]>([]);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [showFullLogModal, setShowFullLogModal] = useState(false);
  const [fleetSearchQuery, setFleetSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [botForm, setBotForm] = useState<UpstoxOptionChainBotRunRequest>({
    instrument_key: "NSE_INDEX|Nifty 50",
    expiry: "",
    execution_mode: "paper",
    execution_broker: "kotak" as "kotak" | "upstox" | "kite",
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
    use_ema20_entry_filter: true,
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

  useEffect(() => {
    let active = true;
    let initialLoad = true;
    let loadingRequest = false;

    async function load() {
      if (loadingRequest) {
        return;
      }
      try {
        loadingRequest = true;
        if (initialLoad) {
          setLoading(true);
        }
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
        loadingRequest = false;
        if (active) {
          setLoading(false);
        }
        initialLoad = false;
      }
    }

    load();
    const intervalId = window.setInterval(load, DASHBOARD_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let loadingRequest = false;

    async function loadManagedBotSummary() {
      if (loadingRequest) {
        return;
      }
      try {
        loadingRequest = true;
        const result = await fetchUpstoxManagedBotDashboardSummary();
        if (!active) {
          return;
        }
        setManagedBotsSummary(result);
      } catch (err) {
        if (!active) {
          return;
        }
        setBotMessage(err instanceof Error ? err.message : "Failed to load managed bot summary");
        setBotMessageTone("error");
      } finally {
        loadingRequest = false;
      }
    }

    loadManagedBotSummary();
    const intervalId = window.setInterval(loadManagedBotSummary, MANAGED_BOTS_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let loadingRequest = false;

    async function loadRejections() {
      if (loadingRequest) {
        return;
      }
      try {
        loadingRequest = true;
        if (typeof fetchUpstoxEntryRejectionSummary !== "function") {
          if (!active) {
            return;
          }
          setRejectionSummary({
            since_hours: rejectionSinceHours,
            instrument_key:
              rejectionInstrumentFilter !== "all" ? rejectionInstrumentFilter : null,
            strategy_id: rejectionStrategyFilter !== "all" ? rejectionStrategyFilter : null,
            total_events: 0,
            reason_counts: [],
          });
          setRejectionSummaryError(
            "Telemetry client is stale in dev bundle. Save this file or restart Next dev server.",
          );
          return;
        }
        const result = await fetchUpstoxEntryRejectionSummary({
          since_hours: rejectionSinceHours,
          instrument_key:
            rejectionInstrumentFilter !== "all" ? rejectionInstrumentFilter : undefined,
          strategy_id: rejectionStrategyFilter !== "all" ? rejectionStrategyFilter : undefined,
        });
        if (!active) {
          return;
        }
        setRejectionSummary(result);
        setRejectionSummaryError("");
      } catch (err) {
        if (!active) {
          return;
        }
        setRejectionSummary(null);
        setRejectionSummaryError(
          err instanceof Error ? err.message : "Failed to load rejection telemetry",
        );
      } finally {
        loadingRequest = false;
      }
    }

    loadRejections();
    const intervalId = window.setInterval(loadRejections, MANAGED_BOTS_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [rejectionInstrumentFilter, rejectionSinceHours, rejectionStrategyFilter]);

  useEffect(() => {
    let active = true;
    let loadingRequest = false;
    const historyRange =
      managedJobsView === "history"
        ? managedBotHistoryRange(
            managedJobsHistoryPreset,
            managedJobsHistoryFrom,
            managedJobsHistoryTo,
          )
        : { startedFrom: undefined, startedTo: undefined };
    const listingParams = buildJobListingParams(managedJobsView, historyRange);

    async function loadManagedBots() {
      if (loadingRequest) {
        return;
      }
      try {
        loadingRequest = true;
        const result = await fetchUpstoxManagedBotDashboardJobs({
          ...listingParams,
          limit: managedBotsPageSize,
          page: managedBotsCurrentPage,
          strategy_id: managedJobsStrategyFilter,
        });
        if (!active) {
          return;
        }
        setManagedBots(result.items);
        setManagedBotsTotalCount(result.total_count);
        setManagedBotsCurrentPage(result.page);
        setManagedBotsTotalPages(result.total_pages);
      } catch (err) {
        if (!active) {
          return;
        }
        setBotMessage(err instanceof Error ? err.message : "Failed to load managed bot jobs");
        setBotMessageTone("error");
      } finally {
        loadingRequest = false;
        if (active) {
          setManagedBotsLoading(false);
        }
      }
    }

    setManagedBotsLoading(true);
    loadManagedBots();
    const intervalId = window.setInterval(loadManagedBots, MANAGED_BOTS_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [
    managedBotsCurrentPage,
    managedBotsPageSize,
    managedJobsHistoryFrom,
    managedJobsHistoryPreset,
    managedJobsHistoryTo,
    managedJobsStrategyFilter,
    managedJobsView,
  ]);

  useEffect(() => {
    setManagedBotsCurrentPage(1);
  }, [
    managedJobsInstrumentFilter,
    managedBotsPageSize,
    managedJobsHistoryFrom,
    managedJobsHistoryPreset,
    managedJobsHistoryTo,
    managedJobsStrategyFilter,
    managedJobsView,
  ]);

  useEffect(() => {
    setSelectedManagedBotIds([]);
  }, [
    managedJobsInstrumentFilter,
    managedBotsCurrentPage,
    managedBotsPageSize,
    managedJobsHistoryFrom,
    managedJobsHistoryPreset,
    managedJobsHistoryTo,
    managedJobsStrategyFilter,
    managedJobsView,
  ]);

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
        execution_mode: botForm.execution_mode,
        execution_broker: botForm.execution_mode === "live" ? (botForm.execution_broker ?? "kotak") : null,
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
        use_ema20_entry_filter: botForm.use_ema20_entry_filter,
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
      setManagedBotsCurrentPage(1);
      const [summary, jobsPage] = await Promise.all([
        fetchUpstoxManagedBotDashboardSummary(),
        fetchUpstoxManagedBotDashboardJobs({
          ...buildJobListingParams(managedJobsView, managedJobsHistoryRange),
          limit: managedBotsPageSize,
          page: 1,
          strategy_id: managedJobsStrategyFilter,
        }),
      ]);
      setManagedBotsSummary(summary);
      setManagedBots(jobsPage.items);
      setManagedBotsTotalCount(jobsPage.total_count);
      setManagedBotsCurrentPage(jobsPage.page);
      setManagedBotsTotalPages(jobsPage.total_pages);
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
      const [summary, jobsPage] = await Promise.all([
        fetchUpstoxManagedBotDashboardSummary(),
        fetchUpstoxManagedBotDashboardJobs({
          ...buildJobListingParams(managedJobsView, managedJobsHistoryRange),
          limit: managedBotsPageSize,
          page: managedBotsCurrentPage,
          strategy_id: managedJobsStrategyFilter,
        }),
      ]);
      setManagedBotsSummary(summary);
      setManagedBots(jobsPage.items);
      setManagedBotsTotalCount(jobsPage.total_count);
      setManagedBotsCurrentPage(jobsPage.page);
      setManagedBotsTotalPages(jobsPage.total_pages);
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to stop managed bot");
      setBotMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  async function handleSetManagedBotMode(job: UpstoxManagedBotJob, targetMode: "paper" | "live") {
    if (job.execution_mode === targetMode) {
      return;
    }

    const confirmed = window.confirm(
      targetMode === "live"
        ? `Switch "${job.job_name}" (${job.job_id}) to LIVE mode? (Takes effect on next start; server may still reject live orders unless approved.)`
        : `Switch "${job.job_name}" (${job.job_id}) to PAPER mode? (Takes effect on next start.)`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setManagedBotModeId(job.job_id);
      setBotMessage("");
      setBotMessageTone("success");
      const updated = await setUpstoxManagedBotMode(job.job_id, { execution_mode: targetMode });
      setManagedBots((prev) => prev.map((item) => (item.job_id === updated.job_id ? updated : item)));
      const resolvedMode = (updated.execution_mode ?? targetMode).toUpperCase();
      setBotMessage(`Job mode set to ${resolvedMode} for ${updated.job_name}.`);
      setBotMessageTone("success");
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to update job mode");
      setBotMessageTone("error");
    } finally {
      setManagedBotModeId(null);
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
      const [summary, jobsPage] = await Promise.all([
        fetchUpstoxManagedBotDashboardSummary(),
        fetchUpstoxManagedBotDashboardJobs({
          ...buildJobListingParams(managedJobsView, managedJobsHistoryRange),
          limit: managedBotsPageSize,
          page: managedBotsCurrentPage,
          strategy_id: managedJobsStrategyFilter,
        }),
      ]);
      setManagedBotsSummary(summary);
      setManagedBots(jobsPage.items);
      setManagedBotsTotalCount(jobsPage.total_count);
      setManagedBotsCurrentPage(jobsPage.page);
      setManagedBotsTotalPages(jobsPage.total_pages);
      setExpandedBotJobId(jobId);
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to square off managed bot trade");
      setBotMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  async function handleDeleteManagedBot(job: UpstoxManagedBotJob) {
    const confirmed = window.confirm(
      `Delete historical job "${job.job_name}" and remove its persisted runtime/trade history?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setManagedBotAction(`delete:${job.job_id}`);
      const result = await deleteUpstoxManagedBot(job.job_id);
      setBotMessage(
        result.deleted_store_file
          ? `Deleted history for ${result.job_name} and removed its managed DB file.`
          : `Deleted history for ${result.job_name}.`,
      );
      setBotMessageTone("success");
      const [summary, jobsPage] = await Promise.all([
        fetchUpstoxManagedBotDashboardSummary(),
        fetchUpstoxManagedBotDashboardJobs({
          ...buildJobListingParams(managedJobsView, managedJobsHistoryRange),
          limit: managedBotsPageSize,
          page: managedBotsCurrentPage,
          strategy_id: managedJobsStrategyFilter,
        }),
      ]);
      setManagedBotsSummary(summary);
      setManagedBots(jobsPage.items);
      setManagedBotsTotalCount(jobsPage.total_count);
      setManagedBotsCurrentPage(jobsPage.page);
      setManagedBotsTotalPages(jobsPage.total_pages);
      setSelectedManagedBotIds((prev) => prev.filter((jobId) => jobId !== job.job_id));
      if (expandedBotJobId === job.job_id) {
        setExpandedBotJobId("");
      }
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to delete managed bot history");
      setBotMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  async function handleBulkDeleteManagedBots() {
    if (!selectedManagedBotIds.length) {
      return;
    }
    const confirmed = window.confirm(
      `Delete history for ${selectedManagedBotIds.length} selected job(s)? Active jobs and jobs with open trades will be skipped.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setManagedBotAction("bulk-delete");
      const result = await bulkDeleteUpstoxManagedBots(selectedManagedBotIds);
      const message =
        result.failed_count > 0
          ? `Bulk delete finished: deleted ${result.deleted_count}, failed ${result.failed_count}.`
          : `Bulk delete finished: deleted ${result.deleted_count} job(s).`;
      setBotMessage(message);
      setBotMessageTone(result.failed_count > 0 ? "error" : "success");
      setSelectedManagedBotIds([]);
      const [summary, jobsPage] = await Promise.all([
        fetchUpstoxManagedBotDashboardSummary(),
        fetchUpstoxManagedBotDashboardJobs({
          ...buildJobListingParams(managedJobsView, managedJobsHistoryRange),
          limit: managedBotsPageSize,
          page: managedBotsCurrentPage,
          strategy_id: managedJobsStrategyFilter,
        }),
      ]);
      setManagedBotsSummary(summary);
      setManagedBots(jobsPage.items);
      setManagedBotsTotalCount(jobsPage.total_count);
      setManagedBotsCurrentPage(jobsPage.page);
      setManagedBotsTotalPages(jobsPage.total_pages);
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to bulk delete managed bot history");
      setBotMessageTone("error");
    } finally {
      setManagedBotAction("");
    }
  }

  async function handleDeleteAllManagedBotHistory() {
    const confirmed = window.confirm(
      "Delete all historical managed bot logs? Active jobs and jobs with open trades will be kept.",
    );
    if (!confirmed) {
      return;
    }

    try {
      setManagedBotAction("delete-all-history");
      const result = await deleteAllUpstoxManagedBotHistory();
      const message =
        result.failed_count > 0
          ? `Delete all logs finished: deleted ${result.deleted_count}, failed ${result.failed_count}.`
          : `Deleted ${result.deleted_count} historical log(s).`;
      setBotMessage(message);
      setBotMessageTone(result.failed_count > 0 ? "error" : "success");
      setSelectedManagedBotIds([]);
      setExpandedBotJobId("");
      const [summary, jobsPage] = await Promise.all([
        fetchUpstoxManagedBotDashboardSummary(),
        fetchUpstoxManagedBotDashboardJobs({
          ...buildJobListingParams(managedJobsView, managedJobsHistoryRange),
          limit: managedBotsPageSize,
          page: 1,
          strategy_id: managedJobsStrategyFilter,
        }),
      ]);
      setManagedBotsSummary(summary);
      setManagedBots(jobsPage.items);
      setManagedBotsTotalCount(jobsPage.total_count);
      setManagedBotsCurrentPage(jobsPage.page);
      setManagedBotsTotalPages(jobsPage.total_pages);
    } catch (err) {
      setBotMessage(err instanceof Error ? err.message : "Failed to delete all managed bot logs");
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

  function jumpToManagedFleetWithTelemetryFilters(reasonCode?: string) {
    setManagedJobsView("history");
    setManagedJobsStrategyFilter(rejectionStrategyFilter);
    setManagedJobsInstrumentFilter(rejectionInstrumentFilter);
    setManagedJobsReasonHint(reasonCode ? String(reasonCode) : null);
    setManagedJobsMatchedOnly(Boolean(reasonCode));
    setManagedJobsLiveOnly(false);
    setManagedBotsCurrentPage(1);
    document.getElementById("managed-bot-fleet")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const activeManagedBots = managedBotsSummary?.active_jobs ?? managedBots.filter((job) =>
    job.status === "starting" || job.status === "running" || job.status === "stopping",
  ).length;
  const openManagedTrades = managedBotsSummary?.open_bot_trades ?? managedBots.filter((job) => job.has_open_trade).length;
  const totalManagedInvestment = managedBotsSummary?.total_investment ?? managedBots.reduce(
    (sum, job) =>
      sum + (job.has_open_trade ? Number(job.open_trade_entry_ltp || 0) * Number(job.open_trade_quantity || 0) : 0),
    0,
  );
  const grossProfit = managedBotsSummary?.gross_profit ?? managedBots.reduce((sum, job) => {
    const total = Number(job.total_realized_pnl || 0) + Number(job.unrealized_pnl_amount || 0);
    return total > 0 ? sum + total : sum;
  }, 0);
  const grossLoss = managedBotsSummary?.gross_loss ?? managedBots.reduce((sum, job) => {
    const total = Number(job.total_realized_pnl || 0) + Number(job.unrealized_pnl_amount || 0);
    return total < 0 ? sum + Math.abs(total) : sum;
  }, 0);
  const todayRealizedPnl = managedBotsSummary?.today_realized_pnl ?? managedBots.reduce((sum, job) => sum + Number(job.today_realized_pnl || 0), 0);
  const fleetRealizedPnl = managedBotsSummary?.fleet_realized_pnl ?? managedBots.reduce((sum, job) => sum + job.total_realized_pnl, 0);
  const trackedExecutionSymbols = instruments.indices.length + instruments.stocks.length;
  const todayKey = localDateKey(new Date());
  const managedJobsHistoryRange = managedBotHistoryRange(
    managedJobsHistoryPreset,
    managedJobsHistoryFrom,
    managedJobsHistoryTo,
  );
  const todayManagedBots = managedJobsView === "today"
    ? [...managedBots].sort(compareManagedBotsForTodayDesk)
    : [];
  const historicalManagedBots = managedJobsView === "history"
    ? [...managedBots].sort(compareManagedBotsByStartedDesc)
    : [];
  const managedJobsStrategyOptions = Array.from(
    new Map(
      managedBots.map((job) => [job.strategy_id, job.strategy_label || job.strategy_id]),
    ).entries(),
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const managedJobsInstrumentOptions = Array.from(
    new Set(managedBots.map((job) => job.instrument_key)),
  )
    .filter((value) => Boolean(value))
    .sort((a, b) => a.localeCompare(b));
  const rejectionInstrumentOptions = Array.from(
    new Set([
      botForm.instrument_key,
      ...managedBots.map((job) => job.instrument_key),
      ...instruments.indices.map((item) => item.instrument_key),
    ]),
  )
    .filter((value) => Boolean(value))
    .sort((a, b) => a.localeCompare(b));
  const rejectionStrategyOptions = Array.from(
    new Map([
      ...CALL_STRATEGY_OPTIONS.map((item) => [item.value, item.label] as const),
      ...PUT_STRATEGY_OPTIONS.map((item) => [item.value, item.label] as const),
      ...managedJobsStrategyOptions.map((item) => [item.value, item.label] as const),
    ]).entries(),
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const filteredTodayManagedBots =
    managedJobsInstrumentFilter === "all"
      ? todayManagedBots
      : todayManagedBots.filter((job) => job.instrument_key === managedJobsInstrumentFilter);
  const filteredHistoricalManagedBots =
    managedJobsInstrumentFilter === "all"
      ? historicalManagedBots
      : historicalManagedBots.filter(
          (job) => job.instrument_key === managedJobsInstrumentFilter,
        );
  const visibleManagedBots = managedJobsView === "today" ? filteredTodayManagedBots : filteredHistoricalManagedBots;
  const modeFilteredManagedBots = managedJobsLiveOnly
    ? visibleManagedBots.filter((job) => job.execution_mode === "live")
    : visibleManagedBots;
  const highlightedManagedJobIds = new Set(
    modeFilteredManagedBots
      .filter((job) => managedJobMatchesReasonHint(job, managedJobsReasonHint))
      .map((job) => job.job_id),
  );
  const highlightedManagedJobsCount = highlightedManagedJobIds.size;
  const reasonFilteredManagedBots =
    managedJobsMatchedOnly && managedJobsReasonHint
      ? modeFilteredManagedBots.filter((job) => highlightedManagedJobIds.has(job.job_id))
      : modeFilteredManagedBots;
  const deletableVisibleManagedBotIds = reasonFilteredManagedBots
    .filter((job) => isManagedBotDeletable(job))
    .map((job) => job.job_id);
  const allVisibleManagedBotsSelected =
    deletableVisibleManagedBotIds.length > 0 &&
    deletableVisibleManagedBotIds.every((jobId) => selectedManagedBotIds.includes(jobId));
  const todayStartedManagedBots = filteredTodayManagedBots.filter((job) => managedBotStartedKey(job) === todayKey).length;
  const carryForwardManagedBots = filteredTodayManagedBots.filter(
    (job) => managedBotIsLive(job) && managedBotStartedKey(job) !== todayKey,
  ).length;
  const visibleManagedRealizedPnl = reasonFilteredManagedBots.reduce((sum, job) => sum + Number(job.total_realized_pnl || 0), 0);
  const visibleManagedTotalPnl = reasonFilteredManagedBots.reduce(
    (sum, job) => sum + Number(job.total_realized_pnl || 0) + Number(job.unrealized_pnl_amount || 0),
    0,
  );

  const topRejectionReasons = (rejectionSummary?.reason_counts ?? []).slice(0, 5);

  const searchedManagedBots = useMemo(() => {
    if (!fleetSearchQuery.trim()) return reasonFilteredManagedBots;
    const query = fleetSearchQuery.toLowerCase().trim();
    return reasonFilteredManagedBots.filter(
      (job) =>
        job.job_name.toLowerCase().includes(query) ||
        job.instrument_key.toLowerCase().includes(query) ||
        job.strategy_label.toLowerCase().includes(query) ||
        job.job_id.toLowerCase().includes(query),
    );
  }, [reasonFilteredManagedBots, fleetSearchQuery]);

  async function handleRefreshAll() {
    try {
      setRefreshing(true);
      const [dashRes, sumRes] = await Promise.allSettled([
        fetchDashboardData(),
        fetchUpstoxManagedBotDashboardSummary(),
      ]);
      if (dashRes.status === "fulfilled") {
        setData(dashRes.value);
      }
      if (sumRes.status === "fulfilled") {
        setManagedBotsSummary(sumRes.value);
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="app-frame execution-desk-workspace">
        {/* D. Compact Execution Desk Header (~60-72px) */}
        <header className="execution-desk-header">
          <div className="execution-desk-header-left">
            <h1 className="execution-desk-title">Execution Desk</h1>
            <p className="execution-desk-subtitle">Configure, launch and monitor your trading bots</p>
          </div>
          <div className="execution-desk-summary-pill">
            <span className={`badge-soft ${botForm.execution_mode === "live" ? "blue" : "gold"} font-mono`}>
              {botForm.execution_mode === "live" ? "LIVE" : "PAPER"}
            </span>
            <div className="execution-desk-summary-item">
              <span>Active:</span>
              <strong className="font-mono">{activeManagedBots}</strong>
            </div>
            <div className="execution-desk-summary-item">
              <span>Open:</span>
              <strong className="font-mono">{openManagedTrades}</strong>
            </div>
            <div className="execution-desk-summary-item">
              <span>Today P/L:</span>
              <strong className={`font-mono ${pnlClass(todayRealizedPnl)}`}>
                {fmtMoney(todayRealizedPnl)}
              </strong>
            </div>
            <div className="execution-desk-summary-item">
              <span>Invested:</span>
              <strong className="font-mono">{fmtMoney(totalManagedInvestment)}</strong>
            </div>
            <button
              className="btn btn-outline-light btn-sm ms-1"
              disabled={loading || managedBotsLoading || refreshing}
              onClick={() => void handleRefreshAll()}
              title="Refresh desk"
              type="button"
            >
              <RefreshCwIcon style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </header>

        {/* Global Notifications */}
        {botMessage && (
          <div className={`alert ${botMessageTone === "success" ? "alert-success" : "alert-danger"} py-2 mb-0`}>
            {botMessage}
          </div>
        )}
        {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}

        {/* E. Compact KPI Strip (8 cards in one row on desktop) */}
        <section className="execution-desk-kpi-grid">
          {/* 1. Managed Jobs (blue) */}
          <div className="compact-kpi-card kpi-blue">
            <div className="compact-kpi-icon kpi-icon-blue">
              <BotIcon />
            </div>
            <div className="compact-kpi-body">
              <span className="compact-kpi-label">Managed Jobs</span>
              <span className="compact-kpi-value">{managedBotsSummary?.managed_jobs ?? managedBotsTotalCount}</span>
            </div>
          </div>

          {/* 2. Active Jobs (teal) */}
          <div className="compact-kpi-card kpi-teal">
            <div className="compact-kpi-icon kpi-icon-teal">
              <ActivityIcon />
            </div>
            <div className="compact-kpi-body">
              <span className="compact-kpi-label">Active Jobs</span>
              <span className="compact-kpi-value">{activeManagedBots}</span>
            </div>
          </div>

          {/* 3. Open Trades (purple) */}
          <div className="compact-kpi-card kpi-purple">
            <div className="compact-kpi-icon kpi-icon-purple">
              <Layers3Icon />
            </div>
            <div className="compact-kpi-body">
              <span className="compact-kpi-label">Open Trades</span>
              <span className="compact-kpi-value">{openManagedTrades}</span>
            </div>
          </div>

          {/* 4. Today P/L (green/red) */}
          <div className={`compact-kpi-card ${todayRealizedPnl >= 0 ? "kpi-green" : "kpi-red"}`}>
            <div className={`compact-kpi-icon ${todayRealizedPnl >= 0 ? "kpi-icon-green" : "kpi-icon-red"}`}>
              {todayRealizedPnl >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
            </div>
            <div className="compact-kpi-body">
              <span className="compact-kpi-label">Today P/L</span>
              <span className={`compact-kpi-value ${pnlClass(todayRealizedPnl)}`}>{fmtMoney(todayRealizedPnl)}</span>
            </div>
          </div>

          {/* 5. Gross Profit (green) */}
          <div className="compact-kpi-card kpi-green">
            <div className="compact-kpi-icon kpi-icon-green">
              <CoinsIcon />
            </div>
            <div className="compact-kpi-body">
              <span className="compact-kpi-label">Gross Profit</span>
              <span className="compact-kpi-value text-[#55D6A0]">{fmtMoney(grossProfit)}</span>
            </div>
          </div>

          {/* 6. Gross Loss (red) */}
          <div className="compact-kpi-card kpi-red">
            <div className="compact-kpi-icon kpi-icon-red">
              <TrendingDownIcon />
            </div>
            <div className="compact-kpi-body">
              <span className="compact-kpi-label">Gross Loss</span>
              <span className="compact-kpi-value text-[#F17884]">{fmtMoney(grossLoss)}</span>
            </div>
          </div>

          {/* 7. Fleet P/L (cyan/blue) */}
          <div className={`compact-kpi-card ${fleetRealizedPnl >= 0 ? "kpi-cyan" : "kpi-red"}`}>
            <div className={`compact-kpi-icon ${fleetRealizedPnl >= 0 ? "kpi-icon-cyan" : "kpi-icon-red"}`}>
              <TargetIcon />
            </div>
            <div className="compact-kpi-body">
              <span className="compact-kpi-label">Fleet P/L</span>
              <span className={`compact-kpi-value ${pnlClass(fleetRealizedPnl)}`}>{fmtMoney(fleetRealizedPnl)}</span>
            </div>
          </div>

          {/* 8. Tradable Symbols (amber) */}
          <div className="compact-kpi-card kpi-amber">
            <div className="compact-kpi-icon kpi-icon-amber">
              <ChartCandlestickIcon />
            </div>
            <div className="compact-kpi-body">
              <span className="compact-kpi-label">Tradable Symbols</span>
              <span className="compact-kpi-value text-[#E8BC55]">{trackedExecutionSymbols}</span>
            </div>
          </div>
        </section>

        {/* F. Main 2-Column Working Area (~65% / ~35%) */}
        <div className="execution-desk-grid">
          {/* LEFT: Bot Configuration Panel */}
          <div className="desk-panel">
            <div className="desk-panel-header">
              <h2 className="desk-panel-title">
                <SlidersHorizontalIcon />
                <span>Bot Configuration</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {botForm.side.toUpperCase()} • {strategyOptionsForSide(botForm.side).find((s) => s.value === botForm.strategy_id)?.label ?? botForm.strategy_id}
              </span>
            </div>

            {/* Compact Field Grid */}
            <div className="row g-2">
              <div className="col-12 col-sm-6 col-xl-4">
                <label className="bot-field-label">Instrument</label>
                <select
                  className="bot-field-select font-mono"
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

              <div className="col-6 col-sm-3 col-xl-2">
                <label className="bot-field-label">Side</label>
                <select
                  className="bot-field-select"
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

              <div className="col-12 col-sm-6 col-xl-3">
                <label className="bot-field-label">Strategy</label>
                <select
                  className="bot-field-select"
                  value={botForm.strategy_id}
                  onChange={(e) => setBotForm((prev) => ({ ...prev, strategy_id: e.target.value }))}
                >
                  {strategyOptionsForSide(botForm.side).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-sm-3 col-xl-3">
                <label className="bot-field-label">Data Broker</label>
                <select
                  className="bot-field-select"
                  value={botForm.market_data_broker}
                  onChange={(e) =>
                    setBotForm((prev) => {
                      const marketDataBroker = e.target.value as MarketDataBrokerId;
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
                  {MARKET_DATA_BROKERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2 */}
              <div className="col-6 col-sm-4 col-xl-2">
                <label className="bot-field-label">Mode</label>
                <select
                  className="bot-field-select"
                  value={botForm.execution_mode}
                  onChange={(e) =>
                    setBotForm((prev) => ({
                      ...prev,
                      execution_mode: e.target.value as "paper" | "live",
                    }))
                  }
                >
                  <option value="paper">Paper</option>
                  <option value="live">Live</option>
                </select>
              </div>

              <div className="col-6 col-sm-4 col-xl-3">
                <label className="bot-field-label">Execution Broker</label>
                <select
                  className="bot-field-select"
                  disabled={botForm.execution_mode !== "live"}
                  value={botForm.execution_broker ?? "kotak"}
                  onChange={(e) =>
                    setBotForm((prev) => ({
                      ...prev,
                      execution_broker: e.target.value as "kotak" | "upstox" | "kite",
                    }))
                  }
                >
                  <option value="kotak">Kotak Neo</option>
                  <option value="upstox">Upstox</option>
                  <option value="kite">Kite (Zerodha)</option>
                </select>
              </div>

              <div className="col-4 col-sm-4 col-xl-2">
                <label className="bot-field-label">Interval</label>
                <input
                  className="bot-field-input font-mono"
                  value={botForm.candle_interval}
                  onChange={(e) => setBotForm((prev) => ({ ...prev, candle_interval: e.target.value }))}
                />
              </div>

              <div className="col-4 col-sm-4 col-xl-2">
                <label className="bot-field-label" title="-1 ITM / 0 ATM / +1 OTM">Offset</label>
                <input
                  className="bot-field-input font-mono"
                  type="number"
                  value={botForm.strike_offset}
                  placeholder="0"
                  onChange={(e) =>
                    setBotForm((prev) => ({ ...prev, strike_offset: Number(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="col-4 col-sm-4 col-xl-3">
                <label className="bot-field-label">Max Entry LTP</label>
                <input
                  className="bot-field-input font-mono"
                  type="number"
                  value={botForm.max_entry_ltp}
                  onChange={(e) =>
                    setBotForm((prev) => ({ ...prev, max_entry_ltp: Number(e.target.value) || 0 }))
                  }
                />
              </div>

              {/* Row 3 */}
              <div className="col-4 col-sm-4 col-xl-2">
                <label className="bot-field-label">Lots</label>
                <input
                  className="bot-field-input font-mono"
                  type="number"
                  value={botForm.lots}
                  onChange={(e) => setBotForm((prev) => ({ ...prev, lots: Number(e.target.value) || 1 }))}
                />
              </div>

              <div className="col-4 col-sm-4 col-xl-2">
                <label className="bot-field-label">Lot Size</label>
                <input
                  className="bot-field-input font-mono"
                  type="number"
                  value={botForm.lot_size}
                  onChange={(e) => setBotForm((prev) => ({ ...prev, lot_size: Number(e.target.value) || 1 }))}
                />
              </div>

              <div className="col-4 col-sm-4 col-xl-3">
                <label className="bot-field-label">Expiry</label>
                <input
                  className="bot-field-input font-mono"
                  placeholder="YYYY-MM-DD"
                  value={botForm.expiry ?? ""}
                  onChange={(e) => setBotForm((prev) => ({ ...prev, expiry: e.target.value }))}
                />
              </div>

              <div className="col-6 col-sm-4 col-xl-3">
                <label className="bot-field-label">Risk Model</label>
                <select
                  className="bot-field-select"
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

              <div className="col-6 col-sm-4 col-xl-2">
                <label className="bot-field-label">Max Cycles</label>
                <input
                  className="bot-field-input font-mono"
                  type="number"
                  min={1}
                  placeholder="∞"
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

              {botForm.risk_model === "risk_amount" && (
                <div className="col-12 col-sm-6 col-xl-4">
                  <label className="bot-field-label">Risk Amount (₹)</label>
                  <input
                    className="bot-field-input font-mono"
                    type="number"
                    min={1}
                    placeholder="e.g. 1000"
                    value={botForm.risk_amount ?? ""}
                    onChange={(e) =>
                      setBotForm((prev) => ({ ...prev, risk_amount: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                  <div className="small muted mt-1 font-mono text-xs">
                    SL = {botForm.risk_amount && botForm.lots && botForm.lot_size
                      ? `${(botForm.risk_amount / (botForm.lots * botForm.lot_size)).toFixed(2)} pts`
                      : "—"}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Advanced Settings (8 optional parameters) */}
            <div className="mt-3">
              <button
                type="button"
                className="bot-advanced-toggle-btn"
                onClick={() => setAdvancedSettingsOpen((prev) => !prev)}
              >
                <span>Advanced Settings (8 optional parameters)</span>
                {advancedSettingsOpen ? <ChevronUpIcon style={{ width: 15, height: 15 }} /> : <ChevronDownIcon style={{ width: 15, height: 15 }} />}
              </button>

              {advancedSettingsOpen && (
                <div className="p-3 mt-2 border rounded" style={{ borderColor: "rgba(148, 163, 184, 0.12)", background: "rgba(15, 24, 40, 0.5)" }}>
                  <div className="row g-2">
                    <div className="col-12 col-sm-6 col-xl-3">
                      <label className="bot-field-label">Fallback Broker</label>
                      <select
                        className="bot-field-select"
                        value={botForm.fallback_broker ?? ""}
                        onChange={(e) =>
                          setBotForm((prev) => ({
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
                            disabled={botForm.market_data_broker === option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-sm-6 col-xl-4">
                      <label className="bot-field-label">Managed Job Name</label>
                      <input
                        className="bot-field-input"
                        placeholder="Optional descriptive name"
                        value={managedJobName}
                        onChange={(e) => setManagedJobName(e.target.value)}
                      />
                    </div>

                    <div className="col-12 col-sm-6 col-xl-5">
                      <label className="bot-field-label">Store Path</label>
                      <input
                        className="bot-field-input font-mono text-xs"
                        value={botForm.store_path}
                        onChange={(e) => setBotForm((prev) => ({ ...prev, store_path: e.target.value }))}
                      />
                    </div>

                    <div className="col-6 col-md-3">
                      <div className="form-check pt-1">
                        <input
                          checked={botForm.force_fallback_for_test}
                          className="form-check-input"
                          id="bot-force-fallback-for-test"
                          onChange={(e) =>
                            setBotForm((prev) => ({ ...prev, force_fallback_for_test: e.target.checked }))
                          }
                          type="checkbox"
                        />
                        <label className="form-check-label small text-slate-300" htmlFor="bot-force-fallback-for-test">
                          Force Fallback Test
                        </label>
                      </div>
                    </div>

                    <div className="col-6 col-md-3">
                      <div className="form-check pt-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="useTimeWindowsDash"
                          checked={botForm.use_time_windows}
                          onChange={(e) => setBotForm((prev) => ({ ...prev, use_time_windows: e.target.checked }))}
                        />
                        <label className="form-check-label small text-slate-300" htmlFor="useTimeWindowsDash">
                          Time Windows
                        </label>
                      </div>
                    </div>

                    <div className="col-6 col-md-3">
                      <div className="form-check pt-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="useEma20EntryFilterDash"
                          checked={botForm.use_ema20_entry_filter}
                          onChange={(e) =>
                            setBotForm((prev) => ({ ...prev, use_ema20_entry_filter: e.target.checked }))
                          }
                        />
                        <label className="form-check-label small text-slate-300" htmlFor="useEma20EntryFilterDash">
                          EMA20 Entry Filter
                        </label>
                      </div>
                    </div>

                    <div className="col-6 col-md-3">
                      <div className="form-check pt-1">
                        <input
                          checked={botForm.use_greek_selection}
                          className="form-check-input"
                          id="bot-use-greek-selection"
                          onChange={(e) =>
                            setBotForm((prev) => ({ ...prev, use_greek_selection: e.target.checked }))
                          }
                          type="checkbox"
                        />
                        <label className="form-check-label small text-slate-300" htmlFor="bot-use-greek-selection">
                          Greek Selection
                        </label>
                      </div>
                    </div>

                    <div className="col-6 col-md-3">
                      <div className="form-check pt-1">
                        <input
                          checked={managedAutoStorePath}
                          className="form-check-input"
                          id="managed-auto-store-path"
                          onChange={(e) => setManagedAutoStorePath(e.target.checked)}
                          type="checkbox"
                        />
                        <label className="form-check-label small text-slate-300" htmlFor="managed-auto-store-path">
                          Auto DB (Unique)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bot Action Bar */}
            <div className="bot-action-row">
              <button
                className="btn btn-outline-light bot-action-btn"
                disabled={previewRunning}
                onClick={handlePreviewUpstoxBot}
                type="button"
              >
                {previewRunning ? "Previewing..." : "Preview Strategy"}
              </button>

              <Link className="btn btn-outline-info bot-action-btn" href="/upstox-backtest">
                Open Backtest
              </Link>

              <button
                className="btn btn-outline-warning bot-action-btn"
                disabled={botRunning}
                onClick={handleRunUpstoxBot}
                type="button"
              >
                {botRunning ? "Running..." : "Run Bot Cycle"}
              </button>

              <button
                className="btn btn-success bot-action-btn"
                disabled={managedBotAction === "start"}
                onClick={handleStartManagedBot}
                type="button"
              >
                {managedBotAction === "start" ? "Starting..." : "Start Managed Bot"}
              </button>
            </div>

            {/* Optional Strategy Preview */}
            {botPreview && (
              <div className="mt-3 p-3 border rounded" style={{ borderColor: "rgba(148, 163, 184, 0.16)", background: "rgba(15, 24, 40, 0.8)" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-semibold text-slate-100 text-sm">Strategy Preview</div>
                  <button
                    className="btn btn-sm btn-link text-slate-400 p-0 text-decoration-none"
                    onClick={() => setBotPreview(null)}
                    type="button"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="small muted mb-1">Strategy: {botPreview.strategy_label}</div>
                <div className="small muted mb-1">Resolved expiry: {botPreview.resolved_expiry ?? "Not resolved"}</div>
                <div className="small muted mb-2">Open trade present: {botPreview.has_open_trade ? "Yes" : "No"}</div>
                {botPreview.signal && (
                  <div className="mb-2">
                    <div className="fw-semibold small mb-1 text-slate-300">Latest Signal Snapshot</div>
                    <pre className="dashboard-terminal-logs mb-0" style={{ maxHeight: 120 }}>{JSON.stringify(botPreview.signal, null, 2)}</pre>
                  </div>
                )}
                {botPreview.candidate && (
                  <div>
                    <div className="fw-semibold small mb-1 text-slate-300">Selected Option Candidate</div>
                    <pre className="dashboard-terminal-logs mb-0" style={{ maxHeight: 120 }}>{JSON.stringify(botPreview.candidate, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Telemetry + Live Bot Log Column */}
          <div className="d-flex flex-column gap-3">
            {/* Top: Entry Rejection Telemetry */}
            <div className="desk-panel">
              <div className="desk-panel-header">
                <h3 className="desk-panel-title">
                  <FilterIcon />
                  <span>Rejection Telemetry</span>
                </h3>
                <span className="badge-soft blue font-mono">
                  {rejectionSummary?.total_events ?? 0} events ({rejectionSinceHours}h)
                </span>
              </div>

              {/* Filter controls */}
              <div className="row g-2 mb-2">
                <div className="col-4">
                  <select
                    className="bot-field-select"
                    value={rejectionSinceHours}
                    onChange={(e) => setRejectionSinceHours(Number(e.target.value) || 24)}
                  >
                    <option value={6}>6h</option>
                    <option value={24}>24h</option>
                    <option value={72}>72h</option>
                    <option value={168}>7d</option>
                  </select>
                </div>
                <div className="col-4">
                  <select
                    className="bot-field-select"
                    value={rejectionInstrumentFilter}
                    onChange={(e) => setRejectionInstrumentFilter(e.target.value)}
                  >
                    <option value="all">All Inst</option>
                    {rejectionInstrumentOptions.map((instrumentKey) => (
                      <option key={instrumentKey} value={instrumentKey}>
                        {formatCleanInstrumentName(instrumentKey, data)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-4">
                  <select
                    className="bot-field-select"
                    value={rejectionStrategyFilter}
                    onChange={(e) => setRejectionStrategyFilter(e.target.value)}
                  >
                    <option value="all">All Strat</option>
                    {rejectionStrategyOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4 Stat Tiles */}
              <div className="telemetry-grid-tiles">
                <div className="telemetry-stat-tile">
                  <div className="telemetry-stat-tile-label">Total</div>
                  <div className="telemetry-stat-tile-value">{rejectionSummary?.total_events ?? 0}</div>
                </div>
                <div className="telemetry-stat-tile">
                  <div className="telemetry-stat-tile-label">Unique</div>
                  <div className="telemetry-stat-tile-value">{(rejectionSummary?.reason_counts ?? []).length}</div>
                </div>
                <div className="telemetry-stat-tile">
                  <div className="telemetry-stat-tile-label">Top Reason</div>
                  <div className="telemetry-stat-tile-value text-truncate" title={topRejectionReasons[0]?.reason_code ?? "None"}>
                    {topRejectionReasons[0]?.reason_code ? topRejectionReasons[0].reason_code.slice(0, 8) : "—"}
                  </div>
                </div>
                <div className="telemetry-stat-tile">
                  <div className="telemetry-stat-tile-label">Affected</div>
                  <div className="telemetry-stat-tile-value">
                    {topRejectionReasons.reduce((sum, r) => sum + (r.total > 0 ? 1 : 0), 0)}
                  </div>
                </div>
              </div>

              {rejectionSummaryError ? (
                <div className="small text-danger mb-2">{rejectionSummaryError}</div>
              ) : null}

              {topRejectionReasons.length === 0 ? (
                <div className="p-3 text-center text-slate-400 small border rounded" style={{ borderColor: "rgba(148, 163, 184, 0.08)" }}>
                  No rejection events in the selected window.
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: 130 }}>
                  <table className="table table-sm align-middle mb-0">
                    <tbody>
                      {topRejectionReasons.map((item) => (
                        <tr
                          key={item.reason_code}
                          onClick={() => jumpToManagedFleetWithTelemetryFilters(item.reason_code)}
                          style={{ cursor: "pointer" }}
                          title="Click to filter managed jobs by this reason"
                        >
                          <td className="small text-truncate text-slate-300" style={{ maxWidth: 170 }}>{item.reason_code}</td>
                          <td className="text-end font-mono small fw-bold text-slate-300">{fmtNumber(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom: Live Bot Log */}
            <div className="desk-panel">
              <div className="desk-panel-header">
                <h3 className="desk-panel-title">
                  <TerminalIcon />
                  <span>Live Bot Log</span>
                  <span className="live-log-status-dot ms-1" />
                </h3>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-info p-0 text-decoration-none small"
                  onClick={() => setShowFullLogModal(true)}
                >
                  View Full Log
                </button>
              </div>
              <pre className="live-log-terminal">
                {botLogs.length ? botLogs.slice(-4).join("\n") : "Waiting for next cycle / system initialized."}
              </pre>
            </div>
          </div>
        </div>

        {/* G. Managed Bot Fleet Section */}
        <section className="desk-panel mt-2" id="managed-bot-fleet">
          <div className="desk-panel-header flex-wrap">
            <div>
              <h2 className="desk-panel-title">
                <BotIcon />
                <span>Managed Bot Fleet</span>
              </h2>
              <div className="text-xs text-slate-400 mt-1">
                All your running and managed bots in one place.
              </div>
            </div>

            {/* Right Summary */}
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="badge-soft blue">Today: {todayStartedManagedBots}</span>
              <span className="badge-soft gold">Carry: {carryForwardManagedBots}</span>
              <span className={`badge-soft ${pnlTone(visibleManagedRealizedPnl)} font-mono`}>
                Realized: {fmtMoney(visibleManagedRealizedPnl)}
              </span>
              <span className={`badge-soft ${pnlTone(visibleManagedTotalPnl)} font-mono`}>
                Total P/L: {fmtMoney(visibleManagedTotalPnl)}
              </span>
            </div>
          </div>

          {/* Fleet Horizontal Filter Toolbar */}
          <div className="fleet-single-toolbar">
            {/* Today / History tabs */}
            <div className="execution-jobs-view-switcher mb-0">
              <button
                className={`execution-jobs-view-tab ${managedJobsView === "today" ? "active" : ""}`}
                onClick={() => setManagedJobsView("today")}
                type="button"
              >
                <span>Today</span>
                <strong>{managedBotsSummary?.active_jobs ?? filteredTodayManagedBots.length}</strong>
              </button>
              <button
                className={`execution-jobs-view-tab ${managedJobsView === "history" ? "active" : ""}`}
                onClick={() => setManagedJobsView("history")}
                type="button"
              >
                <span>History</span>
                <strong>
                  {managedBotsSummary
                    ? Math.max(0, managedBotsSummary.managed_jobs - managedBotsSummary.active_jobs)
                    : managedBotsTotalCount}
                </strong>
              </button>
            </div>

            {/* Search Input */}
            <div className="d-flex align-items-center gap-1">
              <input
                className="fleet-filter-input"
                placeholder="Search bots..."
                value={fleetSearchQuery}
                onChange={(e) => setFleetSearchQuery(e.target.value)}
                style={{ width: 130 }}
              />
            </div>

            {/* Strategy Filter */}
            <select
              className="fleet-filter-select"
              onChange={(e) => setManagedJobsStrategyFilter(e.target.value)}
              value={managedJobsStrategyFilter}
            >
              <option value="all">All Strategies</option>
              {managedJobsStrategyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Instrument Filter */}
            <select
              className="fleet-filter-select"
              onChange={(e) => setManagedJobsInstrumentFilter(e.target.value)}
              value={managedJobsInstrumentFilter}
            >
              <option value="all">All Instruments</option>
              {managedJobsInstrumentOptions.map((instrumentKey) => (
                <option key={instrumentKey} value={instrumentKey}>
                  {formatCleanInstrumentName(instrumentKey, data)}
                </option>
              ))}
            </select>

            {/* Live Only Checkbox */}
            <label className="d-flex align-items-center gap-1 small text-slate-300 mb-0 cursor-pointer">
              <input
                checked={managedJobsLiveOnly}
                onChange={(e) => setManagedJobsLiveOnly(e.target.checked)}
                type="checkbox"
              />
              <span>Live only</span>
            </label>

            {/* Reason hint if present */}
            {managedJobsReasonHint ? (
              <div className="d-flex align-items-center gap-1">
                <span className="badge-soft blue text-xs">
                  Reason: {managedJobsReasonHint}
                </span>
                <label className="d-flex align-items-center gap-1 small text-slate-300 mb-0 cursor-pointer">
                  <input
                    checked={managedJobsMatchedOnly}
                    onChange={(e) => setManagedJobsMatchedOnly(e.target.checked)}
                    type="checkbox"
                  />
                  <span>Matched ({highlightedManagedJobsCount})</span>
                </label>
                <button
                  className="btn btn-outline-light btn-sm py-0 px-1 text-xs"
                  onClick={() => {
                    setManagedJobsReasonHint(null);
                    setManagedJobsMatchedOnly(false);
                  }}
                  type="button"
                >
                  Clear
                </button>
              </div>
            ) : null}

            {/* Rows selector */}
            <select
              className="fleet-filter-select"
              onChange={(e) => setManagedBotsPageSize(Number(e.target.value))}
              value={managedBotsPageSize}
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={0}>All rows</option>
            </select>

            {/* Refresh */}
            <button
              className="btn btn-outline-light btn-sm py-1 px-2"
              disabled={managedBotsLoading || refreshing}
              onClick={() => void handleRefreshAll()}
              type="button"
              title="Refresh fleet"
            >
              <RefreshCwIcon style={{ width: 13, height: 13 }} />
            </button>
          </div>

          {/* History Controls Bar if in History Mode */}
          {managedJobsView === "history" && (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2 p-2 rounded" style={{ background: "rgba(15, 24, 40, 0.4)", border: "1px solid rgba(148, 163, 184, 0.08)" }}>
              <div className="execution-jobs-filter-pills mb-0">
                {[
                  { value: "yesterday", label: "Yesterday" },
                  { value: "last7", label: "Last 7 Days" },
                  { value: "last30", label: "Last 30 Days" },
                  { value: "custom", label: "Custom" },
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`execution-jobs-filter-pill ${
                      managedJobsHistoryPreset === option.value ? "active" : ""
                    }`}
                    onClick={() => setManagedJobsHistoryPreset(option.value as ManagedJobsHistoryPreset)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {managedJobsHistoryPreset === "custom" && (
                <div className="d-flex align-items-center gap-2">
                  <input
                    className="fleet-filter-input font-mono"
                    max={managedJobsHistoryTo || undefined}
                    onChange={(e) => setManagedJobsHistoryFrom(e.target.value)}
                    type="date"
                    value={managedJobsHistoryFrom}
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    className="fleet-filter-input font-mono"
                    min={managedJobsHistoryFrom || undefined}
                    onChange={(e) => setManagedJobsHistoryTo(e.target.value)}
                    type="date"
                    value={managedJobsHistoryTo}
                  />
                </div>
              )}

              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-outline-light btn-sm"
                  disabled={!deletableVisibleManagedBotIds.length}
                  onClick={() =>
                    setSelectedManagedBotIds((prev) =>
                      allVisibleManagedBotsSelected
                        ? prev.filter((jobId) => !deletableVisibleManagedBotIds.includes(jobId))
                        : Array.from(new Set([...prev, ...deletableVisibleManagedBotIds])),
                    )
                  }
                  type="button"
                >
                  {allVisibleManagedBotsSelected ? "Deselect Page" : "Select Page"}
                </button>

                <button
                  className="btn btn-outline-danger btn-sm"
                  disabled={!selectedManagedBotIds.length || managedBotAction === "bulk-delete"}
                  onClick={handleBulkDeleteManagedBots}
                  type="button"
                >
                  {managedBotAction === "bulk-delete" ? "Deleting..." : `Delete Selected (${selectedManagedBotIds.length})`}
                </button>

                <button
                  className="btn btn-danger btn-sm"
                  disabled={managedBotsTotalCount === 0 || managedBotAction === "delete-all-history"}
                  onClick={handleDeleteAllManagedBotHistory}
                  type="button"
                >
                  {managedBotAction === "delete-all-history" ? "Deleting..." : "Delete All Logs"}
                </button>
              </div>
            </div>
          )}

          {/* Modern Managed Bot Table */}
          <div className="table-responsive managed-bots-table-wrap">
            <table className="table table-dark-shell align-middle fleet-dense-table">
              <thead>
                <tr>
                  {managedJobsView === "history" ? <th style={{ width: 36, textAlign: "center" }}>Select</th> : null}
                  <th style={{ width: 50, textAlign: "center" }}>Status</th>
                  <th style={{ width: 55, textAlign: "center" }}>Mode</th>
                  <th>Instrument / Bot</th>
                  <th style={{ width: 65, textAlign: "center" }}>Trades</th>
                  <th>P&amp;L</th>
                  <th style={{ width: 80 }}>Last Log</th>
                  <th style={{ width: 80 }}>Started</th>
                  <th style={{ width: 75, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {managedBotsLoading ? (
                  <tr>
                    <td colSpan={managedJobsView === "history" ? 9 : 8} className="empty-state">
                      Loading managed bot jobs...
                    </td>
                  </tr>
                ) : searchedManagedBots.length ? (
                  searchedManagedBots.map((job) => {
                    const reasonMatch = highlightedManagedJobIds.has(job.job_id);
                    return (
                      <Fragment key={job.job_id}>
                        <tr style={managedJobsReasonHint && reasonMatch ? { backgroundColor: "rgba(46, 186, 143, 0.08)" } : undefined}>
                          {managedJobsView === "history" ? (
                            <td>
                              {isManagedBotDeletable(job) ? (
                                <input
                                  checked={selectedManagedBotIds.includes(job.job_id)}
                                  onChange={(e) =>
                                    setSelectedManagedBotIds((prev) =>
                                      e.target.checked
                                        ? Array.from(new Set([...prev, job.job_id]))
                                        : prev.filter((id) => id !== job.job_id),
                                    )
                                  }
                                  type="checkbox"
                                />
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                          ) : null}

                          <td style={{ textAlign: "center" }}>
                            {(() => {
                              const meta = botStatusMeta(job.status);
                              return (
                                <span
                                  className="d-inline-flex align-items-center justify-content-center"
                                  title={`Status: ${meta.label}`}
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    background: "rgba(15, 24, 40, 0.6)",
                                    border: `1px solid ${meta.color}40`,
                                    cursor: "default",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      backgroundColor: meta.color,
                                      boxShadow: `0 0 6px ${meta.glow}`,
                                    }}
                                  />
                                </span>
                              );
                            })()}
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <label
                              className="d-inline-flex align-items-center justify-content-center gap-1 mb-0 cursor-pointer"
                              title={`Mode: ${job.execution_mode === "live" ? "Live Trading (L)" : "Paper Trading (P)"} — click checkbox to switch`}
                            >
                              <input
                                checked={job.execution_mode === "live"}
                                disabled={managedBotModeId === job.job_id}
                                onChange={(e) => void handleSetManagedBotMode(job, e.target.checked ? "live" : "paper")}
                                type="checkbox"
                                style={{ cursor: "pointer" }}
                              />
                              <span
                                className={`badge-soft ${job.execution_mode === "live" ? "gold" : "blue"} font-mono fw-bold text-xs`}
                                style={{ minWidth: 20, height: 20, padding: "1px 5px", textAlign: "center", lineHeight: "16px" }}
                              >
                                {managedBotModeId === job.job_id ? ".." : job.execution_mode === "live" ? "L" : "P"}
                              </span>
                            </label>
                          </td>

                          <td>
                            {(() => {
                              const cleanInst = formatCleanInstrumentName(job.instrument_key, data);
                              const rawJobName = (job.job_name || "").trim();
                              const cleanJobName = rawJobName.includes("|")
                                ? rawJobName.split("|").pop()?.trim() || rawJobName
                                : rawJobName;
                              const cleanJobUpper = cleanJobName.toUpperCase();
                              const cleanInstUpper = cleanInst.toUpperCase();
                              const sideUpper = (job.side || "").toUpperCase();

                              const isGenericJobName =
                                !cleanJobName ||
                                cleanJobUpper === cleanInstUpper ||
                                cleanJobUpper === `${cleanInstUpper} ${sideUpper}` ||
                                cleanJobUpper === `${cleanInstUpper}_${sideUpper}` ||
                                cleanJobUpper === `${job.instrument_key.toUpperCase()} ${sideUpper}` ||
                                cleanJobUpper === `${cleanInstUpper} OPTION CHAIN BOT`;

                              return (
                                <div>
                                  <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                    <span className="fw-semibold text-slate-100">{cleanInst}</span>
                                    <span className={`badge-soft ${job.side.toLowerCase() === "call" ? "green" : "red"} font-mono text-xs px-1 py-0`}>
                                      {sideUpper}
                                    </span>
                                    {!isGenericJobName && (
                                      <span className="text-xs text-slate-400 font-mono">({cleanJobName})</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400 d-flex align-items-center gap-1 mt-0.5">
                                    <span>{job.strategy_label}</span>
                                    {job.pid ? <span className="text-slate-500 font-mono">· PID {job.pid}</span> : null}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <button
                              className="dashboard-trades-link font-mono fw-semibold"
                              onClick={() => handleOpenManagedBotTrades(job)}
                              type="button"
                              title={`${job.closed_trade_count} closed / ${job.trade_count} total trades${job.has_open_trade ? ` (Active: ${job.open_trade_option ?? "1 Open"})` : ""} — click to inspect`}
                            >
                              {job.closed_trade_count}/{job.trade_count}
                              {job.has_open_trade && (
                                <span
                                  className="d-inline-block rounded-circle ms-1"
                                  style={{ width: 6, height: 6, backgroundColor: "#55D6A0", boxShadow: "0 0 5px #55D6A0", verticalAlign: "middle" }}
                                  title="Open trade active"
                                />
                              )}
                            </button>
                          </td>

                          <td>
                            {job.has_open_trade ? (
                              <div>
                                <div className="font-mono text-xs text-slate-200">
                                  LTP: {job.current_option_ltp != null ? job.current_option_ltp.toFixed(2) : "-"}
                                </div>
                                {job.unrealized_pnl_amount != null ? (
                                  <span className={`badge-soft ${pnlTone(job.unrealized_pnl_amount)} font-mono`}>
                                    MTM {fmtMoney(job.unrealized_pnl_amount)}
                                  </span>
                                ) : (
                                  <div className="text-xs text-slate-400">{job.quote_error ?? "Pending"}</div>
                                )}
                                <div className="text-xs text-slate-400 font-mono">Realized: {fmtMoney(job.total_realized_pnl)}</div>
                              </div>
                            ) : (
                              <div>
                                <span className={`badge-soft ${pnlTone(job.total_realized_pnl)} font-mono`}>
                                  {fmtMoney(job.total_realized_pnl)}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="font-mono text-xs text-slate-400">
                            {job.last_log_at ? fmtDate(job.last_log_at) : "-"}
                          </td>

                          <td className="font-mono text-xs text-slate-400">
                            {fmtDate(job.started_at)}
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <div className="d-inline-flex align-items-center justify-content-center gap-1">
                              {/* Details Icon */}
                              <button
                                className={`btn ${expandedBotJobId === job.job_id ? "btn-info text-dark" : "btn-outline-light"} btn-sm p-1 d-inline-flex align-items-center justify-content-center`}
                                onClick={() => setExpandedBotJobId((prev) => (prev === job.job_id ? "" : job.job_id))}
                                type="button"
                                title={expandedBotJobId === job.job_id ? "Hide Details" : "View Details"}
                                style={{ width: 26, height: 26 }}
                              >
                                <FileTextIcon style={{ width: 13, height: 13 }} />
                              </button>

                              {/* Square Off Icon (if active trade) */}
                              {job.has_open_trade && (
                                <button
                                  className="btn btn-outline-danger btn-sm p-1 d-inline-flex align-items-center justify-content-center"
                                  disabled={
                                    managedBotAction === `square:${job.job_id}` ||
                                    managedBotAction === `stop:${job.job_id}`
                                  }
                                  onClick={() => handleSquareOffManagedBot(job.job_id)}
                                  type="button"
                                  title="Square Off Active Trade"
                                  style={{ width: 26, height: 26 }}
                                >
                                  <SquareIcon style={{ width: 12, height: 12 }} />
                                </button>
                              )}

                              {/* Stop Icon (if running without open trade) */}
                              {!job.has_open_trade && (job.status === "starting" || job.status === "running" || job.status === "stopping") && (
                                <button
                                  className="btn btn-outline-warning btn-sm p-1 d-inline-flex align-items-center justify-content-center"
                                  disabled={
                                    managedBotAction === `stop:${job.job_id}` ||
                                    managedBotAction === `square:${job.job_id}`
                                  }
                                  onClick={() => handleStopManagedBot(job.job_id)}
                                  type="button"
                                  title="Stop Bot"
                                  style={{ width: 26, height: 26 }}
                                >
                                  <SquareIcon style={{ width: 12, height: 12 }} />
                                </button>
                              )}

                              {/* Delete Icon */}
                              {isManagedBotDeletable(job) && (
                                <button
                                  className="btn btn-outline-danger btn-sm p-1 d-inline-flex align-items-center justify-content-center"
                                  disabled={managedBotAction === `delete:${job.job_id}`}
                                  onClick={() => handleDeleteManagedBot(job)}
                                  type="button"
                                  title="Delete Bot"
                                  style={{ width: 26, height: 26 }}
                                >
                                  <Trash2Icon style={{ width: 13, height: 13 }} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible Details Row */}
                        {expandedBotJobId === job.job_id && (
                          <tr>
                            <td colSpan={managedJobsView === "history" ? 9 : 8} className="scanner-detail-cell">
                              <div className="row g-3">
                                <div className="col-12 col-xl-4">
                                  <div className="small text-slate-300 font-mono mb-1">
                                    <strong className="text-slate-400 font-sans">Store DB:</strong> {job.store_path}
                                  </div>
                                  <div className="small text-slate-300 font-mono mb-1">
                                    <strong className="text-slate-400 font-sans">Job ID:</strong> {job.job_id}
                                  </div>
                                  <div className="small text-slate-300 mb-1">
                                    <strong className="text-slate-400">Run Mode:</strong> {job.once ? "Single pass" : "Managed loop"} | Limits: {job.max_cycles ?? "Unlimited"}
                                  </div>
                                  <div className="small text-slate-300 mb-1">
                                    <strong className="text-slate-400">Lots:</strong> {job.lots} x {job.lot_size} (Qty: {job.open_trade_quantity || job.lots * job.lot_size})
                                  </div>
                                  <div className="small text-slate-300 mb-1">
                                    <strong className="text-slate-400">Polling:</strong> {job.entry_interval_sec}s entry / {job.exit_interval_sec}s exit
                                  </div>
                                  {job.stopped_at && (
                                    <div className="small text-slate-300 mb-1">
                                      <strong className="text-slate-400">Stopped At:</strong> {fmtDate(job.stopped_at)}
                                    </div>
                                  )}
                                  {job.last_error && (
                                    <div className="small text-danger mb-1">
                                      <strong>Last Error:</strong> {job.last_error}
                                    </div>
                                  )}
                                </div>
                                <div className="col-12 col-xl-8">
                                  <div className="fw-semibold small mb-1 text-slate-300">Recent Bot Cycle Logs</div>
                                  <pre className="dashboard-terminal-logs mb-0" style={{ maxHeight: 150 }}>
                                    {job.recent_logs.length ? job.recent_logs.join("\n") : "No cycle logs captured yet."}
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
                    <td colSpan={managedJobsView === "history" ? 9 : 8} className="empty-state">
                      {managedJobsView === "today"
                        ? "No jobs are active for today yet."
                        : "No historical jobs match the selected filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 pt-2 border-top" style={{ borderColor: "rgba(148, 163, 184, 0.08)" }}>
            <div className="text-xs text-slate-400 font-mono">
              Page {managedBotsCurrentPage} of {managedBotsTotalPages} • {managedBotsTotalCount} total jobs
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-light btn-sm py-0 px-2 text-xs"
                disabled={managedBotsLoading || managedBotsCurrentPage <= 1}
                onClick={() => setManagedBotsCurrentPage((prev) => Math.max(prev - 1, 1))}
                type="button"
              >
                Previous
              </button>
              <button
                className="btn btn-outline-light btn-sm py-0 px-2 text-xs"
                disabled={managedBotsLoading || managedBotsCurrentPage >= managedBotsTotalPages}
                onClick={() => setManagedBotsCurrentPage((prev) => Math.min(prev + 1, managedBotsTotalPages))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* Full Log Viewer Modal */}
        {showFullLogModal && (
          <div className="full-log-modal-backdrop" onClick={() => setShowFullLogModal(false)}>
            <div className="full-log-modal" onClick={(e) => e.stopPropagation()}>
              <div className="full-log-modal-header">
                <div className="d-flex align-items-center gap-2">
                  <TerminalIcon style={{ width: 18, height: 18, color: "#6EA8FE" }} />
                  <span className="fw-semibold text-slate-100">Live Bot Log Telemetry</span>
                  <span className="live-log-status-dot ms-1" />
                </div>
                <button
                  className="btn btn-outline-light btn-sm py-0 px-2 text-xs"
                  onClick={() => setShowFullLogModal(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
              <div className="full-log-modal-body">
                <pre className="full-log-modal-terminal">
                  {botLogs.length ? botLogs.join("\n") : "No live logs captured yet."}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Managed Bot Trades Modal */}
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
                    {formatCleanInstrumentName(managedBotTradesJob.instrument_key, data)} |{" "}
                    {managedBotTradesJob.side.toUpperCase()} | {managedBotTradesJob.strategy_label}
                    {managedBotTradesJob.job_name && !managedBotTradesJob.job_name.toUpperCase().includes(formatCleanInstrumentName(managedBotTradesJob.instrument_key, data).toUpperCase()) ? ` | ${managedBotTradesJob.job_name}` : ""}
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
                          <td className="small font-mono">{trade.opened_at ? fmtDate(trade.opened_at) : "-"}</td>
                          <td className="small font-mono">{trade.closed_at ? fmtDate(trade.closed_at) : "-"}</td>
                          <td>
                            <div className="fw-semibold text-slate-100">{trade.option_symbol}</div>
                            <div className="muted small font-mono">
                              {trade.expiry} | {trade.option_type} {trade.strike}
                            </div>
                          </td>
                          <td className="mono">{trade.quantity}</td>
                          <td className="mono">{trade.entry_ltp?.toFixed(2) ?? "-"}</td>
                          <td className="mono">{trade.exit_ltp != null ? trade.exit_ltp.toFixed(2) : "-"}</td>
                          <td>
                            {trade.pnl_amount != null ? (
                              <span className={`badge-soft ${pnlTone(trade.pnl_amount)} font-mono`}>
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
      </div>
    </main>
  );
}
