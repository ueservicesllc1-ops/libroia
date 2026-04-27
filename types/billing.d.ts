export interface UserRow {
  id: number;
  email: string;
  stripe_customer_id: string | null;
  plan: string;
  subscription_status: string;
  billing_cycle_start: string;
  billing_cycle_end: string;
  included_tokens_limit: number;
  included_tokens_used: number;
  sonnet_payg_enabled: number;
  sonnet_monthly_spend_limit: number | null;
  sonnet_monthly_spend_used: number;
  created_at: string;
  updated_at: string;
}

export interface UsagePayload {
  included_tokens_limit: number;
  included_tokens_used: number;
  included_tokens_remaining: number;
  included_usage_percent: number;
  included_alert_80: boolean;
  included_blocked: boolean;
  sonnet_payg_enabled: boolean;
  sonnet_monthly_spend_used: number;
  sonnet_monthly_spend_limit: number | null;
  billing_cycle_end: string;
}
