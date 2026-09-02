"use client";

import { HarmonicPatternMatch, RatioMeasurement } from "@/lib/harmonic-engine";

interface HarmonicPatternInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: HarmonicPatternMatch | null;
  symbolLabel?: string;
  timeframe?: string;
}

export function HarmonicPatternInspectorDrawer({
  isOpen,
  onClose,
  pattern,
  symbolLabel = "INSTRUMENT",
  timeframe = "15m",
}: HarmonicPatternInspectorDrawerProps) {
  if (!isOpen || !pattern) return null;

  const isBullish = pattern.orientation === "Bullish";
  const ratiosList = Object.entries(pattern.ratios).filter(
    (item): item is [string, RatioMeasurement] => Boolean(item[1])
  );

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.65)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content shadow-lg border-0 bg-surface">
          {/* Header */}
          <div className="modal-header border-bottom pb-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className={`rounded-circle p-2 d-flex align-items-center justify-content-center ${
                  isBullish
                    ? "bg-success bg-opacity-10 text-success"
                    : "bg-danger bg-opacity-10 text-danger"
                }`}
                style={{ width: "42px", height: "42px" }}
              >
                <i className={`bi ${isBullish ? "bi-graph-up-arrow" : "bi-graph-down-arrow"} fs-5`} />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="modal-title fw-bold mb-0">
                    {pattern.patternType} ({pattern.orientation})
                  </h5>
                  <span
                    className={`badge ${
                      pattern.confidenceScore >= 80
                        ? "bg-success"
                        : pattern.confidenceScore >= 65
                        ? "bg-primary"
                        : "bg-warning text-dark"
                    }`}
                  >
                    {pattern.confidenceScore}% Confidence
                  </span>
                  <span className="badge bg-secondary font-monospace">
                    {symbolLabel} · {timeframe}
                  </span>
                </div>
                <small className="text-secondary">
                  Client-side verified canonical Fibonacci ratios & textbook rulebook
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
            {/* Quick Metrics Bar */}
            <div className="row g-2 mb-4">
              <div className="col-6 col-md-3">
                <div className="p-3 rounded border bg-body-tertiary">
                  <span className="text-secondary small d-block">Action</span>
                  <span
                    className={`fw-bold fs-6 ${
                      pattern.action === "BUY" ? "text-success" : "text-danger"
                    }`}
                  >
                    {pattern.action} @ PRZ
                  </span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 rounded border bg-body-tertiary">
                  <span className="text-secondary small d-block">PRZ Zone</span>
                  <span className="fw-semibold small font-monospace">
                    ₹{pattern.entryZone.min.toFixed(2)} - ₹{pattern.entryZone.max.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 rounded border bg-body-tertiary">
                  <span className="text-secondary small d-block">Stop Loss</span>
                  <span className="fw-bold text-danger small font-monospace">
                    ₹{pattern.stopLoss.price.toFixed(2)} ({pattern.stopLoss.percent}%)
                  </span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 rounded border bg-body-tertiary">
                  <span className="text-secondary small d-block">Status</span>
                  <span
                    className={`badge ${
                      pattern.status === "Triggered"
                        ? "bg-success"
                        : pattern.status === "Invalidated"
                        ? "bg-danger"
                        : "bg-info text-dark"
                    }`}
                  >
                    {pattern.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Fibonacci Leg-by-Leg Ratios Breakdown */}
            <div className="mb-4">
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-rulers text-primary" />
                Fibonacci Leg Measurements
              </h6>
              <div className="table-responsive">
                <table className="table table-sm table-bordered align-middle mb-0 font-monospace small">
                  <thead className="table-light">
                    <tr>
                      <th>Leg Ratio</th>
                      <th>Actual</th>
                      <th>Ideal</th>
                      <th>Tolerance Band</th>
                      <th>Formula</th>
                      <th className="text-center">Rule Fit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratiosList.map(([key, r]) => (
                      <tr key={key}>
                        <td className="fw-bold font-sans-serif">{r.name}</td>
                        <td className="fw-bold text-primary">{r.actual.toFixed(3)}</td>
                        <td className="text-secondary">
                          {r.ideal !== undefined ? r.ideal.toFixed(3) : "—"}
                        </td>
                        <td>
                          [{r.expectedMin.toFixed(3)} – {r.expectedMax.toFixed(3)}]
                        </td>
                        <td className="text-secondary small">{r.formula}</td>
                        <td className="text-center">
                          {r.isValid ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              <i className="bi bi-check-circle-fill me-1" /> VALID
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                              <i className="bi bi-exclamation-triangle-fill me-1" /> STRETCHED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Take Profit Targets & Risk Management */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="p-3 rounded border bg-body-tertiary h-100">
                  <h6 className="fw-bold mb-2 text-success d-flex align-items-center gap-2">
                    <i className="bi bi-bullseye" /> Profit Taking Rules
                  </h6>
                  <div className="d-flex flex-column gap-2 small">
                    {pattern.targets.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded bg-surface border d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <div className="fw-bold">{t.name}</div>
                          <div className="text-secondary" style={{ fontSize: "0.78rem" }}>
                            {t.ruleDescription}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold font-monospace text-success">
                            ₹{t.price.toFixed(2)}
                          </div>
                          <span className="badge bg-success-subtle text-success small font-monospace">
                            +{t.percentFromEntry}% (R:R {t.riskRewardRatio})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="p-3 rounded border bg-body-tertiary h-100">
                  <h6 className="fw-bold mb-2 text-danger d-flex align-items-center gap-2">
                    <i className="bi bi-shield-slash" /> Stop Loss & Trailing Plan
                  </h6>
                  <div className="d-flex flex-column gap-2 small">
                    <div className="p-2 rounded bg-surface border">
                      <span className="fw-semibold text-danger d-block">Stop Loss Protection</span>
                      <span className="text-secondary">{pattern.stopLoss.reason}</span>
                    </div>
                    <div className="p-2 rounded bg-surface border">
                      <span className="fw-semibold text-primary d-block">Trailing SL Rule</span>
                      <span className="text-secondary">{pattern.trailingRule}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Textbook Strategy Summary */}
            <div className="p-3 rounded border bg-primary bg-opacity-10 border-primary-subtle small">
              <span className="fw-bold text-primary d-block mb-1">
                <i className="bi bi-book-half me-1" /> Strategy Chapter Reference:
              </span>
              <span className="text-secondary">{pattern.pdfRuleSummary}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-top py-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Close Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

