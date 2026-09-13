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

export type ShoonyaManualAuthRequest = {
  user_id: string;
  password: string;
  totp: string;
  vendor_code: string;
  api_key: string;
};

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

