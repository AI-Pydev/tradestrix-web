"use client";

import { useEffect, useMemo, useState } from "react";

import {
    fetchCurrentStrategyAssignments,
    fetchInstrumentCatalog,
    fetchLatestStrategyAssignmentBatch,
    fetchUpstoxManagedBotJobs,
    InstrumentCatalogResponse,
    InstrumentItem,
    runStrategyAssignments,
    squareOffUpstoxManagedBot,
    startUpstoxManagedBot,
    stopUpstoxManagedBot,
    StrategyAssignment,
    StrategyAssignmentBatch,
    StrategyAssignmentRunRequest,
    UpstoxManagedBotJob,
    UpstoxManagedBotStartRequest,
} from "@/lib/api";

type BotSide = "call" | "put";
type ManagedAction = "stop" | "square";

type LauncherRowState = {
  selected: boolean;
  call_enabled: boolean;
  put_enabled: boolean;
  lots_override: string;
  strike_offset_override: string;
};

type LauncherFilters = {
  include_indices: boolean;
  include_stocks: boolean;
  verified_only: boolean;
  search: string;
};

type LauncherSettings = {
  expiry: string;
  candle_interval: string;
  strike_offset: number;
  use_greek_selection: boolean;
  max_entry_ltp: number;
  risk_model: "dynamic" | "fixed" | "risk_amount";
  risk_amount: number | null;
  use_time_windows: boolean;
  sl_premium_pct: number;
  target_premium_pct: number;
  min_hold_sec_before_underlying_exit: number;
  entry_interval_sec: number;
  exit_interval_sec: number;
  lots: number;
  lot_size_override: string;
  market_open: string;
  entry_cutoff: string;
  time_exit: string;
  max_cycles: string;
  job_name_prefix: string;
};

type AssignmentControls = {
  from_date: string;
  to_date: string;
  min_win_rate: number;
  min_trades: number;
  include_call: boolean;
  include_put: boolean;
};

type LaunchRequest = {
  item: InstrumentItem;
  side: BotSide;
  lots: number;
  strike_offset: number;
};

type PortfolioSummary = {
  investment: number;
  gross_profit: number;
  gross_loss: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  active_jobs: number;
  open_trades: number;
};

const DEFAULT_STORE_PATH = "logs/upstox/tv_ha_call_option_chain_api.db";
const START_DELAY_MS = 350;
const CONTROL_DELAY_MS = 250;

function defaultStrategyIdForSide(side: BotSide) {
  return side === "put" ? "tv_ha_put_v2" : "tv_ha_call_v2";
}

function defaultRowState(): LauncherRowState {
  return {
    selected: false,
    call_enabled: true,
    put_enabled: false,
    lots_override: "",
    strike_offset_override: "",
  };
}

function instrumentLabel(item: { label: string; verified: boolean }) {
  return item.verified ? item.label : `${item.label} (unverified)`;
}

function resolvedLotSize(item: InstrumentItem, override: string) {
  const trimmed = override.trim();
  if (trimmed) {
    return Math.max(1, Number(trimmed) || 1);
  }
  return Math.max(1, Number(item.lot_size) || 65);
}

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

function fmtMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function statusTone(status: UpstoxManagedBotJob["status"]) {
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

function isActiveJob(job: UpstoxManagedBotJob) {
  return job.status === "starting" || job.status === "running" || job.status === "stopping";
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isoDateDaysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
}

function isoDateToday() {
  return new Date().toISOString().slice(0, 10);
}

function buildJobName(prefix: string, item: InstrumentItem, side: BotSide) {
  const trimmedPrefix = prefix.trim();
  const base = `${item.label} ${side.toUpperCase()}`;
  return trimmedPrefix ? `${trimmedPrefix} ${base}` : base;
}

function ensureRowState(items: InstrumentItem[], current: Record<string, LauncherRowState>) {
  const next = { ...current };
  for (const item of items) {
    next[item.instrument_key] ??= defaultRowState();
  }
  return next;
}

function parseIntegerOverride(value: string, fallback: number, minimum?: number) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const rounded = Math.trunc(parsed);
  return minimum == null ? rounded : Math.max(minimum, rounded);
}

function enabledSides(state: LauncherRowState, sideFilter?: BotSide) {
  const sides: BotSide[] = [];
  if ((!sideFilter || sideFilter === "call") && state.call_enabled) {
    sides.push("call");
  }
  if ((!sideFilter || sideFilter === "put") && state.put_enabled) {
    sides.push("put");
  }
  return sides;
}

function sideLabel(side: BotSide) {
  return side.toUpperCase();
}

function pnlTone(value: number) {
  if (value > 0) {
    return "green";
  }
  if (value < 0) {
    return "red";
  }
  return "blue";
}

function summarizeJobs(jobs: UpstoxManagedBotJob[]): PortfolioSummary {
  let investment = 0;
  let gross_profit = 0;
  let gross_loss = 0;
  let realized_pnl = 0;
  let unrealized_pnl = 0;
  let open_trades = 0;

  for (const job of jobs) {
    const realized = Number(job.total_realized_pnl || 0);
    const unrealized = Number(job.unrealized_pnl_amount || 0);
    const total = realized + unrealized;

    realized_pnl += realized;
    unrealized_pnl += unrealized;

    if (total > 0) {
      gross_profit += total;
    } else if (total < 0) {
      gross_loss += Math.abs(total);
    }

    if (job.has_open_trade) {
      open_trades += 1;
      investment += Number(job.open_trade_entry_ltp || 0) * Number(job.open_trade_quantity || 0);
    }
  }

  return {
    investment,
    gross_profit,
    gross_loss,
    realized_pnl,
    unrealized_pnl,
    total_pnl: realized_pnl + unrealized_pnl,
    active_jobs: jobs.length,
    open_trades,
  };
}

export function MultiBotLauncherShell() {
  const [catalog, setCatalog] = useState<InstrumentCatalogResponse | null>(null);
  const [managedBots, setManagedBots] = useState<UpstoxManagedBotJob[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [launching, setLaunching] = useState(false);
  const [controlAction, setControlAction] = useState<ManagedAction | "">("");
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [filters, setFilters] = useState<LauncherFilters>({
    include_indices: true,
    include_stocks: true,
    verified_only: true,
    search: "",
  });
  const [settings, setSettings] = useState<LauncherSettings>({
    expiry: "",
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
    lot_size_override: "",
    market_open: "09:18",
    entry_cutoff: "15:20",
    time_exit: "15:21",
    max_cycles: "",
    job_name_prefix: "",
  });
  const [rowState, setRowState] = useState<Record<string, LauncherRowState>>({});
  const [strategyAssignments, setStrategyAssignments] = useState<StrategyAssignment[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [assignmentRunning, setAssignmentRunning] = useState(false);
  const [assignmentSummary, setAssignmentSummary] = useState<StrategyAssignmentBatch["summary"] | null>(null);
  const [assignmentControls, setAssignmentControls] = useState<AssignmentControls>({
    from_date: isoDateDaysAgo(90),
    to_date: isoDateToday(),
    min_win_rate: 70,
    min_trades: 5,
    include_call: true,
    include_put: true,
  });

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
        setRowState((prev) => ensureRowState([...(response.indices ?? []), ...(response.stocks ?? [])], prev));
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load instrument catalog");
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

    async function loadJobs() {
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
        setMessage(err instanceof Error ? err.message : "Failed to load managed bot jobs");
        setMessageTone("error");
      } finally {
        if (active) {
          setJobsLoading(false);
        }
      }
    }

    loadJobs();
    const intervalId = window.setInterval(loadJobs, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAssignments() {
      try {
        const [currentAssignments, latestBatch] = await Promise.all([
          fetchCurrentStrategyAssignments(),
          fetchLatestStrategyAssignmentBatch(),
        ]);
        if (!active) {
          return;
        }
        setStrategyAssignments(currentAssignments);
        setAssignmentSummary(latestBatch?.summary ?? null);
      } catch (err) {
        if (!active) {
          return;
        }
        setMessage(err instanceof Error ? err.message : "Failed to load strategy assignments");
        setMessageTone("error");
      } finally {
        if (active) {
          setAssignmentLoading(false);
        }
      }
    }

    loadAssignments();
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const items = [
      ...(filters.include_indices ? catalog?.indices ?? [] : []),
      ...(filters.include_stocks ? catalog?.stocks ?? [] : []),
    ];
    const query = filters.search.trim().toLowerCase();
    return items.filter((item) => {
      if (filters.verified_only && !item.verified) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack =
        `${item.label} ${item.instrument_key} ${item.symbol ?? ""} ${item.trading_symbol ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [catalog, filters]);

  const selectedItems = useMemo(
    () => visibleItems.filter((item) => (rowState[item.instrument_key] ?? defaultRowState()).selected),
    [rowState, visibleItems],
  );

  const activeBots = useMemo(() => managedBots.filter(isActiveJob), [managedBots]);
  const assignmentMap = useMemo(
    () => new Map(strategyAssignments.map((item) => [`${item.instrument_key}:${item.side}`, item])),
    [strategyAssignments],
  );

  const latestJobMap = useMemo(() => {
    const next = new Map<string, UpstoxManagedBotJob>();
    for (const job of managedBots) {
      const key = `${job.instrument_key}:${job.side}`;
      if (!next.has(key)) {
        next.set(key, job);
      }
    }
    return next;
  }, [managedBots]);

  const activeJobMap = useMemo(() => {
    const next = new Map<string, UpstoxManagedBotJob>();
    for (const job of managedBots) {
      if (!isActiveJob(job)) {
        continue;
      }
      const key = `${job.instrument_key}:${job.side}`;
      if (!next.has(key)) {
        next.set(key, job);
      }
    }
    return next;
  }, [managedBots]);

  const activeJobKeySet = useMemo(() => new Set(activeJobMap.keys()), [activeJobMap]);

  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((item) => (rowState[item.instrument_key] ?? defaultRowState()).selected);
  const allVisibleCallEnabled =
    visibleItems.length > 0 &&
    visibleItems.every((item) => (rowState[item.instrument_key] ?? defaultRowState()).call_enabled);
  const allVisiblePutEnabled =
    visibleItems.length > 0 &&
    visibleItems.every((item) => (rowState[item.instrument_key] ?? defaultRowState()).put_enabled);

  function updateRowState(instrumentKey: string, patch: Partial<LauncherRowState>) {
    setRowState((prev) => ({
      ...prev,
      [instrumentKey]: {
        ...defaultRowState(),
        ...prev[instrumentKey],
        ...patch,
      },
    }));
  }

  function updateVisibleRows(patch: Partial<LauncherRowState>) {
    setRowState((prev) => {
      const next = { ...prev };
      for (const item of visibleItems) {
        next[item.instrument_key] = {
          ...defaultRowState(),
          ...next[item.instrument_key],
          ...patch,
        };
      }
      return next;
    });
  }

  function buildLaunchRequests(items: InstrumentItem[], sideFilter?: BotSide) {
    const requests: LaunchRequest[] = [];
    for (const item of items) {
      const state = rowState[item.instrument_key] ?? defaultRowState();
      const lots = parseIntegerOverride(state.lots_override, settings.lots, 1);
      const strike_offset = parseIntegerOverride(state.strike_offset_override, settings.strike_offset);
      for (const side of enabledSides(state, sideFilter)) {
        requests.push({ item, side, lots, strike_offset });
      }
    }
    return requests;
  }

  function buildManagedJobTargets(
    items: InstrumentItem[],
    options?: {
      side?: BotSide;
      require_open_trade?: boolean;
    },
  ) {
    const targets: UpstoxManagedBotJob[] = [];
    for (const item of items) {
      const state = rowState[item.instrument_key] ?? defaultRowState();
      for (const side of enabledSides(state, options?.side)) {
        const job = activeJobMap.get(`${item.instrument_key}:${side}`);
        if (!job) {
          continue;
        }
        if (options?.require_open_trade && !job.has_open_trade) {
          continue;
        }
        targets.push(job);
      }
    }
    return targets;
  }

  const selectedInstrumentCount = selectedItems.length;
  const queuedBotCount = buildLaunchRequests(selectedItems).length;
  const selectedCallLaunchCount = buildLaunchRequests(selectedItems, "call").length;
  const selectedPutLaunchCount = buildLaunchRequests(selectedItems, "put").length;
  const selectedActiveJobs = buildManagedJobTargets(selectedItems);
  const selectedOpenTradeJobs = buildManagedJobTargets(selectedItems, { require_open_trade: true });
  const selectedActiveJobCount = selectedActiveJobs.length;
  const selectedOpenTradeCount = selectedOpenTradeJobs.length;
  const activeCallCount = activeBots.filter((job) => job.side === "call").length;
  const activePutCount = activeBots.filter((job) => job.side === "put").length;
  const assignedCallCount = strategyAssignments.filter((item) => item.side === "call").length;
  const assignedPutCount = strategyAssignments.filter((item) => item.side === "put").length;
  const activePortfolioSummary = summarizeJobs(activeBots);
  const selectedPortfolioSummary = summarizeJobs(selectedActiveJobs);
  const actionBusy = launching || controlAction !== "";

  async function refreshManagedBots() {
    const response = await fetchUpstoxManagedBotJobs();
    setManagedBots(response);
  }

  async function refreshStrategyAssignments() {
    const [currentAssignments, latestBatch] = await Promise.all([
      fetchCurrentStrategyAssignments(),
      fetchLatestStrategyAssignmentBatch(),
    ]);
    setStrategyAssignments(currentAssignments);
    setAssignmentSummary(latestBatch?.summary ?? null);
  }

  function appendActivity(line: string) {
    setActivityLog((prev) => [line, ...prev].slice(0, 200));
  }

  function toLaunchPayload(request: LaunchRequest): UpstoxManagedBotStartRequest {
    const assignedStrategy = assignmentMap.get(`${request.item.instrument_key}:${request.side}`);
    const maxCycles = settings.max_cycles.trim() ? Math.max(1, Number(settings.max_cycles) || 1) : null;
    return {
      job_name: buildJobName(settings.job_name_prefix, request.item, request.side),
      auto_store_path: true,
      instrument_key: request.item.instrument_key,
      expiry: settings.expiry.trim() ? settings.expiry.trim() : null,
      side: request.side,
      strategy_id: assignedStrategy?.strategy_id ?? defaultStrategyIdForSide(request.side),
      candle_unit: "minutes",
      candle_interval: settings.candle_interval,
      strike_offset: request.strike_offset,
      use_greek_selection: settings.use_greek_selection,
      max_entry_ltp: settings.max_entry_ltp,
      risk_model: settings.risk_model,
      risk_amount: settings.risk_amount ?? null,
      use_time_windows: settings.use_time_windows,
      sl_premium_pct: settings.sl_premium_pct,
      target_premium_pct: settings.target_premium_pct,
      min_hold_sec_before_underlying_exit: settings.min_hold_sec_before_underlying_exit,
      entry_interval_sec: settings.entry_interval_sec,
      exit_interval_sec: settings.exit_interval_sec,
      lots: request.lots,
      lot_size: resolvedLotSize(request.item, settings.lot_size_override),
      market_open: settings.market_open,
      entry_cutoff: settings.entry_cutoff,
      time_exit: settings.time_exit,
      store_path: DEFAULT_STORE_PATH,
      max_cycles: maxCycles,
      once: false,
    };
  }

  async function launchRequests(requests: LaunchRequest[], sourceLabel: string) {
    if (!requests.length) {
      setMessage("Select at least one instrument side to launch.");
      setMessageTone("error");
      return;
    }

    setLaunching(true);
    setMessage("");
    setError("");
    appendActivity(`[${new Date().toLocaleTimeString()}] Launch requested from ${sourceLabel}: ${requests.length} bot(s)`);

    let started = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const latestJobs = await fetchUpstoxManagedBotJobs();
      setManagedBots(latestJobs);
      const activeKeys = new Set(latestJobs.filter(isActiveJob).map((job) => `${job.instrument_key}:${job.side}`));

      for (const request of requests) {
        const key = `${request.item.instrument_key}:${request.side}`;
        if (activeKeys.has(key)) {
          skipped += 1;
          appendActivity(
            `[${new Date().toLocaleTimeString()}] Skip ${request.item.label} ${sideLabel(request.side)}: already active`,
          );
          continue;
        }

        try {
          const payload = toLaunchPayload(request);
          const result = await startUpstoxManagedBot(payload);
          started += 1;
          activeKeys.add(key);
          appendActivity(
            `[${new Date().toLocaleTimeString()}] Started ${request.item.label} ${sideLabel(request.side)} as ${result.job_id} | strategy ${payload.strategy_id} | lots ${request.lots} | strike ${request.strike_offset}`,
          );
        } catch (err) {
          failed += 1;
          appendActivity(
            `[${new Date().toLocaleTimeString()}] Failed ${request.item.label} ${sideLabel(request.side)}: ${
              err instanceof Error ? err.message : "Unknown error"
            }`,
          );
        }

        await sleep(START_DELAY_MS);
      }

      await refreshManagedBots();
      const warning =
        requests.length >= 12 ? " Large batches can hit broker API limits, so smaller batches are safer." : "";
      setMessage(`Launch result: ${started} started, ${skipped} skipped, ${failed} failed.${warning}`);
      setMessageTone(failed > 0 ? "error" : "success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to launch selected bots");
      setMessageTone("error");
    } finally {
      setLaunching(false);
    }
  }

  async function runManagedAction(jobs: UpstoxManagedBotJob[], action: ManagedAction, sourceLabel: string) {
    if (!jobs.length) {
      setMessage(
        action === "stop"
          ? "No selected active bots matched the enabled sides."
          : "No selected open trades matched the enabled sides.",
      );
      setMessageTone("error");
      return;
    }

    setControlAction(action);
    setMessage("");
    setError("");
    appendActivity(
      `[${new Date().toLocaleTimeString()}] ${action === "stop" ? "Stop" : "Square-off"} requested from ${sourceLabel}: ${jobs.length} job(s)`,
    );

    let succeeded = 0;
    let failed = 0;

    try {
      for (const job of jobs) {
        try {
          const result =
            action === "stop"
              ? await stopUpstoxManagedBot(job.job_id)
              : await squareOffUpstoxManagedBot(job.job_id);
          succeeded += 1;
          appendActivity(
            `[${new Date().toLocaleTimeString()}] ${
              action === "stop" ? "Stop requested" : "Squared off"
            } ${result.job_name} (${sideLabel(job.side)})`,
          );
        } catch (err) {
          failed += 1;
          appendActivity(
            `[${new Date().toLocaleTimeString()}] Failed to ${
              action === "stop" ? "stop" : "square off"
            } ${job.job_name} (${sideLabel(job.side)}): ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        }

        await sleep(CONTROL_DELAY_MS);
      }

      await refreshManagedBots();
      setMessage(
        `${action === "stop" ? "Stop" : "Square-off"} result: ${succeeded} succeeded, ${failed} failed.`,
      );
      setMessageTone(failed > 0 ? "error" : "success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `Failed to ${action === "stop" ? "stop" : "square off"} jobs`);
      setMessageTone("error");
    } finally {
      setControlAction("");
    }
  }

  async function handleLaunchSelected(side?: BotSide) {
    const label = side ? `selected ${sideLabel(side)} sides` : "selected instruments";
    await launchRequests(buildLaunchRequests(selectedItems, side), label);
  }

  async function handleLaunchRow(item: InstrumentItem) {
    await launchRequests(buildLaunchRequests([item]), item.label);
  }

  async function handleRunAssignments() {
    if (!selectedItems.length) {
      setMessage("Select at least one instrument before running automatic strategy assignment.");
      setMessageTone("error");
      return;
    }
    if (!assignmentControls.include_call && !assignmentControls.include_put) {
      setMessage("Enable at least one side for automatic strategy assignment.");
      setMessageTone("error");
      return;
    }

    setAssignmentRunning(true);
    setMessage("");
    setError("");
    appendActivity(
      `[${new Date().toLocaleTimeString()}] Strategy assignment requested for ${selectedItems.length} instrument(s)`,
    );

    try {
      const payload: StrategyAssignmentRunRequest = {
        instrument_keys: selectedItems.map((item) => item.instrument_key),
        include_indices: filters.include_indices,
        include_stocks: filters.include_stocks,
        verified_only: filters.verified_only,
        limit: null,
        from_date: assignmentControls.from_date,
        to_date: assignmentControls.to_date,
        min_win_rate: assignmentControls.min_win_rate,
        min_trades: assignmentControls.min_trades,
        include_call: assignmentControls.include_call,
        include_put: assignmentControls.include_put,
        underlying_interval: settings.candle_interval,
        option_interval: "1minute",
        current_option_interval: "1",
        strike_offset: settings.strike_offset,
        lots: settings.lots,
        max_entry_ltp: settings.max_entry_ltp,
        sl_premium_pct: settings.sl_premium_pct,
        target_premium_pct: settings.target_premium_pct,
      };
      const result = await runStrategyAssignments(payload);
      setAssignmentSummary(result.summary);
      await refreshStrategyAssignments();
      setMessage(
        `Strategy assignment batch complete: ${result.summary.assignment_count} assignment(s) across ${result.summary.total_instruments} instrument(s).`,
      );
      setMessageTone(result.summary.assignment_count > 0 ? "success" : "error");
      appendActivity(
        `[${new Date().toLocaleTimeString()}] Strategy assignment batch ${result.batch_id}: ${result.summary.assignment_count} assignment(s), ${result.summary.qualified_results} qualified result(s)`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to run automatic strategy assignment");
      setMessageTone("error");
    } finally {
      setAssignmentRunning(false);
    }
  }

  async function handleStopSelectedActive() {
    await runManagedAction(selectedActiveJobs, "stop", "selected instruments");
  }

  async function handleSquareOffSelectedOpen() {
    await runManagedAction(selectedOpenTradeJobs, "square", "selected instruments");
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div id="launcher-top" />
          <div className="hero-tabs">
            <a className="hero-tab active" href="#launcher-top">
              Overview
            </a>
            <a className="hero-tab" href="#launcher-controls">
              Controls
            </a>
            <a className="hero-tab" href="#launcher-table">
              Instruments
            </a>
            <a className="hero-tab" href="#launcher-activity">
              Activity
            </a>
            <a className="hero-tab" href="#launcher-notes">
              Notes
            </a>
          </div>
          <div className="hero-header">
            <h1 className="hero-title">Automated Multi-Bot Launcher</h1>
            <p className="hero-subtitle">
              Select indices and stocks, run backtests to auto-assign the strongest CALL and PUT strategies above your
              threshold, then launch or control bots in batches with one shared configuration.
            </p>
          </div>
          <div className="p-3">
            {message && (
              <div className={`alert ${messageTone === "success" ? "alert-success" : "alert-danger"}`} role="alert">
                {message}
              </div>
            )}
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            <div className="row g-3">
              <div className="col-xl-8">
                <div className="dashboard-panel h-100" id="launcher-controls">
                  <h2 className="panel-title">Launch Controls</h2>
                  <div className="p-3">
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <label className="form-label">Search</label>
                        <input
                          className="form-control"
                          placeholder="Name or instrument key"
                          value={filters.search}
                          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <div className="form-check mt-4">
                          <input
                            checked={filters.include_indices}
                            className="form-check-input"
                            id="launcher-include-indices"
                            onChange={(e) => setFilters((prev) => ({ ...prev, include_indices: e.target.checked }))}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="launcher-include-indices">
                            Indices
                          </label>
                        </div>
                      </div>
                      <div className="col-6 col-md-2">
                        <div className="form-check mt-4">
                          <input
                            checked={filters.include_stocks}
                            className="form-check-input"
                            id="launcher-include-stocks"
                            onChange={(e) => setFilters((prev) => ({ ...prev, include_stocks: e.target.checked }))}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="launcher-include-stocks">
                            Stocks
                          </label>
                        </div>
                      </div>
                      <div className="col-6 col-md-2">
                        <div className="form-check mt-4">
                          <input
                            checked={filters.verified_only}
                            className="form-check-input"
                            id="launcher-verified-only"
                            onChange={(e) => setFilters((prev) => ({ ...prev, verified_only: e.target.checked }))}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="launcher-verified-only">
                            Verified
                          </label>
                        </div>
                      </div>
                      <div className="col-12 col-md-2">
                        <label className="form-label">Expiry</label>
                        <input
                          className="form-control"
                          placeholder="Auto"
                          value={settings.expiry}
                          onChange={(e) => setSettings((prev) => ({ ...prev, expiry: e.target.value }))}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Candle</label>
                        <input
                          className="form-control"
                          value={settings.candle_interval}
                          onChange={(e) => setSettings((prev) => ({ ...prev, candle_interval: e.target.value || "3" }))}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Strike Offset</label>
                        <input
                          className="form-control"
                          type="number"
                          value={settings.strike_offset}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, strike_offset: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Max LTP</label>
                        <input
                          className="form-control"
                          type="number"
                          value={settings.max_entry_ltp}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, max_entry_ltp: Number(e.target.value) || 1 }))
                          }
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <div className="form-check mt-4">
                          <input
                            checked={settings.use_greek_selection}
                            className="form-check-input"
                            id="launcher-use-greek-selection"
                            onChange={(e) =>
                              setSettings((prev) => ({ ...prev, use_greek_selection: e.target.checked }))
                            }
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="launcher-use-greek-selection">
                            Use Greek Selection
                          </label>
                        </div>
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Risk Model</label>
                        <select
                          className="form-select"
                          value={settings.risk_model}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, risk_model: e.target.value as "dynamic" | "fixed" | "risk_amount" }))
                          }
                        >
                          <option value="dynamic">Dynamic</option>
                          <option value="fixed">Fixed %</option>
                          <option value="risk_amount">Risk Amount (₹)</option>
                        </select>
                      </div>
                      {settings.risk_model === "risk_amount" && (
                        <div className="col-6 col-md-2">
                          <label className="form-label">Risk Amount (₹)</label>
                          <input
                            className="form-control"
                            type="number"
                            min={1}
                            placeholder="e.g. 1000"
                            value={settings.risk_amount ?? ""}
                            onChange={(e) =>
                              setSettings((prev) => ({ ...prev, risk_amount: e.target.value ? Number(e.target.value) : null }))
                            }
                          />
                        </div>
                      )}
                      <div className="col-6 col-md-2 d-flex align-items-end">
                        <div className="form-check mb-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="useTimeWindowsLauncher"
                            checked={settings.use_time_windows}
                            onChange={(e) => setSettings((prev) => ({ ...prev, use_time_windows: e.target.checked }))}
                          />
                          <label className="form-check-label" htmlFor="useTimeWindowsLauncher">
                            Time Windows
                            <div className="small text-muted">ORB / FII / MOM · EOD 15:30</div>
                          </label>
                        </div>
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">SL %</label>
                        <input
                          className="form-control"
                          step="0.01"
                          type="number"
                          value={settings.sl_premium_pct}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, sl_premium_pct: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Target %</label>
                        <input
                          className="form-control"
                          step="0.01"
                          type="number"
                          value={settings.target_premium_pct}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, target_premium_pct: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Min Hold Sec</label>
                        <input
                          className="form-control"
                          type="number"
                          value={settings.min_hold_sec_before_underlying_exit}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              min_hold_sec_before_underlying_exit: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Entry Poll</label>
                        <input
                          className="form-control"
                          type="number"
                          value={settings.entry_interval_sec}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, entry_interval_sec: Number(e.target.value) || 1 }))
                          }
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Exit Poll</label>
                        <input
                          className="form-control"
                          type="number"
                          value={settings.exit_interval_sec}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, exit_interval_sec: Number(e.target.value) || 1 }))
                          }
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Lots</label>
                        <input
                          className="form-control"
                          type="number"
                          value={settings.lots}
                          onChange={(e) => setSettings((prev) => ({ ...prev, lots: Number(e.target.value) || 1 }))}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Lot Override</label>
                        <input
                          className="form-control"
                          inputMode="numeric"
                          placeholder="Auto"
                          value={settings.lot_size_override}
                          onChange={(e) => setSettings((prev) => ({ ...prev, lot_size_override: e.target.value }))}
                        />
                        <div className="small muted mt-1">Blank uses each instrument&apos;s catalog lot size.</div>
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Market Open</label>
                        <input
                          className="form-control"
                          value={settings.market_open}
                          onChange={(e) => setSettings((prev) => ({ ...prev, market_open: e.target.value }))}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Entry Cutoff</label>
                        <input
                          className="form-control"
                          value={settings.entry_cutoff}
                          onChange={(e) => setSettings((prev) => ({ ...prev, entry_cutoff: e.target.value }))}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Time Exit</label>
                        <input
                          className="form-control"
                          value={settings.time_exit}
                          onChange={(e) => setSettings((prev) => ({ ...prev, time_exit: e.target.value }))}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">Max Cycles</label>
                        <input
                          className="form-control"
                          min={1}
                          placeholder="Unlimited"
                          type="number"
                          value={settings.max_cycles}
                          onChange={(e) => setSettings((prev) => ({ ...prev, max_cycles: e.target.value }))}
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">Job Name Prefix</label>
                        <input
                          className="form-control"
                          placeholder="Optional prefix"
                          value={settings.job_name_prefix}
                          onChange={(e) => setSettings((prev) => ({ ...prev, job_name_prefix: e.target.value }))}
                        />
                      </div>
                      <div className="col-12">
                        <div className="d-flex flex-wrap gap-2">
                          <button
                            className="btn btn-warning"
                            disabled={actionBusy || queuedBotCount === 0}
                            onClick={() => handleLaunchSelected()}
                          >
                            {launching ? "Launching..." : `Start Selected Bots (${queuedBotCount})`}
                          </button>
                          <button
                            className="btn btn-outline-light"
                            disabled={actionBusy || selectedCallLaunchCount === 0}
                            onClick={() => handleLaunchSelected("call")}
                          >
                            Start Selected CALLs ({selectedCallLaunchCount})
                          </button>
                          <button
                            className="btn btn-outline-light"
                            disabled={actionBusy || selectedPutLaunchCount === 0}
                            onClick={() => handleLaunchSelected("put")}
                          >
                            Start Selected PUTs ({selectedPutLaunchCount})
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            disabled={actionBusy || selectedActiveJobCount === 0}
                            onClick={handleStopSelectedActive}
                          >
                            {controlAction === "stop" ? "Stopping..." : `Stop Selected Active (${selectedActiveJobCount})`}
                          </button>
                          <button
                            className="btn btn-outline-warning"
                            disabled={actionBusy || selectedOpenTradeCount === 0}
                            onClick={handleSquareOffSelectedOpen}
                          >
                            {controlAction === "square"
                              ? "Squaring Off..."
                              : `Square Off Selected Open (${selectedOpenTradeCount})`}
                          </button>
                          <button
                            className="btn btn-outline-light"
                            disabled={actionBusy || visibleItems.length === 0}
                            onClick={() => updateVisibleRows({ selected: true })}
                          >
                            Select Visible
                          </button>
                          <button
                            className="btn btn-outline-light"
                            disabled={actionBusy || visibleItems.length === 0}
                            onClick={() => updateVisibleRows({ selected: false })}
                          >
                            Clear Visible
                          </button>
                        </div>
                        <div className="muted mt-3">
                          Selected rows plus the enabled CALL and PUT checkboxes define the bulk launch, stop, and
                          square-off target set. Row lots and strike offset can be left blank to inherit the shared
                          defaults.
                        </div>
                        <div className="muted mt-2">
                          Auto store paths are always enabled here so every bot gets its own runtime DB safely.
                        </div>
                        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                            <div>
                              <h3 className="h5 mb-1">Automatic Strategy Assignment</h3>
                              <div className="muted">
                                Run historical backtests for the selected rows, keep only results above the configured
                                win rate and minimum trade count, and assign the best strategy separately for CALL and
                                PUT.
                              </div>
                            </div>
                            <button
                              className="btn btn-info"
                              disabled={assignmentLoading || assignmentRunning || selectedInstrumentCount === 0}
                              onClick={handleRunAssignments}
                            >
                              {assignmentRunning
                                ? "Running Backtests..."
                                : `Run Auto Assignment (${selectedInstrumentCount})`}
                            </button>
                          </div>
                          <div className="row g-3">
                            <div className="col-6 col-md-3">
                              <label className="form-label">From Date</label>
                              <input
                                className="form-control"
                                type="date"
                                value={assignmentControls.from_date}
                                onChange={(e) =>
                                  setAssignmentControls((prev) => ({ ...prev, from_date: e.target.value }))
                                }
                              />
                            </div>
                            <div className="col-6 col-md-3">
                              <label className="form-label">To Date</label>
                              <input
                                className="form-control"
                                type="date"
                                value={assignmentControls.to_date}
                                onChange={(e) =>
                                  setAssignmentControls((prev) => ({ ...prev, to_date: e.target.value }))
                                }
                              />
                            </div>
                            <div className="col-6 col-md-2">
                              <label className="form-label">Min Win %</label>
                              <input
                                className="form-control"
                                max={100}
                                min={0}
                                step="0.1"
                                type="number"
                                value={assignmentControls.min_win_rate}
                                onChange={(e) =>
                                  setAssignmentControls((prev) => ({
                                    ...prev,
                                    min_win_rate: Number(e.target.value) || 0,
                                  }))
                                }
                              />
                            </div>
                            <div className="col-6 col-md-2">
                              <label className="form-label">Min Trades</label>
                              <input
                                className="form-control"
                                min={1}
                                type="number"
                                value={assignmentControls.min_trades}
                                onChange={(e) =>
                                  setAssignmentControls((prev) => ({
                                    ...prev,
                                    min_trades: Math.max(1, Number(e.target.value) || 1),
                                  }))
                                }
                              />
                            </div>
                            <div className="col-6 col-md-1">
                              <div className="form-check mt-4">
                                <input
                                  checked={assignmentControls.include_call}
                                  className="form-check-input"
                                  id="assignment-include-call"
                                  onChange={(e) =>
                                    setAssignmentControls((prev) => ({ ...prev, include_call: e.target.checked }))
                                  }
                                  type="checkbox"
                                />
                                <label className="form-check-label" htmlFor="assignment-include-call">
                                  CALL
                                </label>
                              </div>
                            </div>
                            <div className="col-6 col-md-1">
                              <div className="form-check mt-4">
                                <input
                                  checked={assignmentControls.include_put}
                                  className="form-check-input"
                                  id="assignment-include-put"
                                  onChange={(e) =>
                                    setAssignmentControls((prev) => ({ ...prev, include_put: e.target.checked }))
                                  }
                                  type="checkbox"
                                />
                                <label className="form-check-label" htmlFor="assignment-include-put">
                                  PUT
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="row g-3 mt-1">
                            {[
                              { label: "Assigned CALLs", value: assignedCallCount },
                              { label: "Assigned PUTs", value: assignedPutCount },
                              { label: "Qualified Results", value: assignmentSummary?.qualified_results ?? 0 },
                              {
                                label: "Last Duration",
                                value: assignmentSummary ? `${assignmentSummary.duration_seconds.toFixed(1)}s` : "-",
                              },
                            ].map((metric) => (
                              <div className="col-sm-6 col-xl-3" key={metric.label}>
                                <div
                                  className="px-3 py-2 h-100"
                                  style={{
                                    border: "1px solid rgba(255, 255, 255, 0.08)",
                                    background: "rgba(8, 19, 33, 0.32)",
                                  }}
                                >
                                  <div className="metric-label">{metric.label}</div>
                                  <div className="metric-value fs-4">{metric.value}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="muted mt-3">
                            {assignmentLoading
                              ? "Loading saved strategy assignments..."
                              : assignmentSummary
                                ? `Latest batch filtered ${assignmentSummary.total_instruments} instrument(s) from ${assignmentSummary.from_date} to ${assignmentSummary.to_date} with ${fmtPercent(
                                    assignmentSummary.min_win_rate,
                                  )} minimum win rate and ${assignmentSummary.min_trades} minimum trades. Launches use assigned strategies when available and fall back to the default CALL or PUT strategy otherwise.`
                                : "No assignment batch has been run yet. Launches will use the default CALL and PUT strategies until assignments are created."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-xl-4">
                <div className="dashboard-panel h-100" id="launcher-notes">
                  <h2 className="panel-title">Launcher Notes</h2>
                  <div className="p-3 muted">
                    This page now supports batched start, batched stop, and batched square-off for selected managed
                    bots. It is meant for orchestration, while the main dashboard remains the place for detailed bot
                    monitoring.
                    <div className="mt-3">
                      Large batches can still hit Upstox rate limits because every bot will fetch candles and option
                      data once it starts. Starting smaller slices, such as 5-10 instruments at a time, is usually
                      safer.
                    </div>
                    <div className="mt-3">
                      Row overrides apply to both enabled sides of that instrument. If you need different CALL and PUT
                      overrides per symbol, we can add side-level overrides in the next pass.
                    </div>
                    <div className="mt-3">
                      Automatic strategy assignment works on the selected rows only. It backtests both sides when
                      enabled, then stores the strongest qualifying strategy so later launches can reuse it.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="row g-3 mb-4">
          {[
            { label: "Visible Instruments", value: visibleItems.length },
            { label: "Selected Instruments", value: selectedInstrumentCount },
            { label: "Queued Bots", value: queuedBotCount },
            { label: "Selected Active", value: selectedActiveJobCount },
            { label: "Selected Open Trades", value: selectedOpenTradeCount },
            { label: "Active Bots", value: activeBots.length },
            { label: "Active Calls", value: activeCallCount },
            { label: "Active Puts", value: activePutCount },
            { label: "Assigned Calls", value: assignedCallCount },
            { label: "Assigned Puts", value: assignedPutCount },
          ].map((metric) => (
            <div className="col-sm-6 col-xl-3" key={metric.label}>
              <div className="metric-card p-3">
                <div className="metric-label">{metric.label}</div>
                <div className="metric-value">{metric.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="row g-3 mb-4">
          {[
            {
              title: "Active Portfolio",
              subtitle: `${activePortfolioSummary.active_jobs} active jobs | ${activePortfolioSummary.open_trades} open trades`,
              summary: activePortfolioSummary,
            },
            {
              title: "Selected Portfolio",
              subtitle: `${selectedPortfolioSummary.active_jobs} selected active jobs | ${selectedPortfolioSummary.open_trades} open trades`,
              summary: selectedPortfolioSummary,
            },
          ].map((group) => (
            <div className="col-12 col-xl-6" key={group.title}>
              <section className="dashboard-panel h-100">
                <h2 className="panel-title">{group.title}</h2>
                <div className="p-3">
                  <div className="muted mb-3">{group.subtitle}</div>
                  <div className="row g-2">
                    {[
                      { label: "Investment", value: group.summary.investment, tone: "blue" },
                      { label: "Gross Profit", value: group.summary.gross_profit, tone: "green" },
                      { label: "Gross Loss", value: group.summary.gross_loss, tone: "red" },
                      { label: "Realized PnL", value: group.summary.realized_pnl, tone: pnlTone(group.summary.realized_pnl) },
                      {
                        label: "Unrealized PnL",
                        value: group.summary.unrealized_pnl,
                        tone: pnlTone(group.summary.unrealized_pnl),
                      },
                      { label: "Total PnL", value: group.summary.total_pnl, tone: pnlTone(group.summary.total_pnl) },
                    ].map((metric) => (
                      <div className="col-12 col-md-6" key={`${group.title}-${metric.label}`}>
                        <div
                          className="d-flex justify-content-between align-items-center gap-3 px-3 py-2"
                          style={{ border: "1px solid rgba(255, 255, 255, 0.06)", background: "rgba(8, 19, 33, 0.28)" }}
                        >
                          <div className="metric-label">{metric.label}</div>
                          <div className={`badge-soft ${metric.tone}`}>{fmtMoney(metric.value)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          ))}
        </div>

        <section className="dashboard-panel" id="launcher-table">
          <h2 className="panel-title">Instrument Launcher Table</h2>
          <div className="p-3">
            {(catalogLoading || jobsLoading) && <div className="muted">Loading launcher data...</div>}
            {!catalogLoading && !visibleItems.length && (
              <div className="empty-state">No instruments match the current filters.</div>
            )}
            {!catalogLoading && visibleItems.length > 0 && (
              <div className="table-responsive">
                <table className="table table-dark-shell align-middle">
                  <thead>
                    <tr>
                      <th>
                        <div className="form-check mb-0">
                          <input
                            checked={allVisibleSelected}
                            className="form-check-input"
                            id="launcher-select-all"
                            onChange={(e) => updateVisibleRows({ selected: e.target.checked })}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="launcher-select-all">
                            Select
                          </label>
                        </div>
                      </th>
                      <th>Instrument</th>
                      <th>Kind</th>
                      <th>Verified</th>
                      <th>Row Lots</th>
                      <th>Row Strike</th>
                      <th>
                        <div className="form-check mb-0">
                          <input
                            checked={allVisibleCallEnabled}
                            className="form-check-input"
                            id="launcher-call-all"
                            onChange={(e) => updateVisibleRows({ call_enabled: e.target.checked })}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="launcher-call-all">
                            Call
                          </label>
                        </div>
                      </th>
                      <th>
                        <div className="form-check mb-0">
                          <input
                            checked={allVisiblePutEnabled}
                            className="form-check-input"
                            id="launcher-put-all"
                            onChange={(e) => updateVisibleRows({ put_enabled: e.target.checked })}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="launcher-put-all">
                            Put
                          </label>
                        </div>
                      </th>
                      <th>Row Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => {
                      const state = rowState[item.instrument_key] ?? defaultRowState();
                      const callAssignment = assignmentMap.get(`${item.instrument_key}:call`);
                      const putAssignment = assignmentMap.get(`${item.instrument_key}:put`);
                      const callJob = latestJobMap.get(`${item.instrument_key}:call`);
                      const putJob = latestJobMap.get(`${item.instrument_key}:put`);
                      const rowRequests = buildLaunchRequests([item]);
                      const rowBotCount = rowRequests.length;
                      const resolvedLots = parseIntegerOverride(state.lots_override, settings.lots, 1);
                      const resolvedStrike = parseIntegerOverride(state.strike_offset_override, settings.strike_offset);

                      return (
                        <tr key={item.instrument_key}>
                          <td>
                            <input
                              checked={state.selected}
                              className="form-check-input"
                              onChange={(e) => updateRowState(item.instrument_key, { selected: e.target.checked })}
                              type="checkbox"
                            />
                          </td>
                          <td>
                            <div className="fw-semibold">{instrumentLabel(item)}</div>
                            <div className="muted small">{item.instrument_key}</div>
                            {item.lot_size ? <div className="muted small">Lot size {item.lot_size}</div> : null}
                          </td>
                          <td>{item.kind.toUpperCase()}</td>
                          <td>
                            <span className={`badge-soft ${item.verified ? "green" : "gold"}`}>
                              {item.verified ? "Verified" : "Unverified"}
                            </span>
                          </td>
                          <td>
                            <input
                              className="form-control form-control-sm"
                              min={1}
                              placeholder={`Global ${settings.lots}`}
                              type="number"
                              value={state.lots_override}
                              onChange={(e) => updateRowState(item.instrument_key, { lots_override: e.target.value })}
                            />
                            <div className="muted small mt-1">Using {resolvedLots}</div>
                          </td>
                          <td>
                            <input
                              className="form-control form-control-sm"
                              placeholder={`Global ${settings.strike_offset}`}
                              type="number"
                              value={state.strike_offset_override}
                              onChange={(e) =>
                                updateRowState(item.instrument_key, { strike_offset_override: e.target.value })
                              }
                            />
                            <div className="muted small mt-1">Using {resolvedStrike}</div>
                          </td>
                          <td>
                            <div className="d-flex flex-column gap-2">
                              <div className="form-check">
                                <input
                                  checked={state.call_enabled}
                                  className="form-check-input"
                                  id={`call-${item.instrument_key}`}
                                  onChange={(e) =>
                                    updateRowState(item.instrument_key, { call_enabled: e.target.checked })
                                  }
                                  type="checkbox"
                                />
                                <label className="form-check-label" htmlFor={`call-${item.instrument_key}`}>
                                  Enable CALL
                                </label>
                              </div>
                              {callAssignment ? (
                                <div>
                                  <span className="badge-soft blue">{callAssignment.strategy_label}</span>
                                  <div className="muted small mt-1">
                                    {fmtPercent(callAssignment.win_rate)} win rate | {callAssignment.trades} trades
                                  </div>
                                </div>
                              ) : (
                                <div className="muted small">
                                  Default strategy: {defaultStrategyIdForSide("call")}
                                </div>
                              )}
                              {callJob ? (
                                <div>
                                  <span className={`badge-soft ${statusTone(callJob.status)}`}>{callJob.status}</span>
                                  <div className="muted small mt-1">
                                    {callJob.has_open_trade
                                      ? `Open trade ${callJob.open_trade_option ?? callJob.open_trade_strike ?? ""}`
                                      : `Updated ${fmtDateTime(callJob.last_log_at ?? callJob.started_at)}`}
                                  </div>
                                </div>
                              ) : (
                                <div className="muted small">Idle</div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-column gap-2">
                              <div className="form-check">
                                <input
                                  checked={state.put_enabled}
                                  className="form-check-input"
                                  id={`put-${item.instrument_key}`}
                                  onChange={(e) => updateRowState(item.instrument_key, { put_enabled: e.target.checked })}
                                  type="checkbox"
                                />
                                <label className="form-check-label" htmlFor={`put-${item.instrument_key}`}>
                                  Enable PUT
                                </label>
                              </div>
                              {putAssignment ? (
                                <div>
                                  <span className="badge-soft blue">{putAssignment.strategy_label}</span>
                                  <div className="muted small mt-1">
                                    {fmtPercent(putAssignment.win_rate)} win rate | {putAssignment.trades} trades
                                  </div>
                                </div>
                              ) : (
                                <div className="muted small">
                                  Default strategy: {defaultStrategyIdForSide("put")}
                                </div>
                              )}
                              {putJob ? (
                                <div>
                                  <span className={`badge-soft ${statusTone(putJob.status)}`}>{putJob.status}</span>
                                  <div className="muted small mt-1">
                                    {putJob.has_open_trade
                                      ? `Open trade ${putJob.open_trade_option ?? putJob.open_trade_strike ?? ""}`
                                      : `Updated ${fmtDateTime(putJob.last_log_at ?? putJob.started_at)}`}
                                  </div>
                                </div>
                              ) : (
                                <div className="muted small">Idle</div>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-light"
                              disabled={actionBusy || rowBotCount === 0}
                              onClick={() => handleLaunchRow(item)}
                            >
                              {launching ? "Launching..." : `Launch ${rowBotCount} Bot${rowBotCount === 1 ? "" : "s"}`}
                            </button>
                            <div className="muted small mt-2">
                              Lots {resolvedLots} | Strike {resolvedStrike}
                            </div>
                            <div className="muted small mt-2">
                              Launch uses saved assignments where available, then falls back to side defaults.
                            </div>
                            {(activeJobKeySet.has(`${item.instrument_key}:call`) ||
                              activeJobKeySet.has(`${item.instrument_key}:put`)) && (
                              <div className="muted small mt-2">Active sides will be skipped during new launches.</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="dashboard-panel mt-4" id="launcher-activity">
          <h2 className="panel-title">Launch Activity</h2>
          <div className="p-3">
            <div className="muted mb-3">
              Batch launches, stop requests, and square-offs run sequentially here so the browser does not fire all
              control requests at once.
            </div>
            <pre className="mb-0 small" style={{ maxHeight: 320, overflow: "auto", whiteSpace: "pre-wrap" }}>
              {activityLog.length ? activityLog.join("\n") : "No launch activity yet."}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
