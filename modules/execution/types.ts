export type MarketDataBrokerId = "upstox" | "kite" | "dhan";

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
  per_index_strategy_overrides: Record<string, { call?: string[]; put?: string[] }>;
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
  call_available_strategy_ids: string[];
  call_available_strategy_labels: string[];
  put_strategy_id: string;
  put_strategy_label: string;
  put_strategy_ids: string[];
  put_strategy_labels: string[];
  put_available_strategy_ids: string[];
  put_available_strategy_labels: string[];
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

export type EquityInstrumentItem = {
  symbol: string;
  trading_symbol: string;
  label: string;
  instrument_key: string;
  category: "index_bees" | "thematic_etfs" | "top_stocks" | string;
  exchange: string;
  lot_size: number;
  verified: boolean;
  description: string;
};

export type EquityCatalogResponse = {
  index_bees: EquityInstrumentItem[];
  thematic_etfs: EquityInstrumentItem[];
  top_stocks: EquityInstrumentItem[];
  all_items: EquityInstrumentItem[];
};

export type EquityStrategyItem = {
  id: string;
  label: string;
  description: string;
  default_target_pct: string;
  default_sl_pct: string;
};

export type EquityBotRunRequest = {
  instrument_key: string;
  symbol?: string;
  strategy_id: string;
  execution_mode: "paper" | "live";
  execution_broker: "kotak_neo" | "upstox" | "dhan" | "kite" | "shoonya";
  product_type: "CNC" | "MIS";
  sizing_mode: "capital" | "quantity";
  allocated_capital: number;
  quantity: number;
  candle_interval: string;
  candle_unit: string;
  target_pct: number;
  target_points?: number | null;
  sl_pct: number;
  trailing_sl_pct?: number | null;
  allow_no_sl: boolean;
  market_data_broker: string;
  poll_interval_sec?: number;
  job_name?: string | null;
};

export type EquityManagedJob = {
  job_id: string;
  job_name: string;
  config: EquityBotRunRequest;
  status: "starting" | "running" | "stopping" | "completed" | "failed" | "stopped";
  has_open_trade: boolean;
  open_trade_id?: number | null;
  entry_price?: number | null;
  current_ltp?: number | null;
  target_price?: number | null;
  sl_price?: number | null;
  unrealized_pnl?: number | null;
  unrealized_pnl_pct?: number | null;
  target_progress_pct?: number | null;
  quantity: number;
  trade_count: number;
  closed_trade_count: number;
  total_realized_pnl: number;
  today_realized_pnl: number;
  started_at: string;
  stopped_at?: string | null;
  last_log_at?: string | null;
  last_error?: string | null;
  logs?: string[];
};

export type EquityDashboardSummary = {
  managed_jobs: number;
  active_jobs: number;
  open_trades: number;
  total_investment: number;
  today_realized_pnl: number;
  fleet_realized_pnl: number;
  gross_profit: number;
  gross_loss: number;
  win_rate: number;
  total_closed_trades: number;
};

export type EquityTradeHistoryTrade = {
  id: number;
  job_id: string;
  job_name: string;
  symbol: string;
  instrument_key: string;
  category: string;
  strategy_id: string;
  strategy_label: string;
  product_type: string;
  trade_mode: string;
  broker: string;
  quantity: number;
  entry_price: number;
  exit_price?: number | null;
  target_price: number;
  sl_price: number;
  opened_at: string;
  closed_at?: string | null;
  status: string;
  exit_reason?: string | null;
  raw_pnl?: number | null;
  brokerage: number;
  net_pnl?: number | null;
  date: string;
};

export type EquityTradeHistoryBucket = {
  date?: string;
  month?: string;
  pnl: number;
  trade_count: number;
  wins: number;
  losses: number;
};

export type EquityTradeHistoryPoint = {
  date: string;
  pnl: number;
};

export type EquityTradeHistoryAnalytics = {
  summary: {
    total_pnl: number;
    total_trades: number;
    open_trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    gross_profit: number;
    gross_loss: number;
    profit_factor: number;
    average_trade_pnl: number;
  };
  daily_buckets: EquityTradeHistoryBucket[];
  monthly_buckets: EquityTradeHistoryBucket[];
  equity_points: EquityTradeHistoryPoint[];
  trades: EquityTradeHistoryTrade[];
};

export type EquityAutoLaunchStatus = {
  enabled: boolean;
  config: {
    enabled: boolean;
    strategy_id: string;
    candle_interval: string;
    candle_unit: string;
    target_pct: number;
    sl_pct: number;
    allocated_capital: number;
    product_type: string;
    execution_mode: string;
    execution_broker: string;
    market_data_broker: string;
    allow_no_sl: boolean;
    max_active_bots: number;
    poll_interval_sec: number;
  };
  total_nifty50_universe: number;
  active_nifty50_bots: number;
  total_active_bots: number;
  open_trades: number;
  last_scan_at?: string | null;
  last_error?: string | null;
};
