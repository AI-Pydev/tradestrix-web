"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { fetchInstrumentCatalog, InstrumentCatalogResponse, InstrumentItem } from "@/lib/api";
import {
  CandleLabBroker,
  CandleLabCandle,
  CandleLabKind,
  CandleLabPriceMode,
  CandleLabPreviewRequest,
  CandleLabPreviewResponse,
  CandleLabScenario,
  CandleLabSourceMode,
  previewCustomCandleLab,
} from "@/lib/custom-candle-api";

type FormState = {
  instrument_key: string;
  scenario: CandleLabScenario;
  source_mode: CandleLabSourceMode;
  broker_id: CandleLabBroker;
  price_mode: CandleLabPriceMode;
  history_date: string;
  candle_kind: CandleLabKind;
  candle_value: string;
  replay_tick_count: string;
  tick_interval_seconds: string;
  base_price: string;
  display_limit: string;
};

type TimeframePreset = {
  id: string;
  label: string;
  candle_value: string;
  tick_interval_seconds: string;
  replay_tick_count: string;
  display_limit: string;
};

function defaultHistoryDateInput() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

const DEFAULT_FORM: FormState = {
  instrument_key: "NSE_INDEX|Nifty 50",
  scenario: "whipsaw",
  source_mode: "broker_intraday",
  broker_id: "upstox",
  price_mode: "heikin_ashi",
  history_date: defaultHistoryDateInput(),
  candle_kind: "time",
  candle_value: "180",
  replay_tick_count: "7200",
  tick_interval_seconds: "3",
  base_price: "25000",
  display_limit: "120",
};

const TIMEFRAME_PRESETS: TimeframePreset[] = [
  { id: "1s", label: "1S", candle_value: "1", tick_interval_seconds: "1", replay_tick_count: "1800", display_limit: "120" },
  { id: "2s", label: "2S", candle_value: "2", tick_interval_seconds: "1", replay_tick_count: "2400", display_limit: "120" },
  { id: "5s", label: "5S", candle_value: "5", tick_interval_seconds: "1", replay_tick_count: "3600", display_limit: "120" },
  { id: "15s", label: "15S", candle_value: "15", tick_interval_seconds: "1", replay_tick_count: "5400", display_limit: "120" },
  { id: "30s", label: "30S", candle_value: "30", tick_interval_seconds: "1", replay_tick_count: "7200", display_limit: "120" },
  { id: "1m", label: "1M", candle_value: "60", tick_interval_seconds: "1", replay_tick_count: "7200", display_limit: "120" },
  { id: "3m", label: "3M", candle_value: "180", tick_interval_seconds: "3", replay_tick_count: "7200", display_limit: "120" },
  { id: "5m", label: "5M", candle_value: "300", tick_interval_seconds: "5", replay_tick_count: "7200", display_limit: "120" },
  { id: "15m", label: "15M", candle_value: "900", tick_interval_seconds: "15", replay_tick_count: "7200", display_limit: "120" },
  { id: "30m", label: "30M", candle_value: "1800", tick_interval_seconds: "30", replay_tick_count: "7200", display_limit: "120" },
  { id: "1h", label: "1H", candle_value: "3600", tick_interval_seconds: "60", replay_tick_count: "7200", display_limit: "120" },
  { id: "4h", label: "4H", candle_value: "14400", tick_interval_seconds: "300", replay_tick_count: "5760", display_limit: "120" },
  { id: "1d", label: "1D", candle_value: "86400", tick_interval_seconds: "900", replay_tick_count: "5760", display_limit: "90" },
];

const PRESETS: Record<CandleLabKind, Array<{ label: string; value: string }>> = {
  time: [
    { label: "1s", value: "1" },
    { label: "2s", value: "2" },
    { label: "5s", value: "5" },
    { label: "15s", value: "15" },
    { label: "30s", value: "30" },
    { label: "60s", value: "60" },
  ],
  tick: [
    { label: "1T", value: "1" },
    { label: "3T", value: "3" },
    { label: "10T", value: "10" },
    { label: "25T", value: "25" },
    { label: "50T", value: "50" },
  ],
  volume: [
    { label: "100", value: "100" },
    { label: "250", value: "250" },
    { label: "500", value: "500" },
    { label: "1000", value: "1000" },
    { label: "2000", value: "2000" },
  ],
  range: [
    { label: "2", value: "2" },
    { label: "5", value: "5" },
    { label: "10", value: "10" },
    { label: "20", value: "20" },
    { label: "40", value: "40" },
  ],
};

const SCENARIO_COPY: Record<CandleLabScenario, string> = {
  trend_up: "Steady climb with mild pullbacks to see how smaller candles stay responsive.",
  trend_down: "Downward drift with rebounds so you can compare bearish structure across settings.",
  range: "Oscillating movement around a base price to inspect noisy sideways markets.",
  volatile: "High-amplitude swings to stress-test candle compression and indicator stability.",
  whipsaw: "Alternating directional bursts built to trigger faster EMA crossover changes.",
};

function fmtNumber(value?: number | null, maximumFractionDigits = 2) {
  if (value == null) {
    return "-";
  }
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value);
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

function fmtMove(value?: number | null, pct?: number | null) {
  if (value == null || pct == null) {
    return "-";
  }
  return `${value >= 0 ? "+" : ""}${fmtNumber(value)} (${fmtNumber(pct)}%)`;
}

function fmtDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtAxisTime(value?: string | null, includeDate = false) {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  if (includeDate) {
    return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }
  return parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function metricTone(value?: number | null) {
  if (value == null || value === 0) {
    return "";
  }
  return value > 0 ? "positive" : "negative";
}

function signalTone(action: string) {
  if (action === "BUY") {
    return "green";
  }
  if (action === "SELL" || action === "EXIT") {
    return "red";
  }
  return "blue";
}

function instrumentOptions(data: InstrumentCatalogResponse | null) {
  if (!data) {
    return [];
  }
  return [...data.indices, ...data.stocks, ...data.commodities];
}

function instrumentLabel(item: InstrumentItem) {
  return item.verified ? item.label : `${item.label} (unverified)`;
}

function matchingTimeframePreset(form: FormState) {
  if (form.candle_kind !== "time") {
    return null;
  }
  return (
    TIMEFRAME_PRESETS.find(
      (preset) =>
        preset.candle_value === form.candle_value &&
        (isBrokerBackedSourceMode(form.source_mode) ||
          (preset.tick_interval_seconds === form.tick_interval_seconds &&
            preset.replay_tick_count === form.replay_tick_count)),
    ) ?? null
  );
}

function isBrokerBackedSourceMode(sourceMode: CandleLabSourceMode) {
  return sourceMode === "broker_intraday" || sourceMode === "broker_live_ticks";
}

function isBrokerSupportedPreset(preset: TimeframePreset) {
  return Number(preset.candle_value) >= 60;
}

function preferredBrokerPreset() {
  return TIMEFRAME_PRESETS.find((preset) => preset.id === "3m") ?? TIMEFRAME_PRESETS[5];
}

function previewModeLabel(preview: CandleLabPreviewResponse | null, form: FormState) {
  const sourceMode = preview?.mode ?? form.source_mode;
  const brokerId = preview?.broker_id ?? form.broker_id;
  const priceMode = preview?.price_mode ?? form.price_mode;
  const sourceLabel =
    sourceMode === "broker_live_ticks"
      ? `${brokerId.toUpperCase()} live websocket`
      : sourceMode === "broker_intraday"
        ? `${brokerId.toUpperCase()} broker history`
        : "Replay sandbox";
  const priceLabel = priceMode === "heikin_ashi" ? "Heikin Ashi" : "Standard OHLC";
  return `${sourceLabel} | ${priceLabel}`;
}

function previewCountLabel(preview: CandleLabPreviewResponse | null, form: FormState) {
  const sourceMode = preview?.mode ?? form.source_mode;
  if (sourceMode === "broker_live_ticks") {
    return "Live ticks";
  }
  if (sourceMode === "broker_intraday") {
    return "Source bars";
  }
  return "Generated ticks";
}

function previewDataAsOf(preview: CandleLabPreviewResponse | null) {
  if (!preview) {
    return null;
  }
  if (preview.mode === "broker_live_ticks") {
    return preview.live_state?.last_tick_time ?? preview.summary.latest_complete_close_time ?? null;
  }
  return preview.summary.latest_complete_close_time ?? null;
}

function normalizePayload(form: FormState): CandleLabPreviewRequest {
  const presetFallback = PRESETS[form.candle_kind][0]?.value ?? "1";
  return {
    instrument_key: form.instrument_key || DEFAULT_FORM.instrument_key,
    scenario: form.scenario,
    candle_kind: form.candle_kind,
    candle_value: Math.max(0.01, Number(form.candle_value) || Number(presetFallback) || 1),
    replay_tick_count: Math.max(120, Math.trunc(Number(form.replay_tick_count) || Number(DEFAULT_FORM.replay_tick_count))),
    tick_interval_seconds: Math.max(0.1, Number(form.tick_interval_seconds) || Number(DEFAULT_FORM.tick_interval_seconds)),
    base_price: Math.max(1, Number(form.base_price) || Number(DEFAULT_FORM.base_price)),
    display_limit: Math.max(20, Math.trunc(Number(form.display_limit) || Number(DEFAULT_FORM.display_limit))),
    source_mode: form.source_mode,
    broker_id: form.broker_id,
    price_mode: form.price_mode,
    history_date: form.source_mode === "broker_intraday" ? (form.history_date || null) : null,
  };
}

function CandleChart({
  candles,
  openCandle,
  expanded = false,
  instrumentName,
  specLabel,
  modeLabel,
}: {
  candles: CandleLabCandle[];
  openCandle?: CandleLabCandle | null;
  expanded?: boolean;
  instrumentName: string;
  specLabel: string;
  modeLabel: string;
}) {
  const chartCandles = useMemo(() => {
    const recent = candles.slice(expanded ? -180 : -80);
    if (openCandle) {
      return [...recent, openCandle];
    }
    return recent;
  }, [candles, expanded, openCandle]);

  if (!chartCandles.length) {
    return <div className="empty-state">No candles available for the current preview.</div>;
  }

  const width = Math.max(chartCandles.length * (expanded ? 18 : 15), expanded ? 1180 : 760);
  const height = expanded ? 620 : 430;
  const topPadding = 18;
  const leftPadding = 18;
  const bottomPadding = 34;
  const rightScaleWidth = 84;
  const plotWidth = width - leftPadding - rightScaleWidth;
  const plotHeight = height - topPadding - bottomPadding;
  const plotRight = leftPadding + plotWidth;
  const plotBottom = topPadding + plotHeight;
  const minLow = Math.min(...chartCandles.map((item) => item.low));
  const maxHigh = Math.max(...chartCandles.map((item) => item.high));
  const range = Math.max(maxHigh - minLow, maxHigh * 0.002, 1);
  const step = plotWidth / chartCandles.length;
  const bodyWidth = Math.max(step * 0.6, expanded ? 6 : 4);
  const y = (price: number) => topPadding + ((maxHigh - price) / range) * plotHeight;
  const guideLevels = [0, 0.25, 0.5, 0.75, 1];
  const latestCandle = chartCandles[chartCandles.length - 1];
  const previousClose = chartCandles.length > 1 ? chartCandles[chartCandles.length - 2].close : latestCandle.close;
  const lastDelta = latestCandle.close - previousClose;
  const lastDeltaPct = previousClose ? (lastDelta / previousClose) * 100 : 0;
  const currentLineY = y(latestCandle.close);
  const spansMultipleDays = chartCandles.some((item) => item.close_time.slice(0, 10) !== chartCandles[0].close_time.slice(0, 10));
  const labelStride = Math.max(1, Math.ceil(chartCandles.length / (expanded ? 8 : 6)));
  const timeLabelIndices = chartCandles
    .map((_, index) => index)
    .filter((index) => index === 0 || index === chartCandles.length - 1 || index % labelStride === 0);

  return (
    <div className="candle-lab-chart-shell">
      <div className="candle-lab-chart-meta">
        <div>
          <div className="candle-lab-chart-title">{instrumentName}</div>
          <div className="candle-lab-chart-subtitle">
            {specLabel} | {modeLabel}
          </div>
        </div>
        <div className={`candle-lab-chart-stats ${lastDelta >= 0 ? "positive" : "negative"}`}>
          <span>O {fmtNumber(latestCandle.open)}</span>
          <span>H {fmtNumber(latestCandle.high)}</span>
          <span>L {fmtNumber(latestCandle.low)}</span>
          <span>C {fmtNumber(latestCandle.close)}</span>
          <span>
            {lastDelta >= 0 ? "+" : ""}
            {fmtNumber(lastDelta)} ({fmtNumber(lastDeltaPct)}%)
          </span>
        </div>
      </div>
      <svg className={`candle-lab-chart ${expanded ? "expanded" : ""}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <rect className="candle-lab-plot-bg" x={leftPadding} y={topPadding} width={plotWidth} height={plotHeight} rx="12" />
        {guideLevels.map((level) => {
          const guideY = topPadding + plotHeight * level;
          const labelPrice = maxHigh - range * level;
          return (
            <g key={level}>
              <line className="candle-lab-grid-line" x1={leftPadding} x2={plotRight} y1={guideY} y2={guideY} />
              <text className="candle-lab-grid-label" x={plotRight + 10} y={guideY + 4}>
                {fmtNumber(labelPrice)}
              </text>
            </g>
          );
        })}
        {timeLabelIndices.map((index) => {
          const candle = chartCandles[index];
          const x = leftPadding + step * index + step / 2;
          return (
            <g key={`time-${index}`}>
              <line className="candle-lab-grid-line vertical" x1={x} x2={x} y1={topPadding} y2={plotBottom} />
              <text className="candle-lab-time-label" x={x} y={plotBottom + 20} textAnchor="middle">
                {fmtAxisTime(candle.close_time, spansMultipleDays)}
              </text>
            </g>
          );
        })}
        <line className={`candle-lab-price-line ${lastDelta >= 0 ? "up" : "down"}`} x1={leftPadding} x2={plotRight} y1={currentLineY} y2={currentLineY} />
        {chartCandles.map((candle, index) => {
          const centerX = leftPadding + step * index + step / 2;
          const wickTop = y(candle.high);
          const wickBottom = y(candle.low);
          const openY = y(candle.open);
          const closeY = y(candle.close);
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(Math.abs(openY - closeY), 1.5);
          const tone = candle.close >= candle.open ? "up" : "down";
          const faded = index === chartCandles.length - 1 && !candle.complete ? "faded" : "";

          return (
            <g key={`${candle.open_time}-${index}`} className={`candle-lab-candle ${tone} ${faded}`}>
              <line x1={centerX} x2={centerX} y1={wickTop} y2={wickBottom} />
              <rect
                x={centerX - bodyWidth / 2}
                y={bodyY}
                width={bodyWidth}
                height={bodyHeight}
                rx="1.5"
              />
            </g>
          );
        })}
        <g className={`candle-lab-price-tag ${lastDelta >= 0 ? "up" : "down"}`}>
          <rect x={plotRight + 8} y={currentLineY - 12} width={rightScaleWidth - 16} height={24} rx="7" />
          <text x={plotRight + (rightScaleWidth / 2)} y={currentLineY + 4} textAnchor="middle">
            {fmtNumber(latestCandle.close)}
          </text>
        </g>
      </svg>
      <div className="candle-lab-chart-footer">
        <span>High {fmtNumber(maxHigh)}</span>
        <span>Low {fmtNumber(minLow)}</span>
        <span>Bars {chartCandles.length}</span>
      </div>
    </div>
  );
}

export function CustomCandleLabShell() {
  const [catalog, setCatalog] = useState<InstrumentCatalogResponse | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [preview, setPreview] = useState<CandleLabPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartExpanded, setChartExpanded] = useState(false);

  const instruments = useMemo(() => instrumentOptions(catalog), [catalog]);
  const selectedInstrument = useMemo(
    () => instruments.find((item) => item.instrument_key === form.instrument_key) ?? null,
    [form.instrument_key, instruments],
  );
  const isBrokerBackedMode = isBrokerBackedSourceMode(form.source_mode);
  const isLiveMode = form.source_mode === "broker_live_ticks";
  const selectedPresets = PRESETS[form.candle_kind];
  const activeTimeframePreset = matchingTimeframePreset(form);
  const indicatorRows = preview?.latest_indicators
    ? [
        { label: "EMA Fast", value: preview.latest_indicators.ema_fast },
        { label: "EMA Slow", value: preview.latest_indicators.ema_slow },
        { label: "SMA Fast", value: preview.latest_indicators.sma_fast },
        { label: "SMA Slow", value: preview.latest_indicators.sma_slow },
        { label: "RSI", value: preview.latest_indicators.rsi },
        { label: "MACD", value: preview.latest_indicators.macd },
        { label: "MACD Signal", value: preview.latest_indicators.macd_signal },
        { label: "ATR", value: preview.latest_indicators.atr },
        { label: "Volatility", value: preview.latest_indicators.volatility },
      ]
    : [];

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        const result = await fetchInstrumentCatalog();
        if (!active) {
          return;
        }
        setCatalog(result);
      } catch {
        if (!active) {
          return;
        }
        setCatalog(null);
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
    void loadPreview(DEFAULT_FORM);
  }, []);

  useEffect(() => {
    if (form.source_mode !== "broker_live_ticks") {
      return;
    }

    const timerId = window.setInterval(() => {
      void loadPreview(form, { quiet: true });
    }, 2000);

    return () => window.clearInterval(timerId);
  }, [form]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setChartExpanded(false);
      }
    }

    if (!chartExpanded) {
      return;
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [chartExpanded]);

  useEffect(() => {
    if (!instruments.length) {
      return;
    }
    if (instruments.some((item) => item.instrument_key === form.instrument_key)) {
      return;
    }
    setForm((prev) => ({ ...prev, instrument_key: instruments[0].instrument_key }));
  }, [form.instrument_key, instruments]);

  async function loadPreview(nextForm: FormState, options?: { quiet?: boolean }) {
    try {
      if (!options?.quiet) {
        setLoading(true);
      }
      setError("");
      const result = await previewCustomCandleLab(normalizePayload(nextForm));
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load custom candle preview");
      setPreview(null);
    } finally {
      if (!options?.quiet) {
        setLoading(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadPreview(form);
  }

  function handleReset() {
    setForm(DEFAULT_FORM);
    void loadPreview(DEFAULT_FORM);
  }

  function handlePresetSelect(value: string) {
    const nextForm = { ...form, candle_value: value };
    setForm(nextForm);
    void loadPreview(nextForm);
  }

  function handleTimeframeSelect(preset: TimeframePreset) {
    const nextForm = {
      ...form,
      candle_kind: "time" as CandleLabKind,
      candle_value: preset.candle_value,
      tick_interval_seconds: preset.tick_interval_seconds,
      replay_tick_count: preset.replay_tick_count,
      display_limit: preset.display_limit,
    };
    setForm(nextForm);
    void loadPreview(nextForm);
  }

  function handleKindChange(nextKind: CandleLabKind) {
    if (isBrokerBackedSourceMode(form.source_mode) && nextKind !== "time") {
      return;
    }
    const nextValue = PRESETS[nextKind][0]?.value ?? "1";
    const nextForm = {
      ...form,
      candle_kind: nextKind,
      candle_value: nextValue,
    };
    setForm(nextForm);
    void loadPreview(nextForm);
  }

  function handleSourceModeChange(nextMode: CandleLabSourceMode) {
    let nextForm: FormState = { ...form, source_mode: nextMode };
    if (isBrokerBackedSourceMode(nextMode)) {
      const brokerPreset = preferredBrokerPreset();
      nextForm = {
        ...nextForm,
        broker_id: nextMode === "broker_live_ticks" ? "upstox" : nextForm.broker_id,
        candle_kind: "time",
        price_mode: "heikin_ashi",
        history_date: nextMode === "broker_intraday" ? nextForm.history_date || DEFAULT_FORM.history_date : nextForm.history_date,
        candle_value: Number(nextForm.candle_value) >= 60 ? nextForm.candle_value : brokerPreset.candle_value,
        tick_interval_seconds: brokerPreset.tick_interval_seconds,
        replay_tick_count: brokerPreset.replay_tick_count,
        display_limit: Number(nextForm.display_limit) >= 20 ? nextForm.display_limit : brokerPreset.display_limit,
      };
    }
    setForm(nextForm);
    void loadPreview(nextForm);
  }

  function handlePriceModeChange(nextMode: CandleLabPriceMode) {
    const nextForm = { ...form, price_mode: nextMode };
    setForm(nextForm);
    void loadPreview(nextForm);
  }

  function handleBrokerChange(nextBroker: CandleLabBroker) {
    if (isLiveMode && nextBroker !== "upstox") {
      return;
    }
    const nextForm = { ...form, broker_id: nextBroker };
    setForm(nextForm);
    void loadPreview(nextForm);
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero platform-hero mb-4">
          <div className="hero-header">
            <h1 className="hero-title">Custom Candle Lab</h1>
            <p className="hero-subtitle">
              Compare internal replay candles with broker-backed history, then switch into a live websocket-backed
              forming candle without touching the existing trading flow.
            </p>
          </div>
          <div className="platform-hero-body">
            <div className="platform-hero-copy">
              <div className="landing-pill-row">
                <span className="landing-pill">Internal candle engine</span>
                <span className="landing-pill">
                  {isLiveMode ? "Upstox live ticks" : isBrokerBackedMode ? `${form.broker_id.toUpperCase()} history` : "Replay mode"}
                </span>
                <span className="landing-pill">{form.price_mode === "heikin_ashi" ? "Heikin Ashi" : "Standard OHLC"}</span>
              </div>
              <div className="landing-kpi-grid">
                <div className={`landing-kpi ${metricTone(preview?.summary.price_change)}`}>
                  <div className="landing-kpi-label">Latest Price</div>
                  <div className="landing-kpi-value">{fmtNumber(preview?.summary.latest_price)}</div>
                </div>
                <div className={`landing-kpi ${metricTone(preview?.summary.price_change)}`}>
                  <div className="landing-kpi-label">{isLiveMode ? "Live Session Move" : isBrokerBackedMode ? "Session Move" : "Replay Move"}</div>
                  <div className="landing-kpi-value">
                    {preview ? fmtMove(preview.summary.price_change, preview.summary.price_change_pct) : "-"}
                  </div>
                </div>
                <div className="landing-kpi">
                  <div className="landing-kpi-label">Completed Candles</div>
                  <div className="landing-kpi-value">{preview?.summary.completed_candle_count ?? "-"}</div>
                </div>
                <div className="landing-kpi">
                  <div className="landing-kpi-label">Signals</div>
                  <div className="landing-kpi-value">{preview?.summary.signal_count ?? "-"}</div>
                </div>
              </div>
            </div>

            <div className="platform-map-shell">
              <div className="platform-map-header">Preview Context</div>
              <div className="platform-map">
                {selectedInstrument ? instrumentLabel(selectedInstrument) : form.instrument_key}
                {"\n"}
                Mode: {previewModeLabel(preview, form)}
                {"\n"}
                Candle: {preview?.candle_spec.label ?? `${form.candle_value} ${form.candle_kind}`}
                {"\n"}
                {form.source_mode === "broker_intraday" ? `Selected Date: ${fmtDate(form.history_date)}` : null}
                {form.source_mode === "broker_intraday" ? "\n" : null}
                Data As Of: {fmtDateTime(previewDataAsOf(preview))}
                {"\n"}
                {previewCountLabel(preview, form)}: {preview?.summary.generated_tick_count ?? form.replay_tick_count}
              </div>
              <div className="platform-map-note">
                {isLiveMode
                  ? "Live websocket mode blends Upstox history with live LTPC ticks, so the active candle can track the market while completed bars keep proper HA context."
                  : isBrokerBackedMode
                    ? "Broker history mode is best for validating 3-minute NIFTY candles against completed exchange bars. Replay mode stays available for sub-minute and non-time custom candles."
                    : SCENARIO_COPY[form.scenario]}
              </div>
            </div>
          </div>
        </section>

        <form className="dashboard-panel mb-4" onSubmit={handleSubmit}>
          <h2 className="panel-title">Preview Controls</h2>
          <div className="candle-lab-panel-body">
            <div className="candle-lab-field-grid">
              <label className="candle-lab-field">
                <span>Instrument</span>
                <select
                  className="candle-lab-input"
                  value={form.instrument_key}
                  onChange={(event) => setForm((prev) => ({ ...prev, instrument_key: event.target.value }))}
                >
                  {instruments.length ? (
                    instruments.map((item) => (
                      <option key={item.instrument_key} value={item.instrument_key}>
                        {instrumentLabel(item)}
                      </option>
                    ))
                  ) : (
                    <option value={DEFAULT_FORM.instrument_key}>{catalogLoading ? "Loading catalog..." : DEFAULT_FORM.instrument_key}</option>
                  )}
                </select>
              </label>

              <label className="candle-lab-field">
                <span>Source</span>
                <select
                  className="candle-lab-input"
                  value={form.source_mode}
                  onChange={(event) => handleSourceModeChange(event.target.value as CandleLabSourceMode)}
                >
                  <option value="simulated_replay">Replay Sandbox</option>
                  <option value="broker_intraday">Broker History</option>
                  <option value="broker_live_ticks">Live WebSocket</option>
                </select>
              </label>

              <label className="candle-lab-field">
                <span>Price Mode</span>
                <select
                  className="candle-lab-input"
                  value={form.price_mode}
                  onChange={(event) => handlePriceModeChange(event.target.value as CandleLabPriceMode)}
                >
                  <option value="standard">Standard OHLC</option>
                  <option value="heikin_ashi">Heikin Ashi</option>
                </select>
              </label>

              <label className="candle-lab-field">
                <span>Broker</span>
                <select
                  className="candle-lab-input"
                  disabled={!isBrokerBackedMode}
                  value={form.broker_id}
                  onChange={(event) => handleBrokerChange(event.target.value as CandleLabBroker)}
                >
                  <option value="upstox">Upstox</option>
                  <option disabled={isLiveMode} value="kite">
                    {isLiveMode ? "Kite (history only)" : "Kite"}
                  </option>
                </select>
              </label>

              <label className="candle-lab-field">
                <span>Display Limit</span>
                <input
                  className="candle-lab-input"
                  inputMode="numeric"
                  value={form.display_limit}
                  onChange={(event) => setForm((prev) => ({ ...prev, display_limit: event.target.value }))}
                />
              </label>

              {!isBrokerBackedMode ? (
                <>
                  <label className="candle-lab-field">
                    <span>Scenario</span>
                    <select
                      className="candle-lab-input"
                      value={form.scenario}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, scenario: event.target.value as CandleLabScenario }))
                      }
                    >
                      <option value="whipsaw">Whipsaw</option>
                      <option value="trend_up">Trend Up</option>
                      <option value="trend_down">Trend Down</option>
                      <option value="range">Range Bound</option>
                      <option value="volatile">Volatile</option>
                    </select>
                  </label>

                  <label className="candle-lab-field">
                    <span>Candle Kind</span>
                    <select
                      className="candle-lab-input"
                      value={form.candle_kind}
                      onChange={(event) => handleKindChange(event.target.value as CandleLabKind)}
                    >
                      <option value="time">Time</option>
                      <option value="tick">Tick</option>
                      <option value="volume">Volume</option>
                      <option value="range">Range</option>
                    </select>
                  </label>

                  <label className="candle-lab-field">
                    <span>Candle Value</span>
                    <input
                      className="candle-lab-input"
                      inputMode="decimal"
                      value={form.candle_value}
                      onChange={(event) => setForm((prev) => ({ ...prev, candle_value: event.target.value }))}
                    />
                  </label>

                  <label className="candle-lab-field">
                    <span>Replay Ticks</span>
                    <input
                      className="candle-lab-input"
                      inputMode="numeric"
                      value={form.replay_tick_count}
                      onChange={(event) => setForm((prev) => ({ ...prev, replay_tick_count: event.target.value }))}
                    />
                  </label>

                  <label className="candle-lab-field">
                    <span>Tick Interval Sec</span>
                    <input
                      className="candle-lab-input"
                      inputMode="decimal"
                      value={form.tick_interval_seconds}
                      onChange={(event) => setForm((prev) => ({ ...prev, tick_interval_seconds: event.target.value }))}
                    />
                  </label>

                  <label className="candle-lab-field">
                    <span>Base Price</span>
                    <input
                      className="candle-lab-input"
                      inputMode="decimal"
                      value={form.base_price}
                      onChange={(event) => setForm((prev) => ({ ...prev, base_price: event.target.value }))}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="candle-lab-field">
                    <span>Candle Kind</span>
                    <input className="candle-lab-input" disabled value={isLiveMode ? "Time candles only (live)" : "Time candles only"} />
                  </label>

                  <label className="candle-lab-field">
                    <span>Candle Value</span>
                    <input
                      className="candle-lab-input"
                      inputMode="decimal"
                      value={form.candle_value}
                      onChange={(event) => setForm((prev) => ({ ...prev, candle_value: event.target.value }))}
                    />
                  </label>

                  {!isLiveMode ? (
                    <label className="candle-lab-field">
                      <span>History Date</span>
                      <input
                        className="candle-lab-input"
                        type="date"
                        value={form.history_date}
                        onChange={(event) => setForm((prev) => ({ ...prev, history_date: event.target.value }))}
                      />
                    </label>
                  ) : null}
                </>
              )}
            </div>

            <div className="candle-lab-timeframe-strip">
              <div className="candle-lab-strip-label">Timeframe presets</div>
              <div className="candle-lab-timeframe-row">
                {TIMEFRAME_PRESETS.map((preset) => (
                  <button
                    className={`candle-lab-timeframe ${activeTimeframePreset?.id === preset.id ? "active" : ""}`}
                    disabled={isBrokerBackedMode && !isBrokerSupportedPreset(preset)}
                    key={preset.id}
                    onClick={() => handleTimeframeSelect(preset)}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {!isBrokerBackedMode ? (
              <div className="candle-lab-preset-row">
                {selectedPresets.map((preset) => (
                  <button
                    className={`candle-lab-preset ${form.candle_value === preset.value ? "active" : ""}`}
                    key={preset.label}
                    onClick={() => handlePresetSelect(preset.value)}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="candle-lab-actions">
              <button className="candle-lab-button" disabled={loading} type="submit">
                {loading ? "Running preview..." : "Run Preview"}
              </button>
              <button className="candle-lab-button secondary" disabled={loading} onClick={handleReset} type="button">
                Reset
              </button>
            </div>
            {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}
          </div>
        </form>

        <div className="candle-lab-grid">
          <section className="dashboard-panel">
            <div className="panel-title candle-lab-panel-title-row">
              <span>{previewModeLabel(preview, form)}</span>
              <button
                className="candle-lab-maximize"
                onClick={() => setChartExpanded(true)}
                type="button"
              >
                Maximize Chart
              </button>
            </div>
            <div className="candle-lab-panel-body">
              <CandleChart
                candles={preview?.candles ?? []}
                openCandle={preview?.open_candle ?? null}
                instrumentName={selectedInstrument ? instrumentLabel(selectedInstrument) : form.instrument_key}
                specLabel={preview?.candle_spec.label ?? `${form.candle_value} ${form.candle_kind}`}
                modeLabel={previewModeLabel(preview, form)}
              />
              {preview?.mode === "broker_live_ticks" && preview.live_state ? (
                <div className={`candle-lab-live-card ${preview.live_state.stream_connected ? "connected" : "waiting"}`}>
                  <div className="candle-lab-live-header">
                    <div>
                      <div className="candle-lab-live-title">Live Stream Status</div>
                      <div className="candle-lab-live-subtitle">Backfilled bars plus the current in-progress websocket candle.</div>
                    </div>
                    <span className={`badge-soft ${preview.live_state.stream_connected ? "green" : "gold"}`}>
                      {preview.live_state.stream_connected ? "Connected" : "Waiting"}
                    </span>
                  </div>
                  <div className="candle-lab-live-grid">
                    <div>
                      <strong>Last tick</strong>
                      <span>{fmtDateTime(preview.live_state.last_tick_time)}</span>
                    </div>
                    <div>
                      <strong>Last price</strong>
                      <span>{fmtNumber(preview.live_state.last_tick_price)}</span>
                    </div>
                    <div>
                      <strong>Tick count</strong>
                      <span>{fmtNumber(preview.live_state.received_tick_count, 0)}</span>
                    </div>
                    <div>
                      <strong>Messages</strong>
                      <span>{fmtNumber(preview.live_state.received_message_count, 0)}</span>
                    </div>
                  </div>
                  {preview.live_state.last_error ? <div className="candle-lab-live-error">{preview.live_state.last_error}</div> : null}
                </div>
              ) : null}
              {preview?.open_candle ? (
                <div className="candle-lab-open-card">
                  <div className="candle-lab-open-label">Live open candle</div>
                  <div className="candle-lab-open-values">
                    O {fmtNumber(preview.open_candle.open)} | H {fmtNumber(preview.open_candle.high)} | L{" "}
                    {fmtNumber(preview.open_candle.low)} | C {fmtNumber(preview.open_candle.close)}
                  </div>
                </div>
              ) : null}
              <div className="candle-lab-note-list">
                {(preview?.notes ?? []).map((note) => (
                  <div className="candle-lab-note" key={note}>
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="dashboard-panel">
            <h2 className="panel-title">Indicator Snapshot</h2>
            <div className="candle-lab-panel-body">
              <div className="candle-lab-indicator-grid">
                {indicatorRows.length ? (
                  indicatorRows.map((item) => (
                    <div className="candle-lab-indicator-card" key={item.label}>
                      <div className="metric-label">{item.label}</div>
                      <div className="metric-value">{fmtNumber(item.value, 4)}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">Run a preview with enough completed candles to populate indicators.</div>
                )}
              </div>
              <div className="candle-lab-summary-list">
                {preview?.mode === "broker_intraday" ? (
                  <div>
                    <strong>Selected date:</strong> {fmtDate(form.history_date)}
                  </div>
                ) : null}
                <div>
                  <strong>Data as of:</strong> {fmtDateTime(previewDataAsOf(preview))}
                </div>
                <div>
                  <strong>Last completed bar:</strong> {fmtDateTime(preview?.summary.latest_complete_close_time)}
                </div>
                <div>
                  <strong>Spec:</strong> {preview?.candle_spec.label ?? "-"} / {preview?.candle_spec.kind ?? "-"}
                </div>
                <div>
                  <strong>{previewCountLabel(preview, form)}:</strong>{" "}
                  {preview?.summary.generated_tick_count ?? "-"}
                </div>
                {preview?.mode === "broker_live_ticks" ? (
                  <div>
                    <strong>Live stream:</strong> {preview.live_state?.stream_connected ? "Connected" : "Waiting for ticks"}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <div className="candle-lab-grid mt-4">
          <section className="dashboard-panel">
            <h2 className="panel-title">Recent Signals</h2>
            <div className="candle-lab-panel-body">
              {preview?.recent_signals.length ? (
                <div className="candle-lab-signal-list">
                  {preview.recent_signals
                    .slice()
                    .reverse()
                    .map((signal) => (
                      <div className="candle-lab-signal-item" key={`${signal.timestamp}-${signal.action}`}>
                        <div className="d-flex justify-content-between gap-3 align-items-start flex-wrap">
                          <div>
                            <span className={`badge-soft ${signalTone(signal.action)}`}>{signal.action}</span>
                            <strong className="ms-2">{fmtNumber(signal.price)}</strong>
                          </div>
                          <span className="muted">{fmtDateTime(signal.timestamp)}</span>
                        </div>
                        <div className="mt-2">{signal.reason}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty-state">No strategy signals yet for the current candle source and timeframe.</div>
              )}
            </div>
          </section>

          <section className="dashboard-panel">
            <h2 className="panel-title">Recent Candle Table</h2>
            <div className="table-responsive">
              <table className="table table-dark-shell align-middle mb-0">
                <thead>
                  <tr>
                    <th>Close Time</th>
                    <th>Open</th>
                    <th>High</th>
                    <th>Low</th>
                    <th>Close</th>
                    <th>Volume</th>
                    <th>Ticks</th>
                  </tr>
                </thead>
                <tbody>
                  {preview?.candles.length ? (
                    preview.candles
                      .slice(-12)
                      .reverse()
                      .map((candle) => (
                        <tr key={`${candle.open_time}-${candle.close_time}`}>
                          <td>{fmtDateTime(candle.close_time)}</td>
                          <td>{fmtNumber(candle.open)}</td>
                          <td>{fmtNumber(candle.high)}</td>
                          <td>{fmtNumber(candle.low)}</td>
                          <td>{fmtNumber(candle.close)}</td>
                          <td>{fmtNumber(candle.volume)}</td>
                          <td>{candle.tick_count}</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td className="empty-state" colSpan={7}>
                        {loading ? "Loading candle preview..." : "No candle data to display."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {chartExpanded ? (
          <div className="candle-lab-modal-backdrop" onClick={() => setChartExpanded(false)} role="presentation">
            <div
              className="candle-lab-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Expanded candle chart"
            >
              <div className="candle-lab-modal-header">
                <div>
                  <div className="candle-lab-modal-title">Expanded Chart</div>
                  <div className="candle-lab-modal-subtitle">
                    {selectedInstrument ? instrumentLabel(selectedInstrument) : form.instrument_key} |{" "}
                    {preview?.candle_spec.label ?? `${form.candle_value} ${form.candle_kind}`} |{" "}
                    {previewModeLabel(preview, form)}
                  </div>
                </div>
                <button className="candle-lab-close" onClick={() => setChartExpanded(false)} type="button">
                  Close
                </button>
              </div>
              <CandleChart
                candles={preview?.candles ?? []}
                openCandle={preview?.open_candle ?? null}
                expanded
                instrumentName={selectedInstrument ? instrumentLabel(selectedInstrument) : form.instrument_key}
                specLabel={preview?.candle_spec.label ?? `${form.candle_value} ${form.candle_kind}`}
                modeLabel={previewModeLabel(preview, form)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
