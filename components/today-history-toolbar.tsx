"use client";

import type { HistoryPreset, HistoryView } from "@/lib/history-window";

type Props = {
  view: HistoryView;
  onViewChange: (next: HistoryView) => void;
  preset: HistoryPreset;
  onPresetChange: (next: HistoryPreset) => void;
  fromDate: string;
  onFromDateChange: (next: string) => void;
  toDate: string;
  onToDateChange: (next: string) => void;
  todayCount?: number;
  historyCount?: number;
  historyTotalCount?: number;
  todayLabel?: string;
  historyLabel?: string;
};

export function TodayHistoryToolbar({
  view,
  onViewChange,
  preset,
  onPresetChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  todayCount,
  historyCount,
  historyTotalCount,
  todayLabel = "Today",
  historyLabel = "History",
}: Props) {
  return (
    <div className="execution-jobs-toolbar mb-3">
      <div className="execution-jobs-view-switcher">
        <button
          className={`execution-jobs-view-tab ${view === "today" ? "active" : ""}`}
          onClick={() => onViewChange("today")}
          type="button"
        >
          <span>{todayLabel}</span>
          {typeof todayCount === "number" ? <strong>{todayCount}</strong> : null}
        </button>
        <button
          className={`execution-jobs-view-tab ${view === "history" ? "active" : ""}`}
          onClick={() => onViewChange("history")}
          type="button"
        >
          <span>{historyLabel}</span>
          {typeof historyCount === "number" ? <strong>{historyCount}</strong> : null}
        </button>
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
        {view === "history" && typeof historyTotalCount === "number" ? (
          <span className="badge-soft blue">
            Showing {typeof historyCount === "number" ? historyCount : "-"} of {historyTotalCount}
          </span>
        ) : null}

        {view === "history" ? (
          <div className="execution-jobs-filter-shell">
            <div className="execution-jobs-filter-pills">
              {[
                { value: "yesterday", label: "Yesterday" },
                { value: "last7", label: "Last 7 Days" },
                { value: "last30", label: "Last 30 Days" },
                { value: "custom", label: "Custom Range" },
              ].map((option) => (
                <button
                  key={option.value}
                  className={`execution-jobs-filter-pill ${preset === option.value ? "active" : ""}`}
                  onClick={() => onPresetChange(option.value as HistoryPreset)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {preset === "custom" ? (
              <div className="execution-jobs-filter-grid">
                <label className="execution-jobs-filter-field">
                  <span>From</span>
                  <input
                    className="execution-jobs-filter-input"
                    max={toDate || undefined}
                    onChange={(e) => onFromDateChange(e.target.value)}
                    type="date"
                    value={fromDate}
                  />
                </label>
                <label className="execution-jobs-filter-field">
                  <span>To</span>
                  <input
                    className="execution-jobs-filter-input"
                    min={fromDate || undefined}
                    onChange={(e) => onToDateChange(e.target.value)}
                    type="date"
                    value={toDate}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

