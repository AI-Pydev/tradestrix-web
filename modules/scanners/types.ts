export type OpportunityScannerRequest = {
  broker_id: "upstox" | "kite";
  include_indices: boolean;
  include_stocks: boolean;
  max_indices: number;
  max_stocks: number;
  scan_basis: "daily";
  daily_history_days: number;
  trade_mode: "buy-only" | "mixed";
  use_greek_filters: boolean;
  ema_bias_mode: "off" | "score" | "strict";
  min_quality: "A" | "B" | "C";
  min_option_ltp?: number | null;
  max_option_ltp?: number | null;
  workers: number;
  include_qualification_context?: boolean;
  qualification_min_win_rate?: number;
  qualification_min_net_pnl?: number;
  qualification_min_trades?: number;
  include_paper_history_context?: boolean;
  paper_history_min_closed_trades?: number;
};

export type OpportunityScannerSummary = {
  available_indices: number;
  available_stocks: number;
  selected_indices: number;
  selected_stocks: number;
  scanned_instruments: number;
  actionable_count: number;
  watchlist_count: number;
  rejected_count: number;
  error_count: number;
  actionable_indices: number;
  actionable_stocks: number;
  duration_seconds: number;
  broker_id: "upstox" | "kite";
  best_setup?: string | null;
  scan_basis: "daily";
  snapshot_date: string;
  storage_backend: "sqlite";
  storage_target: string;
  snapshot_saved: boolean;
  storage_warning?: string | null;
  paper_ready_count: number;
  paper_ready_actionable_count: number;
  qualification_context_enabled: boolean;
  paper_history_context_enabled: boolean;
  paper_history_caution_count: number;
};

export type OpportunityScannerRow = {
  label: string;
  instrument_key: string;
  kind: "index" | "stock";
  verified: boolean;
  scan_basis: "daily";
  snapshot_date: string;
  daily_trend: "bullish" | "bearish" | "neutral" | "unknown";
  daily_close?: number | null;
  daily_change_pct?: number | null;
  daily_ema10?: number | null;
  daily_ema20?: number | null;
  ema_bias: "bullish" | "bearish" | "mixed" | "unknown";
  status: "ACTIONABLE" | "WATCHLIST" | "REJECTED" | "ERROR";
  selection_score: number;
  market_bias: string;
  pcr?: number | null;
  iv_environment: string;
  resolved_expiry?: string | null;
  trade_label?: string | null;
  option_side?: string | null;
  strike?: number | null;
  lot_size?: number | null;
  option_ltp?: number | null;
  entry_value?: number | null;
  target_pnl?: number | null;
  stop_pnl?: number | null;
  risk_cap_amount?: number | null;
  rr_ratio?: number | null;
  quality?: string | null;
  zone_score?: number | null;
  oi_velocity?: number | null;
  option_symbol?: string | null;
  rationale?: string | null;
  status_reason: string;
  readiness_bucket: string;
  readiness_strategy_id?: string | null;
  readiness_strategy_label?: string | null;
  readiness_score?: number | null;
  readiness_win_rate?: number | null;
  readiness_net_pnl?: number | null;
  readiness_total_trades?: number | null;
  readiness_reason?: string | null;
  paper_history_bucket: string;
  paper_history_closed_trades: number;
  paper_history_win_rate?: number | null;
  paper_history_realized_pnl?: number | null;
  paper_history_reason?: string | null;
};

export type OpportunityScannerResponse = {
  summary: OpportunityScannerSummary;
  rows: OpportunityScannerRow[];
};

export type SupportResistanceScannerRequest = {
  broker_id: "upstox" | "kite";
  include_indices: boolean;
  include_stocks: boolean;
  max_indices: number;
  max_stocks: number;
  verified_only: boolean;
  intraday_history_days: number;
  daily_history_days: number;
  require_close_above_ema10: boolean;
  workers: number;
};

export type SupportResistanceScannerSummary = {
  available_indices: number;
  available_stocks: number;
  selected_indices: number;
  selected_stocks: number;
  scanned_instruments: number;
  near_support_count: number;
  near_resistance_count: number;
  between_levels_count: number;
  error_count: number;
  tradable_count: number;
  strong_count: number;
  duration_seconds: number;
  broker_id: "upstox" | "kite";
  scan_basis: "intraday_3m";
  primary_timeframe: "3m";
  validation_timeframes: string[];
  snapshot_time: string;
};

export type SupportResistanceScannerRow = {
  label: string;
  instrument_key: string;
  kind: "index" | "stock";
  verified: boolean;
  scan_basis: "intraday_3m";
  snapshot_time: string;
  status: "NEAR_SUPPORT" | "NEAR_RESISTANCE" | "BETWEEN_LEVELS" | "ERROR";
  closest_zone: "support" | "resistance" | "balanced" | "error";
  trade_readiness: "weak" | "tradable" | "strong" | "n/a";
  selection_score: number;
  current_price?: number | null;
  atr_3m?: number | null;
  vwap_3m?: number | null;
  ema9_3m?: number | null;
  ema10_3m?: number | null;
  ema20_3m?: number | null;
  ema50_3m?: number | null;
  nearest_support?: number | null;
  support_strength_score?: number | null;
  support_touch_count?: number | null;
  support_distance_pct?: number | null;
  support_distance_atr?: number | null;
  support_near: boolean;
  support_sources: string[];
  nearest_resistance?: number | null;
  resistance_strength_score?: number | null;
  resistance_touch_count?: number | null;
  resistance_distance_pct?: number | null;
  resistance_distance_atr?: number | null;
  resistance_near: boolean;
  resistance_sources: string[];
  previous_session_low?: number | null;
  previous_session_high?: number | null;
  daily_alignment: boolean;
  weekly_alignment: boolean;
  status_reason: string;
};

export type SupportResistanceScannerResponse = {
  summary: SupportResistanceScannerSummary;
  rows: SupportResistanceScannerRow[];
};

export type SupportResistanceTradeActionRequest = {
  broker_id: "upstox" | "kite";
  row: SupportResistanceScannerRow;
  action: "auto" | "buy_ce" | "buy_pe";
  lots: number;
  min_quality?: "A" | "B" | "C";
  max_entry_ltp?: number;
  max_total_entry_amount?: number | null;
  risk_model?: "dynamic" | "fixed" | "risk_amount";
  risk_amount?: number | null;
  sl_premium_pct?: number;
  target_premium_pct?: number;
};

export type SupportResistanceTradeCloseRequest = {
  exit_price: number;
  reason: string;
};

export type SupportResistanceTradeRecord = {
  trade_id: string;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  closed_at?: string | null;
  broker_id: "upstox" | "kite";
  label: string;
  instrument_key: string;
  kind: "index" | "stock";
  trade_label: "BUY CE" | "BUY PE";
  option_side: "CE" | "PE";
  option_symbol: string;
  resolved_expiry: string;
  strike: number;
  lot_size: number;
  lots: number;
  quantity: number;
  entry_price: number;
  exit_price?: number | null;
  pnl?: number | null;
  selection_score: number;
  trade_readiness: "weak" | "tradable" | "strong" | "n/a";
  rr_ratio?: number | null;
  quality?: string | null;
  market_bias: string;
  rationale: string;
  close_reason?: string | null;
  scanner_row: SupportResistanceScannerRow;
  candidate: Record<string, string | number | boolean | null>;
};

export type SupportResistanceTradeLabSummary = {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  realized_pnl: number;
  average_pnl: number;
  best_trade: number;
  worst_trade: number;
  tracked_instruments: number;
};

export type SupportResistanceAutoEntrySettings = {
  enabled: boolean;
  broker_id: "upstox" | "kite";
  include_indices: boolean;
  include_stocks: boolean;
  max_indices: number;
  max_stocks: number;
  verified_only: boolean;
  intraday_history_days: number;
  daily_history_days: number;
  require_close_above_ema10: boolean;
  workers: number;
  action_mode: "auto" | "buy_ce" | "buy_pe";
  min_readiness: "tradable" | "strong";
  lots: number;
  min_quality: "A" | "B" | "C";
  max_entry_ltp: number;
  max_total_entry_amount?: number | null;
  risk_model: "dynamic" | "fixed" | "risk_amount";
  risk_amount?: number | null;
  sl_premium_pct: number;
  target_premium_pct: number;
  cooldown_minutes: number;
};

export type SupportResistanceAutoEntryStatus = {
  last_run_at?: string | null;
  last_run_state: "idle" | "ok" | "error";
  last_run_message: string;
  last_scan_duration_seconds?: number | null;
  last_rows_scanned: number;
  last_candidates_considered: number;
  last_entries_opened: number;
};

export type SupportResistanceTradeLabDashboard = {
  summary: SupportResistanceTradeLabSummary;
  trades: SupportResistanceTradeRecord[];
  auto_entry_settings: SupportResistanceAutoEntrySettings;
  auto_entry_status: SupportResistanceAutoEntryStatus;
};

export type ScannerPaperTrade = {
  trade_id: string;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  closed_at?: string | null;
  direction: "LONG" | "SHORT";
  label: string;
  instrument_key: string;
  kind: "index" | "stock";
  trade_label: string;
  option_side?: string | null;
  option_symbol?: string | null;
  strike?: number | null;
  lot_size?: number | null;
  lots: number;
  quantity: number;
  entry_price: number;
  exit_price?: number | null;
  pnl?: number | null;
  selection_score: number;
  quality?: string | null;
  rr_ratio?: number | null;
  market_bias: string;
  notes: string;
  close_reason?: string | null;
  scanner_row: OpportunityScannerRow;
};

export type ScannerPaperLabSummary = {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  realized_pnl: number;
  average_pnl: number;
  best_trade: number;
  worst_trade: number;
  average_entry_score: number;
  tracked_instruments: number;
};

export type ScannerPaperAutoEntrySettings = {
  enabled: boolean;
  broker_id: "upstox" | "kite";
  include_indices: boolean;
  include_stocks: boolean;
  max_indices: number;
  max_stocks: number;
  daily_history_days: number;
  trade_mode: "buy-only" | "mixed";
  use_greek_filters: boolean;
  ema_bias_mode: "off" | "score" | "strict";
  min_quality: "A" | "B" | "C";
  min_option_ltp?: number | null;
  max_option_ltp?: number | null;
  workers: number;
  lots: number;
  risk_cap_amount: number;
  cooldown_minutes: number;
  scan_interval_seconds: number;
};

export type ScannerPaperAutoEntryStatus = {
  last_run_at?: string | null;
  last_run_state: "idle" | "ok" | "error";
  last_run_message: string;
  last_scan_duration_seconds?: number | null;
  last_rows_scanned: number;
  last_candidates_considered: number;
  last_momentum_ready: number;
  last_entries_opened: number;
};

export type ScannerPaperLabDashboard = {
  summary: ScannerPaperLabSummary;
  trades: ScannerPaperTrade[];
  auto_entry_settings: ScannerPaperAutoEntrySettings;
  auto_entry_status: ScannerPaperAutoEntryStatus;
};

export type ScannerPaperTradeCreateRequest = {
  row: OpportunityScannerRow;
  lots: number;
  entry_price?: number | null;
  risk_cap_amount?: number | null;
  notes: string;
};

export type ScannerPaperTradeCloseRequest = {
  exit_price: number;
  reason: string;
};

