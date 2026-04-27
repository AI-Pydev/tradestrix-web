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
};

export type BrokerAuthStartResponse = {
  broker_id: string;
  display_name: string;
  auth_url: string;
  redirect_uri: string;
  instructions: string;
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

export type SupportResistanceTradeLabDashboard = {
  summary: SupportResistanceTradeLabSummary;
  trades: SupportResistanceTradeRecord[];
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

export type ScannerPaperLabDashboard = {
  summary: ScannerPaperLabSummary;
  trades: ScannerPaperTrade[];
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
  market_data_broker: "upstox" | "kite";
  fallback_broker?: "upstox" | "kite" | null;
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
  market_data_broker: "upstox" | "kite";
  fallback_broker?: "upstox" | "kite" | null;
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

export type UpstoxIndexAutoLaunchConfig = {
  enabled: boolean;
  verified_only: boolean;
  include_call: boolean;
  include_put: boolean;
  default_call_strategy_id: string;
  default_put_strategy_id: string;
  enabled_strategy_basket_ids: string[];
  candle_unit: string;
  candle_interval: string;
  strike_offset: number;
  use_greek_selection: boolean;
  max_entry_ltp: number;
  risk_model: "dynamic" | "fixed" | "risk_amount";
  risk_amount?: number | null;
  use_time_windows: boolean;
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
  put_strategy_id: string;
  put_strategy_label: string;
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
  candidate_side: "call" | "put";
  order_side: "buy" | "sell";
  order_type: "market_order" | "limit_order";
  size: number;
  limit_price?: number | null;
  option_preference: "call" | "put" | "both";
  target_delta: number;
  max_mark_price: number;
  min_open_interest: number;
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

export type UpstoxOptionChainBacktestRunRequest = {
  instrument_key: string;
  side: "call" | "put";
  strategy_id: string;
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
};

export type UpstoxOptionChainBacktestRunResponse = {
  mode: string;
  status: string;
  message: string;
  strategy_id: string;
  strategy_label: string;
  summary: UpstoxOptionChainBacktestSummary;
  trades: UpstoxOptionChainBacktestTrade[];
  logs: string[];
  export_csv?: string | null;
  instrument_key: string;
  side: string;
  from_date: string;
  to_date: string;
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
  india_vix?: number | null;
  payload?: Record<string, unknown> | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1/multi-stock";
const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ??
  API_BASE_URL.replace(/\/api\/v1\/multi-stock\/?$/, "");

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

async function deleteBackend(path: string): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
}

export async function fetchDashboardData() {
  const [dashboard, strategies, trades, signals, watchlists, alerts, brokers, instruments] = await Promise.all([
    getJson<DashboardSnapshot>("/dashboard"),
    getJson<StrategyConfig[]>("/strategies"),
    getJson<TradeRecord[]>("/trades"),
    getJson<SignalEvent[]>("/signals"),
    getJson<WatchlistGroup[]>("/watchlists"),
    getJson<AlertEvent[]>("/alerts"),
    getBackendJson<BrokerConnection[]>("/api/v1/brokers"),
    getBackendJson<InstrumentCatalogResponse>("/api/v1/instruments/catalog"),
  ]);

  return {
    dashboard,
    strategies,
    trades,
    signals,
    watchlists,
    alerts,
    brokers,
    instruments,
  };
}

export async function fetchBrokerConnections() {
  return getBackendJson<BrokerConnection[]>("/api/v1/brokers");
}

export async function fetchInstrumentCatalog() {
  return getBackendJson<InstrumentCatalogResponse>("/api/v1/instruments/catalog");
}

export async function listTradingViewAlertTemplates() {
  return getBackendJson<TradingViewAlertTemplate[]>("/api/v1/tradingview-alert-templates");
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

export async function runUpstoxOptionChainBot(payload: UpstoxOptionChainBotRunRequest) {
  return postBackendJsonWithBody<UpstoxOptionChainBotRunResponse, UpstoxOptionChainBotRunRequest>(
    "/api/v1/upstox/option-chain-bot/run",
    payload,
  );
}

export async function fetchUpstoxManagedBotJobs() {
  return getBackendJson<UpstoxManagedBotJob[]>("/api/v1/upstox/option-chain-bot/jobs");
}

export async function fetchUpstoxManagedBotTrades(jobId: string, limit = 100) {
  const encoded = encodeURIComponent(jobId);
  return getBackendJson<UpstoxManagedBotTrade[]>(
    `/api/v1/upstox/option-chain-bot/jobs/${encoded}/trades?limit=${encodeURIComponent(String(limit))}`,
  );
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
  apply_to_targets?: boolean;
}) {
  return postBackendJsonWithBody<
    UpstoxIndexAutoLaunchStatus,
    {
      call_strategy_id?: string | null;
      put_strategy_id?: string | null;
      apply_to_targets?: boolean;
    }
  >("/api/v1/upstox/option-chain-bot/index-auto-launch/default-strategies", payload);
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

export async function runUpstoxOptionChainBacktest(payload: UpstoxOptionChainBacktestRunRequest) {
  return postBackendJsonWithBody<UpstoxOptionChainBacktestRunResponse, UpstoxOptionChainBacktestRunRequest>(
    "/api/v1/upstox/option-chain-backtest/run",
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
