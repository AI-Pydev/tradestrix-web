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

export type CryptoOptimizationRequest = {
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

export type SharedStrategyId =
  | "tv_ha_call_v2"
  | "fibo_nk_call"
  | "jk_al_call"
  | "ol_oh_call"
  | "tv_ha_put_v2"
  | "fibo_nk_put"
  | "jk_al_put"
  | "ol_oh_put";

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

