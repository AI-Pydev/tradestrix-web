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

