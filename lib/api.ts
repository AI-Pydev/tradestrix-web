import { buildAuthorizedHeaders, throwIfApiError } from "@/lib/auth";

export type DashboardSnapshot = {
  total_strategies: number;
  active_strategies: number;
  watchlist_groups: number;
  tracked_symbols: number;
  signals_processed: number;
  open_trades: number;
  closed_trades: number;
  realized_pnl: number;
  win_rate: number;
  alerts_triggered: number;
  updated_at: string;
};

export type StrategyConfig = {
  strategy_id: string;
  name: string;
  description: string;
  symbols: string[];
  group_name?: string | null;
  timeframe: string;
  status: "draft" | "active" | "paused";
  paper_trade: boolean;
  created_at: string;
  updated_at: string;
};

export type TradeRecord = {
  trade_id: string;
  strategy_id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  quantity: number;
  entry_price: number;
  exit_price?: number | null;
  pnl?: number | null;
  mode: "paper" | "live";
  status: "OPEN" | "CLOSED" | "REJECTED";
  opened_at: string;
  closed_at?: string | null;
  notes: string;
};

export type SignalEvent = {
  strategy_id: string;
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  price: number;
  confidence: number;
  timeframe: string;
  source: string;
  signal_time: string;
  metadata: Record<string, string | number | boolean>;
};

export type WatchlistGroup = {
  name: string;
  symbols: string[];
  description: string;
  updated_at: string;
};

export type AlertEvent = {
  alert_id: string;
  strategy_id: string;
  symbol: string;
  channel: "console" | "email" | "sms" | "webhook";
  event_type: "ENTRY" | "EXIT" | "ERROR" | "INFO";
  message: string;
  created_at: string;
};

export type BrokerConnection = {
  broker_id: string;
  display_name: string;
  auth_mode: "oauth2_redirect" | "manual" | "coming_soon";
  status: "connected" | "configured" | "needs_config" | "error";
  configured: boolean;
  connected: boolean;
  capabilities: string[];
  missing_config: string[];
  redirect_uri?: string | null;
  access_token_present: boolean;
  refresh_token_present: boolean;
  access_token?: string | null;
  notes: string;
  login_defaults: Record<string, string | null>;
};

export type BrokerHealth = {
  broker_id: string;
  display_name: string;
  status: "green" | "red" | "unknown";
  valid: boolean;
  configured: boolean;
  token_present: boolean;
  checked_at: string;
  latency_ms?: number | null;
  message: string;
};

export type BrokerAuthStartResponse = {
  broker_id: string;
  display_name: string;
  auth_url: string;
  redirect_uri: string;
  instructions: string;
};

export type BrokerCallbackResult = {
  broker_id: string;
  success: boolean;
  message: string;
  redirect_url: string;
};

export type KotakManualAuthRequest = {
  client_id: string;
  mobile_number: string;
  totp: string;
  mpin: string;
};

export type InstrumentItem = {
  label: string;
  instrument_key: string;
  kind: "index" | "stock" | "commodity";
  verified: boolean;
  symbol?: string | null;
  trading_symbol?: string | null;
  exchange?: string | null;
  isin?: string | null;
  lot_size?: number | null;
};

export type InstrumentCatalogResponse = {
  indices: InstrumentItem[];
  stocks: InstrumentItem[];
  commodities: InstrumentItem[];
};

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

export type UpstoxOptionChainBotRunRequest = {
  instrument_key: string;
  commodity_symbol?: string | null;
  expiry?: string | null;
  execution_mode: "paper" | "live";
  execution_broker?: "kotak" | "upstox" | "kite" | null;
  market_data_broker: MarketDataBrokerId;
  fallback_broker?: MarketDataBrokerId | null;
  force_fallback_for_test: boolean;
  side: "call" | "put";
  strategy_id: string;
  candle_unit: string;
  candle_interval: string;
  strike_offset: number;
  use_greek_selection: boolean;
  max_entry_ltp: number;
  max_total_entry_amount?: number | null;
  risk_model: "dynamic" | "fixed" | "risk_amount";
  risk_amount?: number | null;
  use_time_windows: boolean;
  use_ema20_entry_filter: boolean;
  use_market_regime_filter?: boolean;
  min_market_regime_score?: number;
  min_market_direction_score?: number;
  sl_premium_pct: number;
  target_premium_pct: number;
  min_hold_sec_before_underlying_exit: number;
  entry_interval_sec: number;
  exit_interval_sec: number;
  lots: number;
  lot_size: number;
  market_open: string;
  entry_cutoff: string;
  time_exit: string;
  store_path: string;
  max_cycles?: number | null;
  once: boolean;
};

export type UpstoxOptionChainBotRunResponse = {
  status: string;
  message: string;
  store_path: string;
  instrument_key: string;
  side: string;
  strategy_id: string;
  strategy_label: string;
  once: boolean;
  max_cycles?: number | null;
  logs: string[];
};

export type UpstoxManagedBotStartRequest = {
  job_name?: string | null;
  auto_store_path: boolean;
  instrument_key: string;
  commodity_symbol?: string | null;
  expiry?: string | null;
  execution_mode: "paper" | "live";
  execution_broker?: "kotak" | "upstox" | "kite" | null;
  market_data_broker: MarketDataBrokerId;
  fallback_broker?: MarketDataBrokerId | null;
  force_fallback_for_test: boolean;
  side: "call" | "put";
  strategy_id: string;
  candle_unit: string;
  candle_interval: string;
  strike_offset: number;
  use_greek_selection: boolean;
  max_entry_ltp: number;
  max_total_entry_amount?: number | null;
  risk_model: "dynamic" | "fixed" | "risk_amount";
  risk_amount?: number | null;
  use_time_windows: boolean;
  use_ema20_entry_filter: boolean;
  use_market_regime_filter?: boolean;
  min_market_regime_score?: number;
  min_market_direction_score?: number;
  sl_premium_pct: number;
  target_premium_pct: number;
  min_hold_sec_before_underlying_exit: number;
  entry_interval_sec: number;
  exit_interval_sec: number;
  lots: number;
  lot_size: number;
  market_open: string;
  entry_cutoff: string;
  time_exit: string;
  store_path: string;
  max_cycles?: number | null;
  once: boolean;
};

export type UpstoxManagedBotJob = {
  job_id: string;
  job_name: string;
  status: "starting" | "running" | "stopping" | "stopped" | "completed" | "failed";
  pid?: number | null;
  instrument_key: string;
  side: "call" | "put";
  execution_mode?: "paper" | "live";
  strategy_id: string;
  strategy_label: string;
  store_path: string;
  entry_interval_sec: number;
  exit_interval_sec: number;
  use_greek_selection: boolean;
  lots: number;
  lot_size: number;
  max_cycles?: number | null;
  once: boolean;
  auto_store_path: boolean;
  started_at: string;
  stopped_at?: string | null;
  last_log_at?: string | null;
  last_error?: string | null;
  return_code?: number | null;
  has_open_trade: boolean;
  open_trade_id?: number | null;
  open_trade_option?: string | null;
  open_trade_option_type?: string | null;
  open_trade_expiry?: string | null;
  open_trade_strike?: number | null;
  open_trade_opened_at?: string | null;
  open_trade_quantity: number;
  open_trade_entry_ltp?: number | null;
  open_trade_stop_ltp?: number | null;
  open_trade_target_ltp?: number | null;
  trade_count: number;
  closed_trade_count: number;
  total_realized_pnl: number;
  today_realized_pnl: number;
  current_option_ltp?: number | null;
  current_spot?: number | null;
  unrealized_pnl_points?: number | null;
  unrealized_pnl_amount?: number | null;
  quote_error?: string | null;
  log_line_count: number;
  recent_logs: string[];
};

export type UpstoxManagedBotDashboardSummary = {
  managed_jobs: number;
  active_jobs: number;
  open_bot_trades: number;
  total_investment: number;
  today_realized_pnl: number;
  gross_profit: number;
  gross_loss: number;
  fleet_realized_pnl: number;
  updated_at: string;
};

export type UpstoxEntryRejectionReasonCount = {
  reason_code: string;
  total: number;
};

export type UpstoxEntryRejectionSummary = {
  since_hours: number;
  instrument_key?: string | null;
  strategy_id?: string | null;
  total_events: number;
  reason_counts: UpstoxEntryRejectionReasonCount[];
};

export type UpstoxManagedBotPage = {
  items: UpstoxManagedBotJob[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next_cursor?: string | null;
};

export type UpstoxManagedBotDeleteResponse = {
  job_id: string;
  job_name: string;
  store_path: string;
  deleted_store_file: boolean;
};

export type UpstoxManagedBotBulkDeleteFailure = {
  job_id: string;
  error: string;
};

export type UpstoxManagedBotBulkDeleteResponse = {
  requested_count: number;
  deleted_count: number;
  failed_count: number;
  deleted: UpstoxManagedBotDeleteResponse[];
  failed: UpstoxManagedBotBulkDeleteFailure[];
};

export type UpstoxManagedBotTrade = {
  id: number;
  created_at: string;
  updated_at: string;
  trade_mode: string;
  broker: string;
  instrument_key: string;
  expiry: string;
  option_type: string;
  strike: number;
  option_symbol: string;
  broker_symbol?: string | null;
  lots: number;
  lot_size: number;
  quantity: number;
  entry_spot: number;
  entry_ltp: number;
  stop_ltp: number;
  target_ltp: number;
  entry_reason: string;
  opened_at: string;
  entry_order_id?: string | null;
  closed_at?: string | null;
  exit_spot?: number | null;
  exit_ltp?: number | null;
  exit_reason?: string | null;
  exit_order_id?: string | null;
  pnl_points?: number | null;
  pnl_amount?: number | null;
  status: string;
};

export type UpstoxTradeHistoryOption = {
  value: string;
  label: string;
};

export type UpstoxTradeHistorySummary = {
  total_pnl: number;
  raw_total_pnl: number;
  brokerage_total: number;
  gross_profit: number;
  gross_loss: number;
  trade_count: number;
  closed_trade_count: number;
  open_trade_count: number;
  wins: number;
  losses: number;
  breakeven: number;
  win_rate: number;
  profit_factor: number;
  max_drawdown: number;
};

export type UpstoxTradeHistoryBucket = {
  date?: string;
  month?: string;
  pnl: number;
  trade_count: number;
  wins: number;
  losses: number;
  breakeven: number;
};

export type UpstoxTradeHistoryPoint = {
  date: string;
  pnl: number;
};

export type UpstoxTradeHistoryTrade = {
  job_id: string;
  job_name: string;
  trade_id: number;
  date: string;
  execution_mode: string;
  broker: string;
  instrument_key: string;
  instrument_label: string;
  side: string;
  strategy_id: string;
  strategy_label: string;
  option_symbol: string;
  quantity: number;
  entry_ltp: number;
  exit_ltp?: number | null;
  opened_at: string;
  closed_at?: string | null;
  exit_reason?: string | null;
  status: string;
  raw_pnl_amount?: number | null;
  brokerage_amount: number;
  pnl_amount?: number | null;
};

export type UpstoxTradeHistoryAnalytics = {
  summary: UpstoxTradeHistorySummary;
  daily: UpstoxTradeHistoryBucket[];
  monthly: UpstoxTradeHistoryBucket[];
  equity_curve: UpstoxTradeHistoryPoint[];
  trades: UpstoxTradeHistoryTrade[];
  options: {
    instruments: UpstoxTradeHistoryOption[];
    strategies: UpstoxTradeHistoryOption[];
  };
};

export type UpstoxIndexAutoLaunchConfig = {
  enabled: boolean;
  verified_only: boolean;
  include_call: boolean;
  include_put: boolean;
  default_call_strategy_id: string;
  default_put_strategy_id: string;
  enabled_call_strategy_ids: string[];
  enabled_put_strategy_ids: string[];
  enabled_strategy_basket_ids: string[];
  execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
  candle_unit: string;
  candle_interval: string;
  strike_offset: number;
  use_greek_selection: boolean;
  max_entry_ltp: number;
  risk_model: "dynamic" | "fixed" | "risk_amount";
  risk_amount?: number | null;
  use_time_windows: boolean;
  use_market_regime_filter: boolean;
  min_market_regime_score: number;
  min_market_direction_score: number;
  sl_premium_pct: number;
  target_premium_pct: number;
  min_hold_sec_before_underlying_exit: number;
  entry_interval_sec: number;
  exit_interval_sec: number;
  lots: number;
  market_open: string;
  entry_cutoff: string;
  time_exit: string;
};

export type UpstoxIndexAutoLaunchSummary = {
  eligible_index_count: number;
  desired_job_count: number;
  active_job_count: number;
  active_index_count: number;
  started_count: number;
  skipped_count: number;
  failed_count: number;
};

export type UpstoxIndexAutoLaunchTarget = {
  instrument_key: string;
  label: string;
  lot_size?: number | null;
  verified: boolean;
  call_strategy_id: string;
  call_strategy_label: string;
  call_strategy_ids: string[];
  call_strategy_labels: string[];
  put_strategy_id: string;
  put_strategy_label: string;
  put_strategy_ids: string[];
  put_strategy_labels: string[];
  call_active: boolean;
  put_active: boolean;
};

export type UpstoxIndexAutoLaunchJob = {
  job_id: string;
  job_name: string;
  instrument_key: string;
  label: string;
  side: "call" | "put";
  status: "starting" | "running" | "stopping";
  strategy_id: string;
  strategy_label: string;
};

export type UpstoxIndexAutoLaunchStatus = {
  enabled: boolean;
  monitor_running: boolean;
  monitor_interval_sec: number;
  market_now: string;
  market_day: boolean;
  market_window_open: boolean;
  launch_window_open: boolean;
  config: UpstoxIndexAutoLaunchConfig;
  summary: UpstoxIndexAutoLaunchSummary;
  targets: UpstoxIndexAutoLaunchTarget[];
  active_jobs: UpstoxIndexAutoLaunchJob[];
  last_run_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  notes: string[];
};

export type UpstoxStockAutoLaunchConfig = {
  enabled: boolean;
  instrument_keys: string[];
  verified_only: boolean;
  include_call: boolean;
  include_put: boolean;
  execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
  candle_unit: string;
  candle_interval: string;
  strike_offset: number;
  use_greek_selection: boolean;
  max_entry_ltp: number;
  risk_model: "dynamic" | "fixed" | "risk_amount";
  risk_amount?: number | null;
  use_time_windows: boolean;
  use_market_regime_filter: boolean;
  min_market_regime_score: number;
  min_market_direction_score: number;
  sl_premium_pct: number;
  target_premium_pct: number;
  min_hold_sec_before_underlying_exit: number;
  entry_interval_sec: number;
  exit_interval_sec: number;
  lots: number;
  launch_delay_sec: number;
  max_active_jobs: number;
  market_open: string;
  entry_cutoff: string;
  time_exit: string;
};

export type UpstoxStockAutoLaunchSummary = {
  eligible_stock_count: number;
  desired_job_count: number;
  active_job_count: number;
  started_count: number;
  skipped_count: number;
  failed_count: number;
};

export type UpstoxStockAutoLaunchTarget = {
  instrument_key: string;
  label: string;
  side: "call" | "put";
  strategy_id: string;
  strategy_label: string;
  lot_size?: number | null;
  win_rate: number;
  total_pnl: number;
  trades: number;
  active: boolean;
};

export type UpstoxStockAutoLaunchJob = {
  job_id: string;
  job_name: string;
  instrument_key: string;
  label: string;
  side: "call" | "put";
  status: "starting" | "running" | "stopping";
  strategy_id: string;
  strategy_label: string;
};

export type UpstoxStockAutoLaunchStatus = {
  enabled: boolean;
  monitor_running: boolean;
  monitor_interval_sec: number;
  execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
  market_now: string;
  market_day: boolean;
  market_window_open: boolean;
  launch_window_open: boolean;
  config: UpstoxStockAutoLaunchConfig;
  summary: UpstoxStockAutoLaunchSummary;
  targets: UpstoxStockAutoLaunchTarget[];
  active_jobs: UpstoxStockAutoLaunchJob[];
  last_run_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  notes: string[];
};

export type StrategyAssignmentSummary = {
  total_instruments: number;
  evaluated_results: number;
  successful_results: number;
  error_results: number;
  qualified_results: number;
  assignment_count: number;
  call_assignments: number;
  put_assignments: number;
  min_win_rate: number;
  min_trades: number;
  from_date: string;
  to_date: string;
  duration_seconds: number;
};

export type StrategyAssignmentResult = {
  instrument_key: string;
  label: string;
  kind: "index" | "stock";
  verified: boolean;
  side: "call" | "put";
  strategy_id: string;
  strategy_label: string;
  status: string;
  trades: number;
  wins: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  best_trade: number;
  worst_trade: number;
  passed_threshold: boolean;
  assigned: boolean;
  error_message?: string | null;
};

export type StrategyAssignment = {
  instrument_key: string;
  label: string;
  kind: "index" | "stock";
  verified: boolean;
  side: "call" | "put";
  strategy_id: string;
  strategy_label: string;
  batch_id: string;
  assigned_at: string;
  trades: number;
  wins: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  best_trade: number;
  worst_trade: number;
  status: string;
};

export type StrategyAssignmentRunRequest = {
  instrument_keys: string[];
  include_indices: boolean;
  include_stocks: boolean;
  verified_only: boolean;
  limit?: number | null;
  from_date: string;
  to_date: string;
  min_win_rate: number;
  min_trades: number;
  include_call: boolean;
  include_put: boolean;
  underlying_interval: string;
  option_interval: string;
  current_option_interval: string;
  strike_offset: number;
  lots: number;
  max_entry_ltp: number;
  sl_premium_pct: number;
  target_premium_pct: number;
};

export type StrategyAssignmentBatch = {
  batch_id: string;
  created_at: string;
  request: Record<string, string | number | boolean | string[] | null>;
  summary: StrategyAssignmentSummary;
  results: StrategyAssignmentResult[];
  assignments: StrategyAssignment[];
};

export type StrategyQualificationRules = {
  min_trades: number;
  min_win_rate: number;
  min_profit_factor: number;
  max_drawdown: number;
  min_last_sessions: number;
  min_profitable_last_sessions: number;
  max_consecutive_losses: number;
  min_net_pnl: number;
  reject_unverified_instruments: boolean;
};

export type StrategyQualificationRunRequest = {
  instrument_keys: string[];
  include_indices: boolean;
  include_stocks: boolean;
  verified_only: boolean;
  limit?: number | null;
  from_date: string;
  to_date: string;
  include_call: boolean;
  include_put: boolean;
  strategy_ids: string[];
  timeframe: string;
  underlying_unit: string;
  underlying_interval: string;
  option_interval: string;
  current_option_unit: string;
  current_option_interval: string;
  strike_offset: number;
  lots: number;
  max_entry_ltp: number;
  sl_premium_pct: number;
  target_premium_pct: number;
  rules: StrategyQualificationRules;
  candidate_scope?: "standard" | "paper_discovery";
};

export type StrategyQualificationMetrics = {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  net_pnl: number;
  gross_profit: number;
  gross_loss: number;
  drawdown: number;
  profit_factor?: number | null;
  sharpe_ratio: number;
  consecutive_loss: number;
  average_rr?: number | null;
  slippage_estimate: number;
  last_session_pnl: number[];
  unstable_pnl_curve: boolean;
};

export type StrategyQualificationResult = {
  instrument_key: string;
  symbol: string;
  side: "call" | "put";
  strategy_id: string;
  strategy_label: string;
  verified: boolean;
  kind: string;
  status: string;
  bucket: string;
  qualification_status: string;
  qualification_score: number;
  qualification_reason: string;
  failed_rules: string[];
  passed_rules: string[];
  metrics: StrategyQualificationMetrics;
  backtest_message?: string | null;
  backtest_logs?: string[];
};

export type StrategyQualificationBatch = {
  batch_id: string;
  created_at: string;
  request: Record<string, unknown>;
  summary: Record<string, unknown>;
  results: StrategyQualificationResult[];
  auto_launch_candidates: Record<string, { call: StrategyRegistryEntry[]; put: StrategyRegistryEntry[] }>;
  paper_discovery_candidates?: PaperDiscoveryCandidates | null;
  live_candidates?: Record<string, { call: StrategyRegistryEntry[]; put: StrategyRegistryEntry[] }> | null;
};

export type StrategyQualificationJob = {
  task_id: string;
  status: string;
  message: string;
  batch?: StrategyQualificationBatch | null;
  error?: string | null;
};

export type StrategyRegistryEntry = {
  id: number;
  strategy_id: string;
  name: string;
  instrument_key: string;
  symbol: string;
  timeframe: string;
  strategy_type: string;
  side: "call" | "put";
  status: string;
  bucket: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AutoQualificationSettings = {
  auto_enabled: boolean;
  source: "redis" | "env";
  env_default: boolean;
};

export type QualificationLoopMode = "once" | "daily" | "continuous";

export type QualificationCycleStatus = {
  status: string;
  loop_mode: QualificationLoopMode;
  cycle_id?: string | null;
  started_at?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  slice_size: number;
  window_days: number;
  strategy_ids: string[];
  timeframes: string[];
  total: number;
  done: number;
  pending: number;
  percent: number;
  last_slice_at?: string | null;
  last_error?: string | null;
  reason?: string;
  slice_locked?: boolean;
  market_hours?: boolean;
  blocked_reason?: string | null;
};

export type QualificationCycleStartRequest = {
  slice_size: number;
  loop_mode: QualificationLoopMode;
  strategy_ids?: string[];
  window_days?: number;
  timeframes?: string[];
};

export type QualificationIssueRow = {
  instrument_key: string;
  symbol: string;
  kind?: string;
  side?: string;
  strategy_id?: string;
  status?: string;
  qualification_status?: string;
  qualification_reason?: string;
  error_message?: string;
  started_at?: string | null;
};

export type QualificationInstrumentState = "running" | "done" | "pending";

export type QualificationInstrumentRow = {
  instrument_key: string;
  symbol: string;
  kind?: string;
  state: QualificationInstrumentState;
};

export type QualificationCycleInstruments = {
  cycle_id?: string | null;
  status: string;
  counts: { running: number; done: number; pending: number };
  running: QualificationInstrumentRow[];
  instruments: QualificationInstrumentRow[];
};

export type QualificationCycleIssues = {
  cycle_id?: string | null;
  status: string;
  summary: { failed: number; no_trades: number; stuck: number; not_run: number };
  failed: QualificationIssueRow[];
  no_trades: QualificationIssueRow[];
  stuck: QualificationIssueRow[];
  not_run: QualificationIssueRow[];
};

export type PaperDiscoveryCandidate = StrategyRegistryEntry & {
  latest_run: {
    id: number;
    batch_id: string;
    from_date: string;
    to_date: string;
    qualification_score: number;
    qualification_status: string;
    qualification_reason: string;
  };
  metrics: StrategyQualificationMetrics;
};

export type PaperDiscoveryCandidates = {
  thresholds: {
    min_win_rate: number;
    min_net_pnl: number;
    min_trades: number;
  };
  summary: {
    count: number;
    include_indices: boolean;
    include_stocks: boolean;
  };
  candidates: PaperDiscoveryCandidate[];
  grouped: Record<string, { call: PaperDiscoveryCandidate[]; put: PaperDiscoveryCandidate[] }>;
};

export type UpstoxOptionChainBotPreviewResponse = {
  mode: string;
  instrument_key: string;
  side: string;
  strategy_id: string;
  strategy_label: string;
  has_open_trade: boolean;
  signal?: Record<string, string | number | boolean> | null;
  candidate?: Record<string, string | number | boolean> | null;
  resolved_expiry?: string | null;
  store_path: string;
  message: string;
};

export type McxPreviewRequest = {
  instrument_key: string;
  commodity_symbol?: string | null;
  expiry?: string | null;
  rows_limit?: number;
};

export type McxPreviewLeg = {
  instrument_key?: string | null;
  ltp?: number | null;
  close_price?: number | null;
  volume?: number | null;
  oi?: number | null;
  bid_price?: number | null;
  bid_qty?: number | null;
  ask_price?: number | null;
  ask_qty?: number | null;
  iv?: number | null;
  vega?: number | null;
  theta?: number | null;
  gamma?: number | null;
  delta?: number | null;
  rho?: number | null;
};

export type McxPreviewRow = {
  strike_price: number;
  call?: McxPreviewLeg | null;
  put?: McxPreviewLeg | null;
};

export type McxPreviewResponse = {
  broker_id: string;
  broker_name: string;
  symbol: string;
  instrument_key: string;
  exchange_segment: string;
  resolved_expiry: string;
  available_expiries: string[];
  contract_count: number;
  total_strikes: number;
  returned_strikes: number;
  rows: McxPreviewRow[];
  message: string;
};

export type DeltaCryptoUnderlying = {
  symbol: string;
  quoting_symbol: string;
  spot_index_symbol?: string | null;
  contract_count: number;
  live_contract_count: number;
  expiries: string[];
};

export type DeltaCryptoProfile = {
  id?: string | null;
  account_name?: string | null;
  country?: string | null;
  margin_mode?: string | null;
  pf_index_symbol?: string | null;
  is_sub_account?: boolean | null;
  is_kyc_done?: boolean | null;
};

export type DeltaCryptoWallet = {
  net_equity?: number | null;
  robo_trading_equity?: number | null;
};

export type DeltaCryptoBalance = {
  asset_symbol: string;
  balance?: number | null;
  available_balance?: number | null;
  order_margin?: number | null;
  position_margin?: number | null;
  blocked_margin?: number | null;
};

export type DeltaCryptoDashboardResponse = {
  broker_id: string;
  broker_name: string;
  configured: boolean;
  api_base_url: string;
  underlyings: DeltaCryptoUnderlying[];
  profile?: DeltaCryptoProfile | null;
  wallet?: DeltaCryptoWallet | null;
  balances: DeltaCryptoBalance[];
  message: string;
};

export type CryptoManagedJob = {
  job_id: string;
  job_name: string;
  status: string;
  symbol: string;
  timeframe: string;
  execution_mode: "paper" | "demo";
  strategy_name: string;
  quantity: number;
  poll_interval_sec: number;
  started_at: string;
  stopped_at?: string | null;
  last_cycle_at?: string | null;
  last_candle_at?: string | null;
  last_signal: string;
  last_signal_reason: string;
  last_error?: string | null;
  has_open_position: boolean;
  position?: Record<string, string | number | null> | null;
  trade_count: number;
  closed_trade_count: number;
  realized_pnl: number;
  log_line_count: number;
};

export type CryptoJobLog = {
  id: number;
  job_id: string;
  created_at: string;
  level: string;
  event: string;
  message: string;
};

export type CryptoJobsSummary = {
  managed_jobs: number;
  active_jobs: number;
  open_positions: number;
  closed_trades: number;
  realized_pnl: number;
  updated_at: string;
};

export type CryptoManagedTrade = {
  trade_id: string;
  job_id: string;
  symbol: string;
  timeframe: string;
  side: string;
  quantity: number;
  entry_time: string;
  entry_price: number;
  stoploss: number;
  target: number;
  exit_time?: string | null;
  exit_price?: number | null;
  gross_pnl?: number | null;
  charges?: number | null;
  net_pnl?: number | null;
  status: string;
  exit_reason?: string | null;
  entry_order_id?: string | null;
  exit_order_id?: string | null;
  pnl_source?: string | null;
};

export type CryptoJobStartRequest = {
  job_name?: string | null;
  symbol: string;
  timeframe: "1m" | "3m" | "5m" | "15m" | "1h";
  execution_mode: "paper" | "demo";
  strategy_name: string;
  quantity: number;
  poll_interval_sec: number;
  atr_multiplier_sl: number;
  min_stop_percent: number;
  target_rr: number;
  max_hold_minutes: number;
  max_trades_per_hour: number;
  max_trades_per_day: number;
  max_daily_loss: number;
  leverage: number;
};

export type CryptoOptimizationMetrics = {
  total_trades: number;
  trades_per_day?: number;
  winning_trades: number;
  losing_trades: number;
  net_pnl: number;
  max_drawdown: number;
  win_rate: number;
  profit_factor?: number | null;
};

export type CryptoOptimizationCandidate = {
  candidate_id: string;
  strategy_name: string;
  symbol: string;
  timeframe: string;
  parameters: Record<string, number>;
  score: number;
  qualified?: boolean;
  full: CryptoOptimizationMetrics;
  train: CryptoOptimizationMetrics;
  test: CryptoOptimizationMetrics;
};

export type CryptoOptimizationResponse = {
  strategy_names: string[];
  train_percent: number;
  test_percent: number;
  duration_days?: number;
  train_days?: number;
  test_days?: number;
  combination_count: number;
  dataset_count: number;
  datasets?: {
    symbol: string;
    timeframe: string;
    candle_count: number;
    warmup_candle_count?: number;
    requested_warmup_candle_count?: number;
    history_complete?: boolean;
    strategy_history_complete?: Record<string, boolean>;
    context_history?: Record<
      string,
      {
        candle_count: number;
        warmup_candle_count: number;
        requested_warmup_candle_count: number;
        history_complete: boolean;
      }
    >;
    first_candle_at?: string | null;
    last_candle_at?: string | null;
  }[];
  skipped_contexts?: { strategy_name: string; symbol: string; timeframe: string; reason: string }[];
  assumptions?: {
    initial_capital: number;
    risk_per_trade_percent: number;
    max_leverage: number;
    slippage_percent_per_fill: number;
    fee_percent_per_fill: number;
    position_sizing: string;
  };
  qualified_count?: number;
  leaderboard?: CryptoOptimizationCandidate[];
};

export type DeltaOptionChainRequest = {
  underlying_asset_symbol: string;
  expiry_date?: string | null;
  rows_limit?: number;
};

export type DeltaOptionLeg = {
  symbol?: string | null;
  product_id?: number | null;
  close?: number | null;
  mark_price?: number | null;
  volume?: number | null;
  oi?: number | null;
  best_bid?: number | null;
  best_ask?: number | null;
  bid_size?: number | null;
  ask_size?: number | null;
  bid_iv?: number | null;
  ask_iv?: number | null;
  mark_vol?: number | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  rho?: number | null;
};

export type DeltaOptionChainRow = {
  strike_price: number;
  call?: DeltaOptionLeg | null;
  put?: DeltaOptionLeg | null;
};

export type DeltaOptionChainResponse = {
  broker_id: string;
  broker_name: string;
  underlying_asset_symbol: string;
  expiry_date: string;
  available_expiries: string[];
  contract_count: number;
  total_strikes: number;
  returned_strikes: number;
  spot_price?: number | null;
  atm_strike?: number | null;
  rows: DeltaOptionChainRow[];
  message: string;
};

export type DeltaStrategyCandidate = {
  side: "call" | "put";
  symbol?: string | null;
  product_id?: number | null;
  strike_price: number;
  mark_price: number;
  delta: number;
  oi: number;
  best_bid?: number | null;
  best_ask?: number | null;
  bid_size?: number | null;
  ask_size?: number | null;
  distance_from_spot?: number | null;
  score: number;
};

export type DeltaStrategyPreviewRequest = {
  underlying_asset_symbol: string;
  expiry_date?: string | null;
  option_preference: "call" | "put" | "both";
  target_delta: number;
  max_mark_price: number;
  min_open_interest: number;
};

export type DeltaStrategyPreviewResponse = {
  broker_id: string;
  broker_name: string;
  underlying_asset_symbol: string;
  expiry_date: string;
  available_expiries: string[];
  option_preference: "call" | "put" | "both";
  spot_price?: number | null;
  atm_strike?: number | null;
  entry_ready: boolean;
  preferred_candidate?: DeltaStrategyCandidate | null;
  call_candidate?: DeltaStrategyCandidate | null;
  put_candidate?: DeltaStrategyCandidate | null;
  message: string;
  next_step: string;
};

export type DeltaDemoTrackedOrder = {
  local_order_id: string;
  created_at: string;
  broker_id: string;
  base_url: string;
  environment: string;
  source: string;
  underlying_asset_symbol: string;
  expiry_date?: string | null;
  option_side?: string | null;
  order_side: "buy" | "sell";
  order_type: "market_order" | "limit_order";
  size: number;
  product_id?: number | null;
  product_symbol?: string | null;
  requested_limit_price?: number | null;
  strategy: Record<string, string | number | boolean | null | object>;
  candidate: Record<string, string | number | boolean | null | object>;
  remote_order_id?: string | null;
  remote_state?: string | null;
  remote_created_at?: string | null;
  response: Record<string, string | number | boolean | null | object>;
};

export type DeltaDemoOrdersResponse = {
  broker_id: string;
  broker_name: string;
  base_url: string;
  demo_environment: boolean;
  summary: Record<string, string | number | boolean | null>;
  orders: DeltaDemoTrackedOrder[];
  message: string;
};

export type DeltaDemoOrderRequest = {
  underlying_asset_symbol: string;
  expiry_date?: string | null;
  instrument_type?: "option" | "future";
  candidate_side: "call" | "put";
  direction?: "long" | "short";
  order_side: "buy" | "sell";
  order_type: "market_order" | "limit_order";
  size: number;
  limit_price?: number | null;
  option_preference: "call" | "put" | "both";
  target_delta: number;
  max_mark_price: number;
  min_open_interest: number;
  max_order_value?: number;
  max_spread_pct?: number;
  allow_unbounded_risk?: boolean;
  source?: string;
};

export type DeltaDemoOrderResponse = {
  broker_id: string;
  broker_name: string;
  base_url: string;
  demo_environment: boolean;
  strategy: DeltaStrategyPreviewResponse;
  placed_order: DeltaDemoTrackedOrder;
  message: string;
};

export type DeltaSavedStrategyRequest = {
  strategy_name: string;
  strategy_type: SharedStrategyId;
  underlying_asset_symbol: string;
  expiry_date?: string | null;
  option_preference: "call" | "put" | "both";
  target_delta: number;
  max_mark_price: number;
  min_open_interest: number;
  candidate_side: "call" | "put";
  order_side: "buy" | "sell";
  order_type: "market_order" | "limit_order";
  size: number;
  limit_price?: number | null;
  max_order_value: number;
  max_spread_pct: number;
  allow_unbounded_risk: boolean;
};

export type DeltaSavedStrategyResponse = {
  strategy_id: string;
  strategy_name: string;
  strategy_type: SharedStrategyId;
  config: Record<string, string | number | boolean | null | object>;
  created_at: string;
  updated_at: string;
  runner_status: string;
};

export type SharedStrategyId =
  | "tv_ha_call_v2"
  | "fibo_nk_call"
  | "jk_al_call"
  | "ol_oh_call"
  | "tv_ha_put_v2"
  | "fibo_nk_put"
  | "jk_al_put"
  | "ol_oh_put";

export type DeltaTradingViewTemplateRequest = {
  alert_name: string;
  strategy_type: SharedStrategyId;
  instrument_type: "option" | "future";
  underlying_asset_symbol: string;
  expiry_date?: string | null;
  candidate_side: "call" | "put";
  direction: "long" | "short";
  order_side: "buy" | "sell";
  order_type: "market_order" | "limit_order";
  size: number;
  lots: number;
  leverage: number;
  option_preference: "call" | "put" | "both";
  target_delta: number;
  max_mark_price: number;
  min_open_interest: number;
  max_order_value: number;
  max_spread_pct: number;
  allow_unbounded_risk: boolean;
};

export type DeltaTradingViewTemplateGenerated = {
  webhook_path: string;
  message: Record<string, string | number | boolean | null>;
  pine_strategy_id: string;
};

export type DeltaTradingViewTemplateResponse = {
  template_id: string;
  alert_name: string;
  market: string;
  broker_id: string;
  strategy_type: SharedStrategyId;
  instrument_type: "option" | "future";
  underlying_asset_symbol: string;
  candidate_side: "call" | "put";
  direction: "long" | "short";
  order_side: "buy" | "sell";
  order_type: "market_order" | "limit_order";
  size: number;
  lots: number;
  leverage: number;
  access_token: string;
  pine_strategy_id: string;
  session: string;
  generated: DeltaTradingViewTemplateGenerated;
  message: string;
};

export type MarketDataBrokerId = "upstox" | "kite" | "dhan";

export type UpstoxOptionChainBacktestRunRequest = {
  instrument_key: string;
  commodity_symbol?: string | null;
  side: "call" | "put";
  strategy_id: string;
  market_data_broker: MarketDataBrokerId;
  fallback_broker?: MarketDataBrokerId | null;
  from_date: string;
  to_date: string;
  underlying_unit: string;
  underlying_interval: string;
  option_interval: string;
  current_option_unit: string;
  current_option_interval: string;
  strike_offset: number;
  lots: number;
  max_entry_ltp: number;
  sl_premium_pct: number;
  target_premium_pct: number;
  use_time_windows?: boolean;
  use_ema20_entry_filter?: boolean;
  use_market_regime_filter?: boolean;
  min_market_regime_score?: number;
  min_market_direction_score?: number;
  entry_exit_veto_mode?: "current_candle" | "prev_candle" | "off";
  risk_model?: "dynamic" | "fixed";
  export_csv?: string | null;
};

export type UpstoxOptionChainBacktestSummary = {
  trades: number;
  wins: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  best_trade: number;
  worst_trade: number;
};

export type UpstoxOptionChainBacktestTrade = {
  entry_time: string;
  exit_time: string;
  expiry: string;
  strike: number;
  symbol: string;
  entry_underlying: number;
  exit_underlying?: number | null;
  entry_option: number;
  exit_option: number;
  quantity: number;
  pnl_points: number;
  pnl_amount: number;
  reason: string;
  entry_reason?: string | null;
  loss_reason_code?: string | null;
  loss_reason?: string | null;
};

export type UpstoxOptionChainBacktestRunResponse = {
  mode: string;
  status: string;
  message: string;
  strategy_id: string;
  strategy_label: string;
  summary: UpstoxOptionChainBacktestSummary;
  trades: UpstoxOptionChainBacktestTrade[];
  skip_stats?: Record<string, number>;
  data_quality?: Record<string, number>;
  live_parity?: {
    overall: string;
    market_regime?: {
      status: string;
      enabled: boolean;
      min_regime_score: number;
      min_direction_score: number;
      detail: string;
    };
    underlying_entry_gates?: { status: string; detail: string };
    option_premium_and_fills?: { status: string; detail: string };
    option_contract_validation?: { status: string; detail: string };
    portfolio_and_broker?: { status: string; detail: string };
  };
  logs: string[];
  export_csv?: string | null;
  instrument_key: string;
  side: string;
  market_data_broker?: string | null;
  fallback_broker?: string | null;
  from_date: string;
  to_date: string;
};

export type UpstoxBacktestChartCandle = {
  open_time: string;
  close_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  complete: boolean;
};

export type UpstoxBacktestChartCandlesRequest = {
  instrument_key: string;
  commodity_symbol?: string | null;
  market_data_broker: MarketDataBrokerId;
  fallback_broker?: MarketDataBrokerId | null;
  from_date: string;
  to_date: string;
  underlying_unit: string;
  underlying_interval: string;
  price_mode?: "standard" | "heikin_ashi";
};

export type UpstoxBacktestChartCandlesResponse = {
  instrument_key: string;
  price_mode: string;
  from_date: string;
  to_date: string;
  candles: UpstoxBacktestChartCandle[];
};

export type TradingViewAlertTemplateGenerated = {
  webhook_path: string;
  message: Record<string, unknown>;
  pine_strategy_id: string;
};

export type TradingViewAlertTemplateStats = {
  window_start?: string | null;
  total_events: number;
  entry_events: number;
  exit_events: number;
  ignored_events: number;
  executed_events: number;
  rejected_events: number;
  total_trades: number;
  win_trades: number;
  loss_trades: number;
  win_rate: number;
  gross_pnl: number;
  gross_profit: number;
  gross_loss: number;
  highest_profit?: number | null;
  lowest_trade?: number | null;
  last_event_at?: string | null;
  last_status?: string | null;
  last_detail?: string | null;
  last_execution_status?: string | null;
  last_trade_id?: number | null;
};

export type TradingViewAlertTemplate = {
  template_id: string;
  alert_name: string;
  instrument_key: string;
  side: "call" | "put";
  paper_trade: boolean;
  trade_mode: 1 | 3;
  execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
  lots: number;
  quantity: number;
  option_offset: number;
  access_token: string;
  pine_strategy_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string | null;
  generated: TradingViewAlertTemplateGenerated;
  listening: boolean;
  stats_today: TradingViewAlertTemplateStats;
  stats_all: TradingViewAlertTemplateStats;
};

export type TradingViewAlertTemplateCreateRequest = {
  alert_name: string;
  instrument_key: string;
  side: "call" | "put";
  paper_trade: boolean;
  trade_mode: 1 | 3;
  execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
  lots: number;
  quantity?: number | null;
  option_offset: number;
  pine_strategy_id?: string | null;
  notes?: string;
};

export type TradingViewAlertTemplateUpdateRequest = {
  lots: number;
};

export type TradingViewAlertTemplateTestResponse = {
  status: string;
  message: string;
  normalized_action: string;
  normalized_side: string;
};

export type TradingViewWebhookEvent = {
  received_at: string;
  status: string;
  detail: string;
  alert_type: string;
  alert_name: string;
  strategy_id: string;
  normalized_action: string;
  normalized_side: string;
  execution_status?: string | null;
  trade_id?: number | null;
  entry_ltp?: number | null;
  exit_ltp?: number | null;
  pnl?: number | null;
  total_pnl?: number | null;
  commission?: number | null;
  india_vix?: number | null;
  payload?: Record<string, unknown> | null;
};

export type TradingViewAlertTemplateDiagnostics = {
  store_backend: string;
  database_url: string;
  template_count: number | null;
  error?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1/multi-stock";
const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ??
  API_BASE_URL.replace(/\/api\/v1\/multi-stock\/?$/, "");
const BROKER_HEALTH_LIST_ENDPOINTS = ["/api/v1/broker-health", "/api/v1/brokers/health"] as const;
const BROKER_HEALTH_DETAIL_ENDPOINTS = [
  "/api/v1/broker-health/{brokerId}",
  "/api/v1/brokers/{brokerId}/health",
] as const;
const BROKER_HEALTH_BROKERS = ["dhan", "kotakneo", "upstox", "kite"] as const;

function canonicalHealthBrokerId(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (normalized === "kotak" || normalized === "kotakneo") {
    return "kotakneo";
  }
  if (normalized === "dhan") {
    return "dhan";
  }
  if (normalized === "upstox") {
    return "upstox";
  }
  if (normalized === "kite") {
    return "kite";
  }
  return normalized;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

async function getBackendJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    cache: "no-store",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

async function postBackendJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "POST",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

async function postBackendJsonWithBody<T, TBody>(path: string, body: TBody): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "POST",
    headers: buildAuthorizedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

async function patchBackendJsonWithBody<T, TBody>(path: string, body: TBody): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "PATCH",
    headers: buildAuthorizedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

async function putBackendJsonWithBody<T, TBody>(path: string, body: TBody): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "PUT",
    headers: buildAuthorizedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

async function deleteBackend(path: string): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
}

async function deleteBackendJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

export async function fetchDashboardData() {
  const [dashboard, trades, instruments] = await Promise.all([
    getJson<DashboardSnapshot>("/dashboard"),
    getJson<TradeRecord[]>("/trades"),
    getBackendJson<InstrumentCatalogResponse>("/api/v1/instruments/catalog"),
  ]);

  return {
    dashboard,
    trades,
    instruments,
  };
}

export async function fetchBrokerConnections() {
  return getBackendJson<BrokerConnection[]>("/api/v1/brokers");
}

export type SymbolMappingRow = {
  canonical_key: string;
  display_name: string;
  symbol: string;
  asset_class: string;
  aliases: string[];
  broker_keys: Record<string, string[]>;
  dhan_underlying_scrip: number | null;
  dhan_underlying_seg: string | null;
  source: "default" | "override" | "custom";
  is_default: boolean;
  coverage: Record<string, boolean>;
  dhan_underlying_configured: boolean;
};

export type SymbolMapResponse = {
  editable_brokers: string[];
  dhan_supported: string[];
  mappings: SymbolMappingRow[];
};

export type SymbolMappingUpsert = {
  canonical_key: string;
  display_name: string;
  symbol: string;
  asset_class: string;
  aliases: string[];
  broker_keys: Record<string, string[]>;
  dhan_underlying_scrip: number | null;
  dhan_underlying_seg: string | null;
};

export async function fetchSymbolMap() {
  return getBackendJson<SymbolMapResponse>("/api/v1/brokers/symbol-map");
}

export async function upsertSymbolMapping(payload: SymbolMappingUpsert) {
  return putBackendJsonWithBody<SymbolMappingRow, SymbolMappingUpsert>(
    "/api/v1/brokers/symbol-map",
    payload,
  );
}

export async function deleteSymbolMapping(canonicalKey: string) {
  return deleteBackendJson<{ status: string; canonical_key: string }>(
    `/api/v1/brokers/symbol-map?canonical_key=${encodeURIComponent(canonicalKey)}`,
  );
}

export async function fetchBrokerHealth(refresh = false) {
  const batchErrors: string[] = [];

  for (const endpoint of BROKER_HEALTH_LIST_ENDPOINTS) {
    try {
      return await fetchBrokerHealthList(endpoint, refresh, 45000);
    } catch (error) {
      batchErrors.push(error instanceof Error ? error.message : "Unknown health list error");
    }
  }

  const settled = await Promise.allSettled(
    BROKER_HEALTH_BROKERS.map(async (brokerId) => {
      for (const endpointTemplate of BROKER_HEALTH_DETAIL_ENDPOINTS) {
        try {
          const endpoint = endpointTemplate.replace("{brokerId}", encodeURIComponent(brokerId));
          return await fetchBrokerHealthItem(endpoint, refresh, 15000);
        } catch {
          // Try next endpoint template.
        }
      }
      throw new Error(`No reachable health endpoint for ${brokerId}`);
    }),
  );

  const health = settled
    .filter((item): item is PromiseFulfilledResult<BrokerHealth> => item.status === "fulfilled")
    .map((item) => item.value);

  if (health.length > 0) {
    return health;
  }

  const notFoundOnly = [...batchErrors, ...settled
    .filter((item): item is PromiseRejectedResult => item.status === "rejected")
    .map((item) => (item.reason instanceof Error ? item.reason.message : String(item.reason)))]
    .every((message) => /not found|404/i.test(message));

  if (notFoundOnly) {
    try {
      const connections = await getBackendJson<BrokerConnection[]>("/api/v1/brokers");
      return mapBrokerConnectionsToHealth(connections);
    } catch {
      return unavailableBrokerHealthResponse(
        "Broker health endpoints are unavailable on the current backend.",
      );
    }
  }

  const reason = batchErrors[0] ?? "Health endpoints unavailable";
  throw new Error(`Broker health refresh failed. ${reason}`);
}

export async function fetchBrokerHealthByBroker(brokerId: string, refresh = false) {
  const canonicalBrokerId = canonicalHealthBrokerId(brokerId);
  const detailErrors: string[] = [];

  for (const endpointTemplate of BROKER_HEALTH_DETAIL_ENDPOINTS) {
    try {
      const endpoint = endpointTemplate.replace("{brokerId}", encodeURIComponent(canonicalBrokerId));
      return await fetchBrokerHealthItem(endpoint, refresh, 15000);
    } catch (error) {
      detailErrors.push(error instanceof Error ? error.message : "Unknown broker health error");
    }
  }

  const notFoundOnly = detailErrors.length > 0 && detailErrors.every((message) => /not found|404/i.test(message));
  if (notFoundOnly) {
    try {
      const connection = await getBackendJson<BrokerConnection>(
        `/api/v1/brokers/${encodeURIComponent(canonicalBrokerId)}`,
      );
      return mapBrokerConnectionToHealth(connection, canonicalBrokerId);
    } catch {
      return unavailableBrokerHealthResponse(
        "Broker health endpoint is unavailable on the current backend.",
      ).find((item) => item.broker_id === canonicalBrokerId) ?? {
        broker_id: canonicalBrokerId,
        display_name: canonicalBrokerId,
        status: "unknown",
        valid: false,
        configured: false,
        token_present: false,
        checked_at: new Date().toISOString(),
        latency_ms: null,
        message: "Broker health endpoint is unavailable on the current backend.",
      };
    }
  }

  const reason = detailErrors[0] ?? "Health endpoint unavailable";
  throw new Error(`Broker health refresh failed for ${canonicalBrokerId}. ${reason}`);
}

function mapBrokerConnectionToHealth(item: BrokerConnection | undefined, brokerId: string): BrokerHealth {
  const connected = Boolean(item?.connected);
  const configured = Boolean(item?.configured);
  const tokenPresent = Boolean(item?.access_token_present);
  const valid = connected || tokenPresent;
  let status: BrokerHealth["status"] = "red";
  if (valid) {
    status = "green";
  } else if (configured) {
    status = "unknown";
  }

  let message = "Broker configuration missing (fallback check).";
  if (valid) {
    message = "Connection-based fallback check passed (health endpoint unavailable).";
  } else if (configured) {
    message = "Configured but not connected (fallback check).";
  }

  return {
    broker_id: brokerId,
    display_name: item?.display_name ?? brokerId,
    status,
    valid,
    configured,
    token_present: tokenPresent,
    checked_at: new Date().toISOString(),
    latency_ms: null,
    message,
  };
}

function mapBrokerConnectionsToHealth(connections: BrokerConnection[]): BrokerHealth[] {
  const connectionMap = new Map(
    connections.map((item) => [String(item.broker_id || "").trim().toLowerCase(), item]),
  );

  return BROKER_HEALTH_BROKERS.map((brokerId) => {
    const item = connectionMap.get(canonicalHealthBrokerId(brokerId));
    return mapBrokerConnectionToHealth(item, brokerId);
  });
}

function unavailableBrokerHealthResponse(message: string): BrokerHealth[] {
  const now = new Date().toISOString();
  return BROKER_HEALTH_BROKERS.map((brokerId) => ({
    broker_id: brokerId,
    display_name: brokerId,
    status: "unknown" as const,
    valid: false,
    configured: false,
    token_present: false,
    checked_at: now,
    latency_ms: null,
    message,
  }));
}

async function fetchBrokerHealthList(endpoint: string, refresh: boolean, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `${BACKEND_BASE_URL}${endpoint}?refresh=${encodeURIComponent(String(refresh))}`,
      {
        cache: "no-store",
        headers: buildAuthorizedHeaders(),
        signal: controller.signal,
      },
    );
    await throwIfApiError(response);
    return (await response.json()) as BrokerHealth[];
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function fetchBrokerHealthItem(endpoint: string, refresh: boolean, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `${BACKEND_BASE_URL}${endpoint}?refresh=${encodeURIComponent(String(refresh))}`,
      {
        cache: "no-store",
        headers: buildAuthorizedHeaders(),
        signal: controller.signal,
      },
    );
    await throwIfApiError(response);
    return (await response.json()) as BrokerHealth;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function fetchInstrumentCatalog() {
  return getBackendJson<InstrumentCatalogResponse>("/api/v1/instruments/catalog");
}

export async function listTradingViewAlertTemplates() {
  return getBackendJson<TradingViewAlertTemplate[]>("/api/v1/tradingview-alert-templates");
}

export async function fetchTradingViewAlertTemplateDiagnostics() {
  return getBackendJson<TradingViewAlertTemplateDiagnostics>("/api/v1/tradingview-alert-templates/diagnostics");
}

export async function createTradingViewAlertTemplate(payload: TradingViewAlertTemplateCreateRequest) {
  return postBackendJsonWithBody<TradingViewAlertTemplate, TradingViewAlertTemplateCreateRequest>(
    "/api/v1/tradingview-alert-templates",
    payload,
  );
}

export async function updateTradingViewAlertTemplate(templateId: string, payload: TradingViewAlertTemplateUpdateRequest) {
  const encoded = encodeURIComponent(templateId);
  return patchBackendJsonWithBody<TradingViewAlertTemplate, TradingViewAlertTemplateUpdateRequest>(
    `/api/v1/tradingview-alert-templates/${encoded}`,
    payload,
  );
}

export async function deleteTradingViewAlertTemplate(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return deleteBackend(`/api/v1/tradingview-alert-templates/${encoded}`);
}

export async function regenerateTradingViewAlertTemplateToken(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplate>(`/api/v1/tradingview-alert-templates/${encoded}/regenerate-token`);
}

export async function regenerateTradingViewAlertTemplateStrategyId(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplate>(
    `/api/v1/tradingview-alert-templates/${encoded}/regenerate-strategy-id`,
  );
}

export async function testTradingViewAlertTemplateWebhook(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplateTestResponse>(
    `/api/v1/tradingview-alert-templates/${encoded}/test-webhook`,
  );
}

export async function setTradingViewAlertTemplateLive(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplate>(`/api/v1/tradingview-alert-templates/${encoded}/live`);
}

export async function setTradingViewAlertTemplatePaper(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return postBackendJson<TradingViewAlertTemplate>(`/api/v1/tradingview-alert-templates/${encoded}/paper`);
}

export async function fetchTradingViewAlertTemplateEvents(
  templateId: string,
  limit = 50,
  window: "today" | "all" = "all",
) {
  const encoded = encodeURIComponent(templateId);
  return getBackendJson<TradingViewWebhookEvent[]>(
    `/api/v1/tradingview-alert-templates/${encoded}/events?limit=${encodeURIComponent(String(limit))}&window=${encodeURIComponent(window)}`,
  );
}

export async function startBrokerAuth(brokerId: string) {
  return postBackendJson<BrokerAuthStartResponse>(`/api/v1/brokers/${brokerId}/auth/start`);
}

export async function disconnectBroker(brokerId: string) {
  return postBackendJson<BrokerConnection>(`/api/v1/brokers/${brokerId}/disconnect`);
}

export async function authenticateKotakBroker(payload: KotakManualAuthRequest) {
  return postBackendJsonWithBody<BrokerCallbackResult, KotakManualAuthRequest>(
    "/api/v1/brokers/kotakneo/manual/json",
    payload,
  );
}

export async function runUpstoxOptionChainBot(payload: UpstoxOptionChainBotRunRequest) {
  return postBackendJsonWithBody<UpstoxOptionChainBotRunResponse, UpstoxOptionChainBotRunRequest>(
    "/api/v1/upstox/option-chain-bot/run",
    payload,
  );
}

export async function fetchUpstoxManagedBotJobs() {
  return getBackendJson<UpstoxManagedBotJob[]>("/api/v1/upstox/option-chain-bot/jobs");
}

export async function fetchUpstoxManagedBotDashboardSummary() {
  return getBackendJson<UpstoxManagedBotDashboardSummary>("/api/v1/upstox/option-chain-bot/dashboard/summary");
}

export async function fetchUpstoxEntryRejectionSummary(params?: {
  since_hours?: number;
  instrument_key?: string;
  strategy_id?: string;
  include_brokerage?: boolean;
  brokerage_per_trade?: number;
}) {
  const search = new URLSearchParams();
  if (params?.since_hours != null) {
    search.set("since_hours", String(params.since_hours));
  }
  if (params?.instrument_key) {
    search.set("instrument_key", params.instrument_key);
  }
  if (params?.strategy_id) {
    search.set("strategy_id", params.strategy_id);
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  return getBackendJson<UpstoxEntryRejectionSummary>(
    `/api/v1/upstox/option-chain-bot/dashboard/rejections${suffix}`,
  );
}

export async function fetchUpstoxManagedBotDashboardJobs(params?: {
  status_group?: "active" | "history" | "all";
  limit?: number;
  page?: number;
  cursor?: string | null;
  strategy_id?: string;
  started_from?: string;
  started_to?: string;
}) {
  const search = new URLSearchParams();
  if (params?.status_group) {
    search.set("status_group", params.status_group);
  }
  if (params?.limit != null) {
    search.set("limit", String(params.limit));
  }
  if (params?.page != null) {
    search.set("page", String(params.page));
  }
  if (params?.cursor) {
    search.set("cursor", params.cursor);
  }
  if (params?.strategy_id && params.strategy_id !== "all") {
    search.set("strategy_id", params.strategy_id);
  }
  if (params?.started_from) {
    search.set("started_from", params.started_from);
  }
  if (params?.started_to) {
    search.set("started_to", params.started_to);
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  return getBackendJson<UpstoxManagedBotPage>(`/api/v1/upstox/option-chain-bot/dashboard/jobs${suffix}`);
}

export async function fetchUpstoxManagedBotTrades(jobId: string, limit = 100) {
  const encoded = encodeURIComponent(jobId);
  return getBackendJson<UpstoxManagedBotTrade[]>(
    `/api/v1/upstox/option-chain-bot/jobs/${encoded}/trades?limit=${encodeURIComponent(String(limit))}`,
  );
}

export async function fetchUpstoxTradeHistoryAnalytics(params?: {
  start_date?: string;
  end_date?: string;
  execution_mode?: "all" | "paper" | "live";
  instrument_key?: string;
  strategy_id?: string;
  include_brokerage?: boolean;
  brokerage_per_trade?: number;
}) {
  const search = new URLSearchParams();
  if (params?.start_date) {
    search.set("start_date", params.start_date);
  }
  if (params?.end_date) {
    search.set("end_date", params.end_date);
  }
  if (params?.execution_mode && params.execution_mode !== "all") {
    search.set("execution_mode", params.execution_mode);
  }
  if (params?.instrument_key && params.instrument_key !== "all") {
    search.set("instrument_key", params.instrument_key);
  }
  if (params?.strategy_id && params.strategy_id !== "all") {
    search.set("strategy_id", params.strategy_id);
  }
  if (params?.include_brokerage) {
    search.set("include_brokerage", "true");
  }
  if (params?.brokerage_per_trade != null) {
    search.set("brokerage_per_trade", String(params.brokerage_per_trade));
  }
  const suffix = search.size ? `?${search.toString()}` : "";
  return getBackendJson<UpstoxTradeHistoryAnalytics>(`/api/v1/upstox/option-chain-bot/trade-history${suffix}`);
}

export async function fetchUpstoxIndexAutoLaunchStatus() {
  return getBackendJson<UpstoxIndexAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/index-auto-launch");
}

export async function enableUpstoxIndexAutoLaunch() {
  return postBackendJson<UpstoxIndexAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/index-auto-launch/enable");
}

export async function disableUpstoxIndexAutoLaunch() {
  return postBackendJson<UpstoxIndexAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/index-auto-launch/disable");
}

export async function syncUpstoxIndexAutoLaunch() {
  return postBackendJson<UpstoxIndexAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/index-auto-launch/sync");
}

export async function setUpstoxIndexAutoLaunchStrategy(
  instrument_key: string,
  side: "call" | "put",
  strategy_id: string,
) {
  return postBackendJsonWithBody<
    UpstoxIndexAutoLaunchStatus,
    { instrument_key: string; side: "call" | "put"; strategy_id: string }
  >("/api/v1/upstox/option-chain-bot/index-auto-launch/strategy", {
    instrument_key,
    side,
    strategy_id,
  });
}

export async function setUpstoxIndexAutoLaunchDefaultStrategies(payload: {
  call_strategy_id?: string | null;
  put_strategy_id?: string | null;
  enabled_call_strategy_ids?: string[] | null;
  enabled_put_strategy_ids?: string[] | null;
  apply_to_targets?: boolean;
  execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
  enabled_strategy_basket_ids?: string[] | null;
  candle_interval?: "1" | "3" | "5" | "15" | null;
}) {
  return postBackendJsonWithBody<
    UpstoxIndexAutoLaunchStatus,
    {
      call_strategy_id?: string | null;
      put_strategy_id?: string | null;
      enabled_call_strategy_ids?: string[] | null;
      enabled_put_strategy_ids?: string[] | null;
      apply_to_targets?: boolean;
      execution_broker?: "paper" | "kotak_neo" | "upstox" | "kite" | null;
      enabled_strategy_basket_ids?: string[] | null;
      candle_interval?: "1" | "3" | "5" | "15" | null;
    }
  >("/api/v1/upstox/option-chain-bot/index-auto-launch/default-strategies", payload);
}

export async function fetchUpstoxStockAutoLaunchStatus() {
  return getBackendJson<UpstoxStockAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/stock-auto-launch");
}

export async function enableUpstoxStockAutoLaunch() {
  return postBackendJson<UpstoxStockAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/stock-auto-launch/enable");
}

export async function disableUpstoxStockAutoLaunch() {
  return postBackendJson<UpstoxStockAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/stock-auto-launch/disable");
}

export async function syncUpstoxStockAutoLaunch() {
  return postBackendJson<UpstoxStockAutoLaunchStatus>("/api/v1/upstox/option-chain-bot/stock-auto-launch/sync");
}

export async function setUpstoxStockAutoLaunchInstruments(instrument_keys: string[]) {
  return postBackendJsonWithBody<UpstoxStockAutoLaunchStatus, { instrument_keys: string[] }>(
    "/api/v1/upstox/option-chain-bot/stock-auto-launch/instruments",
    { instrument_keys },
  );
}

export async function setUpstoxStockAutoLaunchTimeframe(candle_interval: "1" | "3" | "5" | "15") {
  return postBackendJsonWithBody<UpstoxStockAutoLaunchStatus, { candle_interval: "1" | "3" | "5" | "15" }>(
    "/api/v1/upstox/option-chain-bot/stock-auto-launch/timeframe",
    { candle_interval },
  );
}

export async function fetchCurrentStrategyAssignments() {
  return getBackendJson<StrategyAssignment[]>("/api/v1/strategy-assignments/current");
}

export async function fetchLatestStrategyAssignmentBatch() {
  return getBackendJson<StrategyAssignmentBatch | null>("/api/v1/strategy-assignments/latest");
}

export async function runStrategyAssignments(payload: StrategyAssignmentRunRequest) {
  return postBackendJsonWithBody<StrategyAssignmentBatch, StrategyAssignmentRunRequest>(
    "/api/v1/strategy-assignments/run",
    payload,
  );
}

export async function runStrategyQualification(payload: StrategyQualificationRunRequest) {
  return postBackendJsonWithBody<StrategyQualificationBatch, StrategyQualificationRunRequest>(
    "/api/v1/strategy-qualification/run",
    payload,
  );
}

export async function enqueueStrategyQualification(payload: StrategyQualificationRunRequest) {
  return postBackendJsonWithBody<StrategyQualificationJob, StrategyQualificationRunRequest>(
    "/api/v1/strategy-qualification/run-async",
    payload,
  );
}

export async function runPaperDiscoveryQualification(payload: StrategyQualificationRunRequest) {
  return postBackendJsonWithBody<StrategyQualificationBatch, StrategyQualificationRunRequest>(
    "/api/v1/strategy-qualification/run-paper-discovery",
    { ...payload, candidate_scope: "paper_discovery" },
  );
}

export async function enqueuePaperDiscoveryQualification(payload: StrategyQualificationRunRequest) {
  return postBackendJsonWithBody<StrategyQualificationJob, StrategyQualificationRunRequest>(
    "/api/v1/strategy-qualification/run-paper-discovery-async",
    { ...payload, candidate_scope: "paper_discovery" },
  );
}

export async function fetchStrategyQualificationJob(taskId: string) {
  return getBackendJson<StrategyQualificationJob>(
    `/api/v1/strategy-qualification/jobs/${encodeURIComponent(taskId)}`,
  );
}

export async function fetchStrategyQualificationRegistry() {
  return getBackendJson<StrategyRegistryEntry[]>("/api/v1/strategy-qualification/registry");
}

export type StrategyQualificationRunResult = {
  id: number;
  batch_id: string;
  strategy: StrategyRegistryEntry;
  status: string;
  from_date: string;
  to_date: string;
  metrics: StrategyQualificationMetrics;
  qualification_status: string;
  qualification_score: number;
  qualification_reason: string;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

export async function fetchStrategyQualificationResults(limit = 200) {
  return getBackendJson<StrategyQualificationRunResult[]>(
    `/api/v1/strategy-qualification/results?limit=${limit}`,
  );
}

export async function fetchStrategyQualificationCandidates(executionMode: "paper" | "live" | "all" = "paper") {
  return getBackendJson<Record<string, { call: StrategyRegistryEntry[]; put: StrategyRegistryEntry[] }>>(
    `/api/v1/strategy-qualification/auto-launch-candidates?execution_mode=${encodeURIComponent(executionMode)}`,
  );
}

export async function fetchAutoQualificationSettings() {
  return getBackendJson<AutoQualificationSettings>(
    "/api/v1/strategy-qualification/auto-settings",
  );
}

export async function updateAutoQualificationSettings(autoEnabled: boolean) {
  return putBackendJsonWithBody<AutoQualificationSettings, { auto_enabled: boolean }>(
    "/api/v1/strategy-qualification/auto-settings",
    { auto_enabled: autoEnabled },
  );
}

export async function fetchQualificationCycle() {
  return getBackendJson<QualificationCycleStatus>(
    "/api/v1/strategy-qualification/cycle",
  );
}

export async function stopQualificationCycle() {
  return postBackendJson<QualificationCycleStatus>(
    "/api/v1/strategy-qualification/cycle/stop",
  );
}

export async function pauseQualificationCycle() {
  return postBackendJson<QualificationCycleStatus>(
    "/api/v1/strategy-qualification/cycle/pause",
  );
}

export async function resumeQualificationCycle() {
  return postBackendJson<QualificationCycleStatus>(
    "/api/v1/strategy-qualification/cycle/resume",
  );
}

export async function startQualificationCycle(payload: QualificationCycleStartRequest) {
  return postBackendJsonWithBody<QualificationCycleStatus, QualificationCycleStartRequest>(
    "/api/v1/strategy-qualification/cycle/start",
    payload,
  );
}

export async function fetchQualificationCycleIssues() {
  return getBackendJson<QualificationCycleIssues>(
    "/api/v1/strategy-qualification/cycle/issues",
  );
}

export async function fetchQualificationCycleInstruments() {
  return getBackendJson<QualificationCycleInstruments>(
    "/api/v1/strategy-qualification/cycle/instruments",
  );
}

export async function fetchPaperDiscoveryCandidates(params?: {
  min_win_rate?: number;
  min_net_pnl?: number;
  min_trades?: number;
  include_indices?: boolean;
  include_stocks?: boolean;
  limit?: number;
}) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  });
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return getBackendJson<PaperDiscoveryCandidates>(
    `/api/v1/strategy-qualification/paper-discovery-candidates${suffix}`,
  );
}

export async function startUpstoxManagedBot(payload: UpstoxManagedBotStartRequest) {
  return postBackendJsonWithBody<UpstoxManagedBotJob, UpstoxManagedBotStartRequest>(
    "/api/v1/upstox/option-chain-bot/jobs/start",
    payload,
  );
}

export async function stopUpstoxManagedBot(jobId: string) {
  return postBackendJson<UpstoxManagedBotJob>(`/api/v1/upstox/option-chain-bot/jobs/${jobId}/stop`);
}

export async function squareOffUpstoxManagedBot(jobId: string) {
  return postBackendJson<UpstoxManagedBotJob>(`/api/v1/upstox/option-chain-bot/jobs/${jobId}/square-off`);
}

export async function setUpstoxManagedBotMode(jobId: string, payload: { execution_mode: "paper" | "live" }) {
  const encoded = encodeURIComponent(jobId);
  return postBackendJsonWithBody<UpstoxManagedBotJob, { execution_mode: "paper" | "live" }>(
    `/api/v1/upstox/option-chain-bot/jobs/${encoded}/mode`,
    payload,
  );
}

export async function deleteUpstoxManagedBot(jobId: string) {
  return deleteBackendJson<UpstoxManagedBotDeleteResponse>(
    `/api/v1/upstox/option-chain-bot/jobs/${encodeURIComponent(jobId)}`,
  );
}

export async function bulkDeleteUpstoxManagedBots(jobIds: string[]) {
  return postBackendJsonWithBody<
    UpstoxManagedBotBulkDeleteResponse,
    { job_ids: string[] }
  >("/api/v1/upstox/option-chain-bot/jobs/bulk-delete", {
    job_ids: jobIds,
  });
}

export async function deleteAllUpstoxManagedBotHistory() {
  return deleteBackendJson<UpstoxManagedBotBulkDeleteResponse>(
    "/api/v1/upstox/option-chain-bot/jobs/history",
  );
}

export async function previewUpstoxOptionChainBot(payload: UpstoxOptionChainBotRunRequest) {
  return postBackendJsonWithBody<UpstoxOptionChainBotPreviewResponse, UpstoxOptionChainBotRunRequest>(
    "/api/v1/upstox/option-chain-bot/preview",
    payload,
  );
}

export async function previewMcxMarket(payload: McxPreviewRequest) {
  return postBackendJsonWithBody<McxPreviewResponse, McxPreviewRequest>(
    "/api/v1/mcx/upstox/preview",
    payload,
  );
}

export async function fetchDeltaCryptoDashboard() {
  return getBackendJson<DeltaCryptoDashboardResponse>("/api/v1/crypto/delta/dashboard");
}

export async function fetchCryptoJobsSummary() {
  return getBackendJson<CryptoJobsSummary>("/api/v1/crypto-jobs/summary");
}

export async function listCryptoJobs() {
  return getBackendJson<CryptoManagedJob[]>("/api/v1/crypto-jobs");
}

export async function startCryptoJob(payload: CryptoJobStartRequest) {
  return postBackendJsonWithBody<CryptoManagedJob, CryptoJobStartRequest>("/api/v1/crypto-jobs", payload);
}

export async function stopCryptoJob(jobId: string) {
  return postBackendJson<CryptoManagedJob>(`/api/v1/crypto-jobs/${encodeURIComponent(jobId)}/stop`);
}

export async function listCryptoJobTrades(jobId?: string) {
  const suffix = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  return getBackendJson<CryptoManagedTrade[]>(`/api/v1/crypto-jobs/trades${suffix}`);
}

export async function listCryptoJobLogs(jobId: string, limit = 200) {
  return getBackendJson<CryptoJobLog[]>(
    `/api/v1/crypto-jobs/${encodeURIComponent(jobId)}/logs?limit=${encodeURIComponent(String(limit))}`,
  );
}

export async function stopAllCryptoJobs() {
  return postBackendJson<{ status: string }>("/api/v1/crypto-jobs/emergency/stop-all");
}

export async function optimizeCryptoStrategy(payload: {
  symbols: string[];
  timeframes: string[];
  strategy_names: string[];
  start_date: string;
  end_date: string;
  initial_capital: number;
  risk_per_trade: number;
  slippage_percent: number;
  fee_percent: number;
  train_percent: number;
  max_combinations: number;
  grid?: Record<string, number[]>;
}) {
  return postBackendJsonWithBody<CryptoOptimizationResponse, typeof payload>(
    "/api/v1/crypto/backtest/optimize",
    payload,
  );
}

export async function previewDeltaOptionChain(payload: DeltaOptionChainRequest) {
  return postBackendJsonWithBody<DeltaOptionChainResponse, DeltaOptionChainRequest>(
    "/api/v1/crypto/delta/option-chain",
    payload,
  );
}

export async function previewDeltaStrategy(payload: DeltaStrategyPreviewRequest) {
  return postBackendJsonWithBody<DeltaStrategyPreviewResponse, DeltaStrategyPreviewRequest>(
    "/api/v1/crypto/delta/strategy-preview",
    payload,
  );
}

export async function fetchDeltaDemoOrders() {
  return getBackendJson<DeltaDemoOrdersResponse>("/api/v1/crypto/delta/demo-orders");
}

export async function placeDeltaDemoOrder(payload: DeltaDemoOrderRequest) {
  return postBackendJsonWithBody<DeltaDemoOrderResponse, DeltaDemoOrderRequest>(
    "/api/v1/crypto/delta/demo-order",
    payload,
  );
}

export async function listDeltaSavedStrategies() {
  return getBackendJson<DeltaSavedStrategyResponse[]>("/api/v1/crypto/strategies");
}

export async function createDeltaSavedStrategy(payload: DeltaSavedStrategyRequest) {
  return postBackendJsonWithBody<DeltaSavedStrategyResponse, DeltaSavedStrategyRequest>(
    "/api/v1/crypto/strategies",
    payload,
  );
}

export async function deleteDeltaSavedStrategy(strategyId: string) {
  return deleteBackendJson<{ status: string }>(`/api/v1/crypto/strategies/${strategyId}`);
}

export async function createDeltaTradingViewTemplate(payload: DeltaTradingViewTemplateRequest) {
  return postBackendJsonWithBody<DeltaTradingViewTemplateResponse, DeltaTradingViewTemplateRequest>(
    "/api/v1/crypto/delta/tradingview-template",
    payload,
  );
}

export async function listDeltaTradingViewTemplates() {
  return getBackendJson<DeltaTradingViewTemplateResponse[]>("/api/v1/crypto/delta/tradingview-templates");
}

export async function deleteDeltaTradingViewTemplate(templateId: string) {
  const encoded = encodeURIComponent(templateId);
  return deleteBackendJson<{ status: string }>(`/api/v1/crypto/delta/tradingview-templates/${encoded}`);
}

export async function runUpstoxOptionChainBacktest(payload: UpstoxOptionChainBacktestRunRequest) {
  return postBackendJsonWithBody<UpstoxOptionChainBacktestRunResponse, UpstoxOptionChainBacktestRunRequest>(
    "/api/v1/upstox/option-chain-backtest/run",
    payload,
  );
}

export async function fetchUpstoxBacktestChartCandles(payload: UpstoxBacktestChartCandlesRequest) {
  return postBackendJsonWithBody<UpstoxBacktestChartCandlesResponse, UpstoxBacktestChartCandlesRequest>(
    "/api/v1/upstox/option-chain-backtest/chart-candles",
    payload,
  );
}

export async function runOpportunityScanner(payload: OpportunityScannerRequest) {
  return postBackendJsonWithBody<OpportunityScannerResponse, OpportunityScannerRequest>(
    "/api/v1/opportunity-scanner/scan",
    payload,
  );
}

export async function runSupportResistanceScanner(payload: SupportResistanceScannerRequest) {
  return postBackendJsonWithBody<SupportResistanceScannerResponse, SupportResistanceScannerRequest>(
    "/api/v1/support-resistance-scanner/scan",
    payload,
  );
}

export async function fetchSupportResistanceTradeLabDashboard() {
  return getBackendJson<SupportResistanceTradeLabDashboard>("/api/v1/support-resistance-scanner/trade-lab/dashboard");
}

export async function updateSupportResistanceAutoEntrySettings(payload: SupportResistanceAutoEntrySettings) {
  return putBackendJsonWithBody<SupportResistanceAutoEntrySettings, SupportResistanceAutoEntrySettings>(
    "/api/v1/support-resistance-scanner/trade-lab/auto-entry",
    payload,
  );
}

export async function runSupportResistanceAutoEntryNow() {
  return postBackendJson<SupportResistanceAutoEntryStatus>("/api/v1/support-resistance-scanner/trade-lab/auto-entry/run");
}

export async function createSupportResistanceTrade(payload: SupportResistanceTradeActionRequest) {
  return postBackendJsonWithBody<SupportResistanceTradeRecord, SupportResistanceTradeActionRequest>(
    "/api/v1/support-resistance-scanner/trade-lab/trades",
    payload,
  );
}

export async function closeSupportResistanceTrade(tradeId: string, payload: SupportResistanceTradeCloseRequest) {
  return postBackendJsonWithBody<SupportResistanceTradeRecord, SupportResistanceTradeCloseRequest>(
    `/api/v1/support-resistance-scanner/trade-lab/trades/${tradeId}/close`,
    payload,
  );
}

export async function fetchScannerPaperLabDashboard() {
  return getBackendJson<ScannerPaperLabDashboard>("/api/v1/scanner-paper-lab/dashboard");
}

export async function updateScannerPaperAutoEntrySettings(payload: ScannerPaperAutoEntrySettings) {
  return putBackendJsonWithBody<ScannerPaperAutoEntrySettings, ScannerPaperAutoEntrySettings>(
    "/api/v1/scanner-paper-lab/auto-entry",
    payload,
  );
}

export async function runScannerPaperAutoEntryNow() {
  return postBackendJson<ScannerPaperAutoEntryStatus>("/api/v1/scanner-paper-lab/auto-entry/run");
}

export async function createScannerPaperTrade(payload: ScannerPaperTradeCreateRequest) {
  return postBackendJsonWithBody<ScannerPaperTrade, ScannerPaperTradeCreateRequest>(
    "/api/v1/scanner-paper-lab/trades",
    payload,
  );
}

export async function closeScannerPaperTrade(tradeId: string, payload: ScannerPaperTradeCloseRequest) {
  return postBackendJsonWithBody<ScannerPaperTrade, ScannerPaperTradeCloseRequest>(
    `/api/v1/scanner-paper-lab/trades/${tradeId}/close`,
    payload,
  );
}

// ── Research Agent: strategy improvement analysis ────────────────────────────

export type StrategyAnalysisRequest = {
  strategy_id: string;
  side: "call" | "put";
  instrument_key: string;
  from_date: string;
  to_date: string;
  underlying_unit?: string;
  underlying_interval?: string;
  market_data_broker: "dhan" | "kite" | "upstox";
  fallback_broker: "dhan" | "kite" | "upstox" | null;
};

export type StrategyAnalysisMetrics = {
  total_trades?: number;
  win_rate?: number;
  net_pnl?: number;
  profit_factor?: number | null;
  drawdown?: number;
  consecutive_loss?: number;
  average_rr?: number | null;
};

export type StrategyAnalysis = {
  id?: number;
  strategy_id: string;
  side: string;
  instrument_key: string;
  from_date: string;
  to_date: string;
  timeframe?: string;
  market_data_broker: string;
  fallback_broker?: string | null;
  trade_count: number;
  backtest_status?: string | null;
  metrics: StrategyAnalysisMetrics;
  analysis: string;
  provider?: string | null;
  model?: string | null;
  prompt_version?: string | null;
  usage?: Record<string, number | string | boolean | null>;
  created_at?: string | null;
};

export async function runStrategyAnalysis(payload: StrategyAnalysisRequest) {
  return postBackendJsonWithBody<StrategyAnalysis, StrategyAnalysisRequest>(
    `/api/research/strategy-analysis`,
    payload,
  );
}

export async function listStrategyAnalyses(strategyId?: string) {
  const query = strategyId
    ? `?strategy_id=${encodeURIComponent(strategyId)}`
    : "";
  return getBackendJson<StrategyAnalysis[]>(
    `/api/research/strategy-analysis${query}`,
  );
}

export async function getStrategyAnalysis(analysisId: number) {
  return getBackendJson<StrategyAnalysis>(
    `/api/research/strategy-analysis/${analysisId}`,
  );
}
