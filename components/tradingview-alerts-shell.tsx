"use client";

import { useEffect, useMemo, useState } from "react";

import {
    createTradingViewAlertTemplate,
    deleteTradingViewAlertTemplate,
    fetchInstrumentCatalog,
    fetchTradingViewAlertTemplateDiagnostics,
    fetchTradingViewAlertTemplateEvents,
    InstrumentItem,
    listTradingViewAlertTemplates,
    regenerateTradingViewAlertTemplateStrategyId,
    regenerateTradingViewAlertTemplateToken,
    setTradingViewAlertTemplateLive,
    setTradingViewAlertTemplatePaper,
    testTradingViewAlertTemplateWebhook,
    TradingViewAlertTemplate,
    TradingViewAlertTemplateCreateRequest,
    TradingViewAlertTemplateDiagnostics,
    TradingViewAlertTemplateStats,
    TradingViewAlertTemplateTestResponse,
    TradingViewWebhookEvent,
    updateTradingViewAlertTemplate,
} from "@/lib/api";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

type FormState = {
  alert_name: string;
  instrument_key: string;
  side: "call" | "put";
  paper_trade: boolean;
  trade_mode: 1 | 3;
  execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
  lots: string;
  option_offset: string;
  pine_strategy_id: string;
  notes: string;
};

type ActivityMode = "today" | "history";
type TemplateModeFilter = "paper" | "live";
type ActivityRow = TradingViewWebhookEvent & {
  entryLtp: number | null;
  exitLtp: number | null;
  pnl: number | null;
  totalPnl: number | null;
  indiaVix: number | null;
};
type ActivityTradeRow = {
  key: string;
  tradeId: number | null;
  entry: ActivityRow | null;
  exit: ActivityRow | null;
  standalone: ActivityRow | null;
};
type ModeSummary = {
  label: string;
  templateCount: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  grossPnl: number;
  grossProfit: number;
  grossLoss: number;
};
type DeleteDialogState = {
  templateId: string;
  alertName: string;
  instrumentKey: string;
  side: "call" | "put";
} | null;

function safeJson(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
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

function instrumentLabel(key: string, items: InstrumentItem[]) {
  return items.find((item) => item.instrument_key === key)?.label ?? key;
}

function instrumentLotSize(key: string, items: InstrumentItem[]) {
  return items.find((item) => item.instrument_key === key)?.lot_size ?? null;
}

function initialInstrumentKey(items: InstrumentItem[]) {
  return (
    items.find((item) => item.instrument_key === "NSE_INDEX|Nifty 50")?.instrument_key ??
    items[0]?.instrument_key ??
    "NSE_INDEX|Nifty 50"
  );
}

function toInt(value: string, fallback: number) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function fmtPnl(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }
  const sign = value > 0 ? "+" : "";
  return `₹${sign}${value.toFixed(2)}`;
}

function isDuplicateIgnoredEvent(event: ActivityRow) {
  return (
    event.status === "ignored" &&
    event.trade_id == null &&
    String(event.detail || "").toLowerCase().includes("duplicate ignored")
  );
}

function preferTradeEvent(current: ActivityRow | null, incoming: ActivityRow) {
  if (!current) {
    return incoming;
  }
  const rank = (event: ActivityRow) => {
    if (event.status === "accepted") return 3;
    if (event.status === "rejected") return 2;
    if (event.status === "ignored") return 1;
    return 0;
  };
  return rank(incoming) >= rank(current) ? incoming : current;
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

export function TradingViewAlertsShell() {
  const [templates, setTemplates] = useState<TradingViewAlertTemplate[]>([]);
  const [catalog, setCatalog] = useState<InstrumentItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<TradingViewAlertTemplateDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [error, setError] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [savingLotsId, setSavingLotsId] = useState<string | null>(null);
  const [lotDrafts, setLotDrafts] = useState<Record<string, string>>({});
  const [expandedSetupIds, setExpandedSetupIds] = useState<Record<string, boolean>>({});
  const [payloadExpanded, setPayloadExpanded] = useState(false);
  const [templateModeFilter, setTemplateModeFilter] = useState<TemplateModeFilter>("paper");
  const [activityTemplate, setActivityTemplate] = useState<TradingViewAlertTemplate | null>(null);
  const [activityMode, setActivityMode] = useState<ActivityMode>("today");
  const [activityEvents, setActivityEvents] = useState<TradingViewWebhookEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [switchingModeId, setSwitchingModeId] = useState<string | null>(null);

  const indices = useMemo(() => catalog.filter((item) => item.kind === "index"), [catalog]);
  const stocks = useMemo(() => catalog.filter((item) => item.kind === "stock"), [catalog]);
  const commodities = useMemo(() => catalog.filter((item) => item.kind === "commodity"), [catalog]);
  const activityRows = useMemo(() => {
    const ascending = [...activityEvents].reverse();
    let runningTotal = 0;

    const derivedAscending = ascending.map((event) => {
      const entryLtp = asNumber(event.entry_ltp) ?? payloadNumber(event.payload, "entry_ltp", "entry_price", "ltp");
      const exitLtp = asNumber(event.exit_ltp) ?? payloadNumber(event.payload, "exit_ltp", "exit_price");
      const pnl = asNumber(event.pnl) ?? payloadNumber(event.payload, "pnl", "pnl_amount");
      const indiaVix =
        asNumber((event as Record<string, unknown>).india_vix) ??
        payloadNumber(event.payload, "india_vix", "vix", "indiaVix");

      let totalPnl =
        asNumber(event.total_pnl) ?? payloadNumber(event.payload, "total_pnl", "running_pnl", "cum_pnl");

      if (totalPnl == null && pnl != null) {
        runningTotal += pnl;
        totalPnl = runningTotal;
      } else if (totalPnl != null) {
        runningTotal = totalPnl;
      } else {
        // Keep a stable cumulative value visible even on entry-only rows.
        totalPnl = runningTotal;
      }

      return {
        ...event,
        entryLtp,
        exitLtp,
        pnl,
        totalPnl,
        indiaVix,
      } as ActivityRow;
    });

    return derivedAscending.reverse();
  }, [activityEvents]);
  const activityTradeRows = useMemo(() => {
    const rowsAscending = [...activityRows].reverse();
    const groups: ActivityTradeRow[] = [];
    const byTradeId = new Map<number, ActivityTradeRow>();
    let syntheticId = 0;

    for (const event of rowsAscending) {
      const tradeId = event.trade_id ?? null;
      const action = String(event.normalized_action || "").toUpperCase();
      if (isDuplicateIgnoredEvent(event)) {
        continue;
      }
      let row = tradeId != null ? byTradeId.get(tradeId) ?? null : null;

      if (action === "ENTRY") {
        if (!row) {
          row = { key: tradeId != null ? `trade-${tradeId}` : `entry-${syntheticId++}`, tradeId, entry: null, exit: null, standalone: null };
          groups.push(row);
          if (tradeId != null) {
            byTradeId.set(tradeId, row);
          }
        }
        row.entry = preferTradeEvent(row.entry, event);
        continue;
      }

      if (action === "EXIT") {
        if (!row) {
          const openRow = tradeId == null ? groups.find((item) => item.entry && !item.exit && !item.standalone) : null;
          row = openRow ?? {
            key: tradeId != null ? `trade-${tradeId}` : `exit-${syntheticId++}`,
            tradeId,
            entry: null,
            exit: null,
            standalone: null,
          };
          if (!openRow) {
            groups.push(row);
          }
          if (tradeId != null) {
            byTradeId.set(tradeId, row);
          }
        }
        row.exit = preferTradeEvent(row.exit, event);
        continue;
      }

      groups.push({
        key: `event-${event.received_at}-${syntheticId++}`,
        tradeId,
        entry: null,
        exit: null,
        standalone: event,
      });
    }

    return groups.reverse();
  }, [activityRows]);
  const activitySummary: TradingViewAlertTemplateStats | null = useMemo(() => {
    if (!activityTemplate) {
      return null;
    }
    return activityMode === "today" ? activityTemplate.stats_today : activityTemplate.stats_all;
  }, [activityMode, activityTemplate]);
  const modeSummaries = useMemo(() => {
    const makeSummary = (label: string): ModeSummary => ({
      label,
      templateCount: 0,
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      grossPnl: 0,
      grossProfit: 0,
      grossLoss: 0,
    });
    const total = makeSummary("All");
    const paper = makeSummary("Paper");
    const live = makeSummary("Live");

    for (const template of templates) {
    const targets = [total, template.trade_mode === 3 ? live : paper];
      for (const summary of targets) {
        summary.templateCount += 1;
        summary.totalTrades += template.stats_all.total_trades;
        summary.winTrades += template.stats_all.win_trades;
        summary.lossTrades += template.stats_all.loss_trades;
        summary.grossPnl += template.stats_all.gross_pnl;
        summary.grossProfit += template.stats_all.gross_profit;
        summary.grossLoss += template.stats_all.gross_loss;
      }
    }

    return [total, paper, live];
  }, [templates]);
  const visibleTemplates = useMemo(
    () => templates.filter((template) => (templateModeFilter === "paper" ? template.trade_mode !== 3 : template.trade_mode === 3)),
    [templateModeFilter, templates],
  );

  const [form, setForm] = useState<FormState>({
    alert_name: "TV-HA-MDN-CALL",
    instrument_key: "NSE_INDEX|Nifty 50",
    side: "call",
    paper_trade: true,
    trade_mode: 1,
    execution_broker: "kotak_neo",
    lots: "1",
    option_offset: "0",
    pine_strategy_id: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [catalogResp, templatesResp] = await Promise.all([fetchInstrumentCatalog(), listTradingViewAlertTemplates()]);
        let diagnosticsResp: TradingViewAlertTemplateDiagnostics | null = null;
        try {
          diagnosticsResp = await fetchTradingViewAlertTemplateDiagnostics();
        } catch (err) {
          diagnosticsResp = {
            store_backend: "unknown",
            database_url: "",
            template_count: null,
            error: err instanceof Error ? err.message : "Diagnostics request failed",
          };
        }
        if (!active) {
          return;
        }
        const instruments = [...catalogResp.indices, ...catalogResp.stocks, ...catalogResp.commodities];
        setCatalog(instruments);
        setTemplates(templatesResp);
        setDiagnostics(diagnosticsResp);
        setError("");
        setForm((prev) => ({
          ...prev,
          instrument_key: prev.instrument_key || initialInstrumentKey(instruments),
        }));
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load TradingView templates");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setLotDrafts((prev) => {
      const next = { ...prev };
      for (const template of templates) {
        next[template.template_id] ??= String(template.lots);
      }
      return next;
    });
  }, [templates]);

  async function refreshTemplates() {
    const items = await listTradingViewAlertTemplates();
    setTemplates(items);
  }

  async function handleCreate() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload: TradingViewAlertTemplateCreateRequest = {
        alert_name: form.alert_name.trim(),
        instrument_key: form.instrument_key,
        side: form.side,
        paper_trade: form.trade_mode !== 3,
        trade_mode: form.trade_mode,
        execution_broker: form.trade_mode === 3 ? (form.execution_broker ?? "kotak_neo") : null,
        lots: Math.max(toInt(form.lots, 1), 1),
        quantity: null,
        option_offset: Math.max(toInt(form.option_offset, 0), 0),
        pine_strategy_id: form.pine_strategy_id.trim() ? form.pine_strategy_id.trim() : null,
        notes: form.notes.trim() || "",
      };

      await createTradingViewAlertTemplate(payload);
      await refreshTemplates();
      setMessage("Template created. Copy the Webhook URL + Message into TradingView, and paste Pine Strategy ID into your Pine input (alertMsg).");
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create template");
      setMessageTone("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text);
      setMessage(`${label} copied.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Copy failed");
      setMessageTone("error");
    }
  }

  async function handleRotateToken(templateId: string) {
    try {
      setRotatingId(templateId);
      setError("");
      setMessage("");
      await regenerateTradingViewAlertTemplateToken(templateId);
      await refreshTemplates();
      setMessage("Token regenerated.");
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to regenerate token");
      setMessageTone("error");
    } finally {
      setRotatingId(null);
    }
  }

  async function handleRotateStrategyId(templateId: string) {
    try {
      setRotatingId(templateId);
      setError("");
      setMessage("");
      await regenerateTradingViewAlertTemplateStrategyId(templateId);
      await refreshTemplates();
      setMessage("Pine Strategy ID regenerated.");
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to regenerate Pine Strategy ID");
      setMessageTone("error");
    } finally {
      setRotatingId(null);
    }
  }

  async function handleSaveLots(template: TradingViewAlertTemplate) {
    const lots = Math.max(toInt(lotDrafts[template.template_id] ?? String(template.lots), template.lots), 1);
    try {
      setSavingLotsId(template.template_id);
      setError("");
      setMessage("");
      const updated = await updateTradingViewAlertTemplate(template.template_id, { lots });
      setTemplates((prev) => prev.map((item) => (item.template_id === updated.template_id ? updated : item)));
      setLotDrafts((prev) => ({ ...prev, [updated.template_id]: String(updated.lots) }));
      setMessage(`Lots updated to ${updated.lots}. Execution quantity is ${updated.quantity}.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update lots");
      setMessageTone("error");
    } finally {
      setSavingLotsId(null);
    }
  }

  function toggleSetup(templateId: string) {
    setExpandedSetupIds((prev) => ({
      ...prev,
      [templateId]: !prev[templateId],
    }));
  }

  async function handleTest(templateId: string) {
    try {
      setTestingId(templateId);
      setError("");
      setMessage("");
      const res: TradingViewAlertTemplateTestResponse = await testTradingViewAlertTemplateWebhook(templateId);
      setMessage(`Test: ${res.status} | ${res.normalized_action} ${res.normalized_side} | ${res.message}`);
      setMessageTone(res.status === "rejected" ? "error" : "success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Test webhook failed");
      setMessageTone("error");
    } finally {
      setTestingId(null);
    }
  }

  async function handleSwitchMode(template: TradingViewAlertTemplate, targetMode: 1 | 3) {
    if (template.trade_mode === targetMode) {
      return;
    }

    const promptText =
      targetMode === 3
        ? `Switch template ${template.template_id} to LIVE mode? (Server must allow real trading, otherwise orders will be rejected.)`
        : `Switch template ${template.template_id} to PAPER mode?`;
    if (!window.confirm(promptText)) {
      return;
    }

    try {
      setSwitchingModeId(template.template_id);
      setError("");
      setMessage("");
      const updated =
        targetMode === 3
          ? await setTradingViewAlertTemplateLive(template.template_id)
          : await setTradingViewAlertTemplatePaper(template.template_id);
      setTemplates((prev) => prev.map((item) => (item.template_id === updated.template_id ? updated : item)));
      setMessage(`Template mode set to ${updated.trade_mode === 3 ? "LIVE" : "PAPER"}.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to switch template mode");
      setMessageTone("error");
    } finally {
      setSwitchingModeId(null);
    }
  }

  function openDeleteDialog(template: TradingViewAlertTemplate) {
    setDeleteDialog({
      templateId: template.template_id,
      alertName: template.alert_name,
      instrumentKey: template.instrument_key,
      side: template.side,
    });
    setDeleteConfirmText("");
  }

  function closeDeleteDialog() {
    if (deletingId) {
      return;
    }
    setDeleteDialog(null);
    setDeleteConfirmText("");
  }

  async function handleDeleteTemplate() {
    if (!deleteDialog || deleteConfirmText.trim().toLowerCase() !== "confirm") {
      return;
    }

    try {
      setDeletingId(deleteDialog.templateId);
      setError("");
      setMessage("");
      await deleteTradingViewAlertTemplate(deleteDialog.templateId);
      setTemplates((prev) => prev.filter((item) => item.template_id !== deleteDialog.templateId));
      setLotDrafts((prev) => {
        const next = { ...prev };
        delete next[deleteDialog.templateId];
        return next;
      });
      setExpandedSetupIds((prev) => {
        const next = { ...prev };
        delete next[deleteDialog.templateId];
        return next;
      });
      if (activityTemplate?.template_id === deleteDialog.templateId) {
        closeActivity();
      }
      setDeleteDialog(null);
      setDeleteConfirmText("");
      setMessage(`Deleted template ${deleteDialog.alertName}.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete template");
      setMessageTone("error");
    } finally {
      setDeletingId(null);
    }
  }

  function closeActivity() {
    setActivityTemplate(null);
    setPayloadExpanded(false);
    setActivityEvents([]);
    setActivityError("");
    setActivityLoading(false);
  }

  async function openActivity(template: TradingViewAlertTemplate, mode: ActivityMode = "today") {
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
    <main className="app-shell">
      <div className="app-frame">
        <section className="app-hero mb-4">
          <div className="hero-header">
            <h1 className="hero-title">TradingView Alerts</h1>
            <p className="hero-subtitle">
              Generate copy-paste webhook configuration (URL + message JSON) and rotate tokens per strategy.
            </p>
          </div>
          <div className="p-3">
            {message ? (
              <div className={`alert ${messageTone === "success" ? "alert-success" : "alert-danger"}`}>{message}</div>
            ) : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}
            {loading ? <div className="muted">Loading templates...</div> : null}
            {diagnostics && !loading ? (
              <div className="muted small mt-2">
                API: <code>{BACKEND_BASE_URL}</code> | store <strong>{diagnostics.store_backend}</strong> | templates{" "}
                <strong>{diagnostics.template_count ?? "-"}</strong>
                {diagnostics.database_url ? (
                  <>
                    {" "}
                    | db <code>{diagnostics.database_url}</code>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="dashboard-panel p-3 mt-3">
              <div className="d-flex flex-wrap align-items-end gap-2">
                <div style={{ minWidth: 220 }}>
                  <label className="form-label" htmlFor="tv-alert-name">
                    Alert Name
                  </label>
                  <input
                    className="form-control form-control-sm"
                    id="tv-alert-name"
                    value={form.alert_name}
                    onChange={(event) => setForm((prev) => ({ ...prev, alert_name: event.target.value }))}
                    placeholder="TV-HA-MDN-CALL"
                  />
                </div>

                <div style={{ minWidth: 260 }}>
                  <label className="form-label" htmlFor="tv-instrument-key">
                    Instrument
                  </label>
                  <select
                    className="form-select form-select-sm"
                    id="tv-instrument-key"
                    value={form.instrument_key}
                    onChange={(event) => setForm((prev) => ({ ...prev, instrument_key: event.target.value }))}
                  >
                    {!catalog.length ? <option value={form.instrument_key}>Loading instruments...</option> : null}
                    {indices.length ? (
                      <optgroup label="Indices">
                        {indices.map((item) => (
                          <option key={item.instrument_key} value={item.instrument_key}>
                            {item.label} ({item.instrument_key})
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {stocks.length ? (
                      <optgroup label="Stocks">
                        {stocks.map((item) => (
                          <option key={item.instrument_key} value={item.instrument_key}>
                            {item.label} ({item.instrument_key})
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {commodities.length ? (
                      <optgroup label="Commodities">
                        {commodities.map((item) => (
                          <option key={item.instrument_key || item.symbol || item.label} value={item.instrument_key} disabled={!item.instrument_key}>
                            {item.label} ({item.instrument_key || "not configured"})
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </div>

                <div style={{ minWidth: 140 }}>
                  <label className="form-label" htmlFor="tv-side">
                    Side
                  </label>
                  <select
                    className="form-select form-select-sm"
                    id="tv-side"
                    value={form.side}
                    onChange={(event) => setForm((prev) => ({ ...prev, side: event.target.value as "call" | "put" }))}
                  >
                    <option value="call">CALL</option>
                    <option value="put">PUT</option>
                  </select>
                </div>

                <div style={{ minWidth: 120 }}>
                  <label className="form-label" htmlFor="tv-lots">
                    Lots
                  </label>
                  <input
                    className="form-control form-control-sm"
                    id="tv-lots"
                    inputMode="numeric"
                    value={form.lots}
                    onChange={(event) => setForm((prev) => ({ ...prev, lots: event.target.value }))}
                    placeholder="1"
                  />
                </div>

                <div style={{ minWidth: 140 }}>
                  <label className="form-label" htmlFor="tv-offset">
                    Option Offset
                  </label>
                  <input
                    className="form-control form-control-sm"
                    id="tv-offset"
                    inputMode="numeric"
                    value={form.option_offset}
                    onChange={(event) => setForm((prev) => ({ ...prev, option_offset: event.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div style={{ minWidth: 220 }}>
                  <label className="form-label" htmlFor="tv-pine-id">
                    Pine Strategy ID (Optional)
                  </label>
                  <input
                    className="form-control form-control-sm"
                    id="tv-pine-id"
                    value={form.pine_strategy_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, pine_strategy_id: event.target.value }))}
                    placeholder="Auto-generated"
                  />
                </div>

                <div style={{ minWidth: 260, flex: 1 }}>
                  <label className="form-label" htmlFor="tv-notes">
                    Notes
                  </label>
                  <input
                    className="form-control form-control-sm"
                    id="tv-notes"
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div className="d-flex align-items-end">
                  <div>
                    <label className="form-label">Execution Mode</label>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm ${form.trade_mode === 1 ? "btn-warning" : "btn-outline-secondary"}`}
                        onClick={() => setForm((prev) => ({ ...prev, trade_mode: 1, paper_trade: true }))}
                        title="Mode 1: Selects option & calculates price using Kite API. No real order placed."
                      >
                        Mode 1 — Paper
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${form.trade_mode === 3 ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setForm((prev) => ({ ...prev, trade_mode: 3, paper_trade: false }))}
                        title="Mode 3: Places real order via Kotak Neo API."
                      >
                        Mode 3 — Live
                      </button>
                    </div>
                    <div className="muted small mt-1">
                      {form.trade_mode === 1 ? "Price check via Kite, no order" : "Real order via Kotak Neo"}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Execution Broker</label>
                    <select
                      className="form-select form-select-sm"
                      disabled={form.trade_mode !== 3}
                      value={form.execution_broker ?? "kotak_neo"}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          execution_broker: e.target.value as "kotak_neo" | "upstox" | "kite",
                        }))
                      }
                    >
                      <option value="kotak_neo">Kotak Neo</option>
                      <option value="upstox">Upstox</option>
                      <option value="kite">Kite (Zerodha)</option>
                    </select>
                    {form.trade_mode !== 3 && (
                      <div className="small muted mt-1">Switch to Live to select broker.</div>
                    )}
                  </div>
                </div>

                <button className="btn btn-warning" disabled={saving} onClick={() => void handleCreate()} type="button">
                  {saving ? "Creating..." : "Create Template"}
                </button>
              </div>
              <div className="muted small mt-2">
                Paste the generated <strong>Webhook URL</strong> and <strong>Message JSON</strong> into TradingView alert
                settings. Paste <strong>Pine Strategy ID</strong> into the Pine input used by{" "}
                <code>strategy.order.alert_message</code> (like <code>alertMsg</code> in our scripts).
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-panel p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h2 className="m-0" style={{ fontSize: "1.08rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Templates
            </h2>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="btn-group" role="group" aria-label="Template mode">
                <button
                  className={`btn btn-sm ${templateModeFilter === "paper" ? "btn-warning" : "btn-outline-light"}`}
                  onClick={() => setTemplateModeFilter("paper")}
                  type="button"
                >
                  Paper
                </button>
                <button
                  className={`btn btn-sm ${templateModeFilter === "live" ? "btn-warning" : "btn-outline-light"}`}
                  onClick={() => setTemplateModeFilter("live")}
                  type="button"
                >
                  Live
                </button>
              </div>
              <div className="muted small">
                {visibleTemplates.length} shown / {templates.length} total
              </div>
            </div>
          </div>

          {templates.length === 0 ? (
            <div className="empty-state">No templates yet. Create one above.</div>
          ) : (
            <>
              <div className="row g-2 mb-3">
                {modeSummaries.map((summary) => (
                  <div className="col-12 col-lg-4" key={summary.label}>
                    <div className="metric-card p-3 h-100">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div className="metric-label">{summary.label} all-time</div>
                        <span className={`badge-soft ${summary.label === "Paper" ? "gold" : summary.label === "Live" ? "blue" : "green"}`}>
                          {summary.templateCount} template{summary.templateCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div
                        className={`metric-value ${summary.grossPnl >= 0 ? "text-success" : "text-danger"}`}
                        style={{ fontSize: "1.12rem", marginTop: "0.45rem" }}
                      >
                        {fmtPnl(summary.grossPnl)}
                      </div>
                      <div className="muted small mt-1">
                        Trades {summary.totalTrades} | Win {summary.winTrades} | Loss {summary.lossTrades}
                      </div>
                      <div className="muted small">
                        Gross profit <span className="text-success">{fmtPnl(summary.grossProfit)}</span> | Gross loss{" "}
                        <span className="text-danger">{fmtPnl(summary.grossLoss)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {visibleTemplates.length === 0 ? (
                <div className="empty-state">No {templateModeFilter} templates yet.</div>
              ) : (
                <div className="row g-3">
                  {visibleTemplates.map((template) => {
                const webhookUrl = `${BACKEND_BASE_URL}${template.generated.webhook_path}`;
                const messageJson = safeJson(template.generated.message);
                const pineId = template.generated.pine_strategy_id;
                const label = instrumentLabel(template.instrument_key, catalog);
                const isBusy =
                  testingId === template.template_id ||
                  rotatingId === template.template_id ||
                  deletingId === template.template_id ||
                  switchingModeId === template.template_id;
                const lotSize = instrumentLotSize(template.instrument_key, catalog);
                const lotDraft = lotDrafts[template.template_id] ?? String(template.lots);
                const parsedLots = toInt(lotDraft, template.lots);
                const lotsChanged = parsedLots !== template.lots && parsedLots > 0;
                const lotsSaving = savingLotsId === template.template_id;
                const setupExpanded = Boolean(expandedSetupIds[template.template_id]);
                const today = template.stats_today;
                const all = template.stats_all;

                return (
                  <div className="col-12 col-xl-6" key={template.template_id}>
                    <div className="metric-card p-3 h-100">
                      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                        <div>
                          <div className="metric-label">
                            {template.side.toUpperCase()} | {label}
                          </div>
                          <div className="metric-value" style={{ fontSize: "1.18rem", marginTop: "0.35rem" }}>
                            {template.alert_name}
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          {template.listening ? <span className="badge-soft green">LISTENING</span> : null}
                          <span className={`badge-soft ${template.trade_mode === 3 ? "blue" : "gold"}`}>
                            {template.trade_mode === 3 ? "MODE 3 — LIVE" : "MODE 1 — PAPER"}
                          </span>
                          <span className="badge-soft blue">
                            {template.lots} lot{template.lots === 1 ? "" : "s"} / {template.quantity} qty
                          </span>
                          <span className="badge-soft blue">+{template.option_offset} offset</span>
                        </div>
                      </div>

                      <div className="muted small mt-2">
                        <div>
                          Template: <span className="data-mono">{template.template_id}</span>
                        </div>
                        <div>
                          <button
                            className="dashboard-trades-link"
                            onClick={() => void openActivity(template, "today")}
                            type="button"
                          >
                            Today: Entries {today.entry_events} | Gross PnL {fmtPnl(today.gross_pnl)} | Executed{" "}
                            {today.executed_events} | Rejected {today.rejected_events} | Ignored {today.ignored_events}
                          </button>
                        </div>
                        <div>
                          History: Trades {all.total_trades} | Win {all.win_trades} | Loss {all.loss_trades} | Gross PnL{" "}
                          {fmtPnl(all.gross_pnl)}
                        </div>
                        <div>Updated: {fmtDateTime(template.updated_at)} | Last used: {fmtDateTime(template.last_used_at)}</div>
                        <div>
                          Last signal: {fmtDateTime(all.last_event_at)} | {all.last_status ?? "-"}
                          {all.last_execution_status ? ` / ${all.last_execution_status}` : ""}
                          {all.last_trade_id != null ? ` / Trade ${all.last_trade_id}` : ""}
                        </div>
                      </div>

                      <div className="row g-2 mt-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label" htmlFor={`tv-template-qty-${template.template_id}`}>
                            Lots
                          </label>
                          <div className="d-flex gap-2">
                            <input
                              className="form-control form-control-sm"
                              id={`tv-template-qty-${template.template_id}`}
                              inputMode="numeric"
                              value={lotDraft}
                              onChange={(event) =>
                                setLotDrafts((prev) => ({
                                  ...prev,
                                  [template.template_id]: event.target.value,
                                }))
                              }
                            />
                            <button
                              className="btn btn-outline-warning"
                              disabled={isBusy || lotsSaving || !lotsChanged}
                              onClick={() => void handleSaveLots(template)}
                              type="button"
                            >
                              {lotsSaving ? "Saving..." : "Save"}
                            </button>
                          </div>
                          <div className="muted small mt-1">
                            {lotSize ? `${parsedLots > 0 ? parsedLots : template.lots} x ${lotSize} = ${(parsedLots > 0 ? parsedLots : template.lots) * lotSize} qty` : `${template.quantity} qty`}
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="dashboard-panel p-2">
                            <button
                              className="dashboard-trades-link d-flex w-100 align-items-center justify-content-between gap-2"
                              onClick={() => toggleSetup(template.template_id)}
                              type="button"
                              aria-expanded={setupExpanded}
                            >
                              <span>TradingView setup details</span>
                              <span className="badge-soft blue">{setupExpanded ? "Hide" : "Show"}</span>
                            </button>

                            {setupExpanded ? (
                              <div className="row g-2 mt-2">
                                <div className="col-12 col-md-6">
                                  <label className="form-label">Webhook URL</label>
                                  <div className="d-flex gap-2">
                                    <input className="form-control form-control-sm" value={webhookUrl} readOnly />
                                    <button
                                      className="btn btn-outline-light"
                                      onClick={() => void handleCopy(webhookUrl, "Webhook URL")}
                                      type="button"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                </div>

                                <div className="col-12 col-md-6">
                                  <label className="form-label">Pine Strategy ID (alertMsg)</label>
                                  <div className="d-flex gap-2">
                                    <input className="form-control form-control-sm data-mono" value={pineId} readOnly />
                                    <button
                                      className="btn btn-outline-light"
                                      onClick={() => void handleCopy(pineId, "Pine Strategy ID")}
                                      type="button"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                </div>

                                <div className="col-12">
                                  <label className="form-label">Message JSON (TradingView Alert)</label>
                                  <div className="d-flex gap-2 align-items-start">
                                    <pre
                                      className="form-control"
                                      style={{ minHeight: 110, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                                    >
                                      {messageJson}
                                    </pre>
                                    <button
                                      className="btn btn-outline-light"
                                      onClick={() => void handleCopy(messageJson, "Message JSON")}
                                      type="button"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="d-flex flex-wrap gap-2">
                            <button
                              className={template.trade_mode === 3 ? "btn btn-outline-light" : "btn btn-outline-primary"}
                              disabled={isBusy}
                              onClick={() => void handleSwitchMode(template, template.trade_mode === 3 ? 1 : 3)}
                              type="button"
                            >
                              {switchingModeId === template.template_id
                                ? "Switching..."
                                : template.trade_mode === 3
                                  ? "Switch to Paper"
                                  : "Switch to Live"}
                            </button>
                            <button
                              className="btn btn-outline-warning"
                              disabled={isBusy}
                              onClick={() => void handleRotateToken(template.template_id)}
                              type="button"
                            >
                              {rotatingId === template.template_id ? "Rotating..." : "Regenerate Token"}
                            </button>
                            <button
                              className="btn btn-outline-warning"
                              disabled={isBusy}
                              onClick={() => void handleRotateStrategyId(template.template_id)}
                              type="button"
                            >
                              {rotatingId === template.template_id ? "Rotating..." : "Regenerate Pine ID"}
                            </button>
                            <button
                              className="btn btn-outline-light"
                              disabled={isBusy}
                              onClick={() => void handleTest(template.template_id)}
                              type="button"
                            >
                              {testingId === template.template_id ? "Testing..." : "Test Webhook"}
                            </button>
                            <button
                              className="btn btn-outline-light"
                              disabled={isBusy}
                              onClick={() => void openActivity(template, "today")}
                              type="button"
                            >
                              Today
                            </button>
                            <button
                              className="btn btn-outline-light"
                              disabled={isBusy}
                              onClick={() => void openActivity(template, "history")}
                              type="button"
                            >
                              History
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              disabled={isBusy}
                              onClick={() => openDeleteDialog(template)}
                              type="button"
                            >
                              {deletingId === template.template_id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {activityTemplate ? (
        <div className="dashboard-trades-modal-backdrop" onClick={closeActivity} role="presentation">
          <div
            className="dashboard-trades-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="TradingView alert activity"
          >
            <div className="dashboard-trades-modal-header">
              <div>
                <div className="dashboard-trades-modal-title">
                  {activityMode === "today" ? "Today's TradingView Alerts" : "Historical TradingView Alerts"}
                </div>
                <div className="dashboard-trades-modal-subtitle">
                  {activityTemplate.alert_name} | {instrumentLabel(activityTemplate.instrument_key, catalog)} |{" "}
                  {activityTemplate.side.toUpperCase()}
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
            ) : activityEvents.length ? (
              <>
                {activitySummary ? (
                  <div className="row g-2 mb-3">
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Gross PnL</div>
                        <div
                          className={`metric-value ${activitySummary.gross_pnl >= 0 ? "text-success" : "text-danger"}`}
                          style={{ fontSize: "1.08rem" }}
                        >
                          {fmtPnl(activitySummary.gross_pnl)}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Trades</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          {activitySummary.total_trades}
                        </div>
                        <div className="muted small">Win {activitySummary.win_trades} | Loss {activitySummary.loss_trades}</div>
                      </div>
                    </div>
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Gross Profit / Loss</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          <span className="text-success">{fmtPnl(activitySummary.gross_profit)}</span>
                          <span className="muted"> / </span>
                          <span className="text-danger">{fmtPnl(activitySummary.gross_loss)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">High / Low Trade</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          <span className="text-success">{fmtPnl(activitySummary.highest_profit)}</span>
                          <span className="muted"> / </span>
                          <span className="text-danger">{fmtPnl(activitySummary.lowest_trade)}</span>
                        </div>
                        <div className="muted small">Win rate {activitySummary.win_rate.toFixed(2)}%</div>
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
                      {payloadExpanded ? (
                        <button
                          className="btn btn-outline-light btn-sm"
                          onClick={() => void handleCopy(safeJson(activityEvents[0]?.payload), "Webhook payload")}
                          type="button"
                        >
                          Copy Payload
                        </button>
                      ) : null}
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

                <div className="table-responsive">
                  <table className="table table-dark-shell align-middle dashboard-trades-table">
                    <thead>
                      <tr>
                        <th>Trade</th>
                        <th>Entry Time</th>
                        <th>Exit Time</th>
                        <th>Status</th>
                        <th>Exec</th>
                        <th>Entry LTP</th>
                        <th>Exit LTP</th>
                        <th>Trade PnL</th>
                        <th>Running PnL</th>
                        <th>India VIX</th>
                        <th>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityTradeRows.map((row) => {
                        const primary = row.exit ?? row.entry ?? row.standalone;
                        const pnl = row.exit?.pnl ?? row.standalone?.pnl ?? null;
                        const runningPnl = row.exit?.totalPnl ?? row.entry?.totalPnl ?? row.standalone?.totalPnl ?? null;
                        const indiaVix = row.exit?.indiaVix ?? row.entry?.indiaVix ?? row.standalone?.indiaVix ?? null;

                        return (
                          <tr key={row.key}>
                            <td className="mono">{row.tradeId != null ? String(row.tradeId) : "-"}</td>
                            <td className="small">
                              {row.entry ? (
                                <>
                                  <div>{fmtDateTime(row.entry.received_at)}</div>
                                  <div className="mono">{row.entry.alert_type}</div>
                                </>
                              ) : row.standalone?.normalized_action === "ENTRY" ? (
                                fmtDateTime(row.standalone.received_at)
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="small">
                              {row.exit ? (
                                <>
                                  <div>{fmtDateTime(row.exit.received_at)}</div>
                                  <div className="mono">{row.exit.alert_type}</div>
                                </>
                              ) : row.standalone?.normalized_action === "EXIT" ? (
                                fmtDateTime(row.standalone.received_at)
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {row.entry ? (
                                  <span className={`badge-soft ${row.entry.status === "accepted" ? "green" : row.entry.status === "ignored" ? "gold" : "red"}`}>
                                    Entry {row.entry.status}
                                  </span>
                                ) : null}
                                {row.exit ? (
                                  <span className={`badge-soft ${row.exit.status === "accepted" ? "green" : row.exit.status === "ignored" ? "gold" : "red"}`}>
                                    Exit {row.exit.status}
                                  </span>
                                ) : null}
                                {row.standalone ? (
                                  <span className={`badge-soft ${row.standalone.status === "accepted" ? "green" : row.standalone.status === "ignored" ? "gold" : "red"}`}>
                                    {row.standalone.normalized_action} {row.standalone.status}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="small">{primary?.execution_status ?? "-"}</td>
                            <td className="mono">{fmtPrice(row.entry?.entryLtp ?? row.standalone?.entryLtp)}</td>
                            <td className="mono">{fmtPrice(row.exit?.exitLtp ?? row.standalone?.exitLtp)}</td>
                            <td className={`mono ${pnl != null ? (pnl >= 0 ? "text-success" : "text-danger") : ""}`}>
                              {fmtPnl(pnl)}
                            </td>
                            <td className={`mono ${runningPnl != null ? (runningPnl >= 0 ? "text-success" : "text-danger") : ""}`}>
                              {fmtPnl(runningPnl)}
                            </td>
                            <td className="mono">{indiaVix != null ? indiaVix.toFixed(2) : "-"}</td>
                            <td className="small">
                              <div>{cleanActivityDetail(row.entry?.detail || row.standalone?.detail) || "-"}</div>
                              {cleanActivityDetail(row.exit?.detail) ? <div>{cleanActivityDetail(row.exit?.detail)}</div> : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                {activitySummary ? (
                  <div className="row g-2 mb-3">
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Gross PnL</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          {fmtPnl(activitySummary.gross_pnl)}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Trades</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          {activitySummary.total_trades}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">Win / Loss</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          {activitySummary.win_trades} / {activitySummary.loss_trades}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-lg-3">
                      <div className="metric-card p-3 h-100">
                        <div className="metric-label">High / Low Trade</div>
                        <div className="metric-value" style={{ fontSize: "1.08rem" }}>
                          {fmtPnl(activitySummary.highest_profit)} / {fmtPnl(activitySummary.lowest_trade)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="empty-state">
                  {activityMode === "today" ? "No alerts received today for this template." : "No alerts received yet for this template."}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {deleteDialog ? (
        <div className="dashboard-trades-modal-backdrop" onClick={closeDeleteDialog} role="presentation">
          <div
            className="dashboard-trades-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Delete TradingView alert template"
          >
            <div className="dashboard-trades-modal-header">
              <div>
                <div className="dashboard-trades-modal-title">Delete Template</div>
                <div className="dashboard-trades-modal-subtitle">
                  {deleteDialog.alertName} | {instrumentLabel(deleteDialog.instrumentKey, catalog)} |{" "}
                  {deleteDialog.side.toUpperCase()}
                </div>
              </div>
              <button className="dashboard-trades-close" onClick={closeDeleteDialog} type="button">
                Close
              </button>
            </div>

            <div className="alert alert-danger mb-3">
              This will permanently delete the template and its stored TradingView alert history.
            </div>

            <label className="form-label" htmlFor="tv-delete-confirm">
              Type <code>confirm</code> to delete
            </label>
            <input
              autoFocus
              className="form-control"
              id="tv-delete-confirm"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder="confirm"
            />

            <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
              <button className="btn btn-outline-light" disabled={Boolean(deletingId)} onClick={closeDeleteDialog} type="button">
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={deleteConfirmText.trim().toLowerCase() !== "confirm" || Boolean(deletingId)}
                onClick={() => void handleDeleteTemplate()}
                type="button"
              >
                {deletingId ? "Deleting..." : "Delete Template"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
