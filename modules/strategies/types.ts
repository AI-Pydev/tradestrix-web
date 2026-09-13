import type {
    UpstoxTradeHistoryBucket,
    UpstoxTradeHistoryOption,
    UpstoxTradeHistoryPoint,
    UpstoxTradeHistorySummary,
} from "@/modules/execution";

export type TradingViewPnlMode = "paper" | "forward_test" | "live";

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

export type TradingViewAlertDashboardStats = {
  today: TradingViewAlertTemplateStats;
  all_time: TradingViewAlertTemplateStats;
  today_by_mode: Record<TradingViewPnlMode, TradingViewAlertTemplateStats>;
  all_time_by_mode: Record<TradingViewPnlMode, TradingViewAlertTemplateStats>;
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
  option_moneyness?: "ATM" | "OTM" | "ITM";
  option_offset: number;
  use_delta_selection?: boolean;
  target_delta?: number;
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
  option_moneyness?: "ATM" | "OTM" | "ITM" | null;
  option_offset: number;
  use_delta_selection?: boolean;
  target_delta?: number;
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
  execution_mode?: "paper" | "live" | string | null;
  execution_broker?: string | null;
  payload?: Record<string, unknown> | null;
};

export type TradingViewAlertTemplateDiagnostics = {
  store_backend: string;
  database_url: string;
  template_count: number | null;
  error?: string;
};

export type TradingViewTradeHistoryTrade = {
  template_id: string;
  template_name: string;
  trade_id?: number | null;
  date: string;
  execution_mode: TradingViewPnlMode | string;
  raw_execution_mode?: string | null;
  broker: string;
  instrument_key: string;
  instrument_label: string;
  side: string;
  strategy_id: string;
  strategy_label: string;
  option_symbol: string;
  quantity: number;
  entry_ltp?: number | null;
  exit_ltp?: number | null;
  opened_at: string;
  closed_at?: string | null;
  exit_reason?: string | null;
  status: string;
  raw_pnl_amount?: number | null;
  brokerage_amount: number;
  pnl_amount?: number | null;
};

export type TradingViewTradeHistoryAnalytics = {
  summary: UpstoxTradeHistorySummary;
  daily: UpstoxTradeHistoryBucket[];
  monthly: UpstoxTradeHistoryBucket[];
  equity_curve: UpstoxTradeHistoryPoint[];
  trades: TradingViewTradeHistoryTrade[];
  options: {
    instruments: UpstoxTradeHistoryOption[];
    templates: UpstoxTradeHistoryOption[];
  };
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
