"use client";

import { useEffect, useMemo, useState } from "react";

import {
  deleteSymbolMapping,
  fetchSymbolMap,
  SymbolMappingRow,
  SymbolMappingUpsert,
  upsertSymbolMapping,
} from "@/lib/api";

type FormState = {
  canonical_key: string;
  display_name: string;
  symbol: string;
  asset_class: string;
  aliases: string;
  brokerKeys: Record<string, string>;
  dhan_underlying_scrip: string;
  dhan_underlying_seg: string;
  isNew: boolean;
};

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function rowToForm(row: SymbolMappingRow, editable: string[]): FormState {
  const brokerKeys: Record<string, string> = {};
  for (const broker of editable) {
    brokerKeys[broker] = (row.broker_keys[broker] ?? []).join(", ");
  }
  return {
    canonical_key: row.canonical_key,
    display_name: row.display_name,
    symbol: row.symbol,
    asset_class: row.asset_class,
    aliases: row.aliases.join(", "),
    brokerKeys,
    dhan_underlying_scrip:
      row.dhan_underlying_scrip == null ? "" : String(row.dhan_underlying_scrip),
    dhan_underlying_seg: row.dhan_underlying_seg ?? "",
    isNew: false,
  };
}

function blankForm(editable: string[]): FormState {
  const brokerKeys: Record<string, string> = {};
  for (const broker of editable) {
    brokerKeys[broker] = "";
  }
  return {
    canonical_key: "",
    display_name: "",
    symbol: "",
    asset_class: "index",
    aliases: "",
    brokerKeys,
    dhan_underlying_scrip: "",
    dhan_underlying_seg: "",
    isNew: true,
  };
}

function brokerLabel(broker: string) {
  return broker.charAt(0).toUpperCase() + broker.slice(1);
}

export function SymbolMapShell() {
  const [rows, setRows] = useState<SymbolMappingRow[]>([]);
  const [editable, setEditable] = useState<string[]>(["upstox", "kite", "dhan"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [brokerFilter, setBrokerFilter] = useState<string>("all");
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSymbolMap();
      setRows(data.mappings);
      setEditable(data.editable_brokers);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (brokerFilter !== "all" && !(brokerFilter in row.coverage)) {
        return true;
      }
      if (incompleteOnly) {
        const missing =
          editable.some((broker) => !row.coverage[broker]) ||
          !row.dhan_underlying_configured;
        if (!missing) {
          return false;
        }
      }
      return true;
    });
  }, [rows, incompleteOnly, brokerFilter, editable]);

  const shownBrokers = brokerFilter === "all" ? editable : [brokerFilter];

  async function handleSave() {
    if (!form) {
      return;
    }
    if (!form.canonical_key.trim()) {
      setError("Standard / canonical key is required (e.g. NSE_INDEX|Nifty 50).");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const brokerKeys: Record<string, string[]> = {};
    for (const broker of editable) {
      const keys = splitCsv(form.brokerKeys[broker] ?? "");
      if (keys.length) {
        brokerKeys[broker] = keys;
      }
    }
    const payload: SymbolMappingUpsert = {
      canonical_key: form.canonical_key.trim(),
      display_name: form.display_name.trim() || form.canonical_key.trim(),
      symbol: form.symbol.trim(),
      asset_class: form.asset_class.trim() || "index",
      aliases: splitCsv(form.aliases),
      broker_keys: brokerKeys,
      dhan_underlying_scrip: form.dhan_underlying_scrip.trim()
        ? Number(form.dhan_underlying_scrip.trim())
        : null,
      dhan_underlying_seg: form.dhan_underlying_seg.trim() || null,
    };
    try {
      await upsertSymbolMapping(payload);
      setMessage(`Saved ${payload.canonical_key}.`);
      setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: SymbolMappingRow) {
    const verb = row.source === "override" ? "reset to its built-in default" : "delete";
    if (!window.confirm(`Are you sure you want to ${verb} "${row.canonical_key}"?`)) {
      return;
    }
    setError("");
    setMessage("");
    try {
      const result = await deleteSymbolMapping(row.canonical_key);
      setMessage(
        result.status === "reverted_to_default"
          ? `${row.canonical_key} reverted to its built-in default.`
          : `${row.canonical_key} deleted.`,
      );
      if (form && form.canonical_key === row.canonical_key) {
        setForm(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h1 className="h4 mb-1">Symbol Map</h1>
          <div className="text-muted small">
            Standard name to broker-specific symbols. Built-in defaults always
            exist as a fallback; your edits are layered on top and applied live.
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={load}
            type="button"
            disabled={loading}
          >
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setForm(blankForm(editable))}
            type="button"
          >
            + Add Mapping
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {message && <div className="alert alert-success py-2">{message}</div>}

      <div className="dashboard-panel p-3 mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">Broker view</label>
            <select
              className="form-select"
              value={brokerFilter}
              onChange={(e) => setBrokerFilter(e.target.value)}
            >
              <option value="all">All brokers</option>
              {editable.map((broker) => (
                <option key={broker} value={broker}>
                  {brokerLabel(broker)} only
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <div className="form-check mt-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="incompleteOnly"
                checked={incompleteOnly}
                onChange={(e) => setIncompleteOnly(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="incompleteOnly">
                Show only mappings with missing broker coverage
              </label>
            </div>
          </div>
        </div>
      </div>

      {form && (
        <div className="dashboard-panel p-3 mb-3">
          <h2 className="h6 mb-3">
            {form.isNew ? "Add mapping" : `Edit ${form.canonical_key}`}
          </h2>
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <label className="form-label">Standard / canonical key</label>
              <input
                className="form-control"
                value={form.canonical_key}
                disabled={!form.isNew}
                placeholder="NSE_INDEX|Nifty 50"
                onChange={(e) =>
                  setForm({ ...form, canonical_key: e.target.value })
                }
              />
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label">Display name</label>
              <input
                className="form-control"
                value={form.display_name}
                onChange={(e) =>
                  setForm({ ...form, display_name: e.target.value })
                }
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Symbol</label>
              <input
                className="form-control"
                value={form.symbol}
                placeholder="NIFTY"
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label">Asset class</label>
              <input
                className="form-control"
                value={form.asset_class}
                placeholder="index"
                onChange={(e) =>
                  setForm({ ...form, asset_class: e.target.value })
                }
              />
            </div>
            <div className="col-12">
              <label className="form-label">Aliases (comma-separated)</label>
              <input
                className="form-control"
                value={form.aliases}
                placeholder="NSE:NIFTY, NIFTY, NIFTY 50"
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              />
            </div>
            {editable.map((broker) => (
              <div className="col-12 col-md-4" key={broker}>
                <label className="form-label">
                  {brokerLabel(broker)} key(s) (comma-separated)
                </label>
                <input
                  className="form-control"
                  value={form.brokerKeys[broker] ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      brokerKeys: { ...form.brokerKeys, [broker]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
            <div className="col-6 col-md-3">
              <label className="form-label">Dhan underlying scrip</label>
              <input
                className="form-control"
                value={form.dhan_underlying_scrip}
                placeholder="13"
                onChange={(e) =>
                  setForm({ ...form, dhan_underlying_scrip: e.target.value })
                }
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Dhan underlying segment</label>
              <input
                className="form-control"
                value={form.dhan_underlying_seg}
                placeholder="IDX_I"
                onChange={(e) =>
                  setForm({ ...form, dhan_underlying_seg: e.target.value })
                }
              />
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              type="button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => setForm(null)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="dashboard-panel p-0">
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Standard Name</th>
                {shownBrokers.map((broker) => (
                  <th key={broker}>{brokerLabel(broker)}</th>
                ))}
                {shownBrokers.includes("dhan") && <th>Dhan Scrip / Seg</th>}
                <th>Source</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={shownBrokers.length + 4}>Loading...</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={shownBrokers.length + 4} className="text-muted">
                    No mappings match the current filter.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((row) => (
                  <tr key={row.canonical_key}>
                    <td>
                      <div className="fw-semibold">{row.display_name}</div>
                      <div className="text-muted small font-monospace">
                        {row.canonical_key}
                      </div>
                    </td>
                    {shownBrokers.map((broker) => {
                      const keys = row.broker_keys[broker] ?? [];
                      return (
                        <td key={broker}>
                          {keys.length ? (
                            <span className="font-monospace small">
                              {keys.join(", ")}
                            </span>
                          ) : (
                            <span className="badge bg-danger">missing</span>
                          )}
                        </td>
                      );
                    })}
                    {shownBrokers.includes("dhan") && (
                      <td>
                        {row.dhan_underlying_configured ? (
                          <span className="font-monospace small">
                            {row.dhan_underlying_scrip} / {row.dhan_underlying_seg}
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">none</span>
                        )}
                      </td>
                    )}
                    <td>
                      <span
                        className={`badge ${
                          row.source === "default"
                            ? "bg-secondary"
                            : row.source === "override"
                              ? "bg-info text-dark"
                              : "bg-success"
                        }`}
                      >
                        {row.source}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        type="button"
                        onClick={() => setForm(rowToForm(row, editable))}
                      >
                        Edit
                      </button>
                      {row.source === "default" ? (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          type="button"
                          disabled
                          title="Built-in default; edit it instead. It always exists as a fallback."
                        >
                          Built-in
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          type="button"
                          onClick={() => handleDelete(row)}
                        >
                          {row.source === "override" ? "Reset" : "Delete"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
