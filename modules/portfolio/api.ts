/**
 * API client methods for the Portfolio and Trade Journal Module.
 */

import { getBackendJson, postBackendJson } from "@/platform/http/client";
import type {
  DailyJournalResponse,
  JournalSummaryResponse,
  RetentionRunResponse,
  RetentionStatusResponse,
} from "./types";

/**
 * Fetch raw daily trade journal entries for a given date (YYYY-MM-DD).
 */
export async function fetchDailyJournal(
  tradeDate: string,
): Promise<DailyJournalResponse> {
  return getBackendJson<DailyJournalResponse>(
    `/api/v1/portfolio/journal/${encodeURIComponent(tradeDate)}`,
  );
}

/**
 * Fetch calculated session PnL analytics and win rate summary for a date.
 */
export async function fetchJournalSummary(
  tradeDate: string,
): Promise<JournalSummaryResponse> {
  return getBackendJson<JournalSummaryResponse>(
    `/api/v1/portfolio/journal/${encodeURIComponent(tradeDate)}/summary`,
  );
}

/**
 * Retrieve current automated history retention configuration and schedule.
 */
export async function fetchRetentionStatus(): Promise<RetentionStatusResponse> {
  return getBackendJson<RetentionStatusResponse>(
    `/api/v1/portfolio/retention/status`,
  );
}

/**
 * Trigger an on-demand history retention and database purge cycle.
 */
export async function triggerRetentionRun(): Promise<RetentionRunResponse> {
  return postBackendJson<RetentionRunResponse>(
    `/api/v1/portfolio/retention/run`,
  );
}
