/**
 * Types and interfaces for the Portfolio and Trade Journal Module.
 */

export interface DailyTradeJournalRecord {
  trade_date: string;
  journal_key: string;
  trade_id: string;
  source: string;
  mode: string;
  status: string;
  side: string;
  symbol: string;
  instrument_key: string;
  option_symbol: string;
  quantity: number;
  entry_time: string;
  entry_price?: number | null;
  exit_time?: string | null;
  exit_price?: number | null;
  pnl?: number | null;
  reason: string;
  notes: string;
}

export interface JournalSummary {
  trade_date: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  max_gain: number;
  max_loss: number;
  profit_factor: number;
  mode_counts: Record<string, number>;
  side_counts: Record<string, number>;
}

export interface DailyJournalResponse {
  ok: boolean;
  trade_date: string;
  count: number;
  rows: DailyTradeJournalRecord[] | Record<string, unknown>[];
}

export interface JournalSummaryResponse extends JournalSummary {
  ok: boolean;
}

export interface RetentionStatusResponse {
  ok: boolean;
  enabled: boolean;
  retention_days: number;
  run_at: string;
  max_delete_rows: number;
  seconds_until_next_run: number;
}

export interface RetentionRunResponse {
  ok: boolean;
  message: string;
  executed_at: string;
  retention_days: number;
  max_delete_rows: number;
}
