import type { ActivityStreams, StravaActivity } from "@movepact/core";

/** Server-only Strava OAuth + REST client. Tokens never leave the server. */

const STRAVA = "https://www.strava.com";
export const REQUIRED_SCOPE = "activity:read_all";
export const REQUESTED_SCOPE = "read,activity:read_all";
export const STATE_COOKIE = "strava_oauth_state";

export type StravaErrorKind = "auth" | "permission" | "rate_limited" | "not_found" | "server" | "network";

/** Every Strava failure is a retryable sync error, never a GPS verdict. */
export class StravaError extends Error {
  constructor(
    readonly kind: StravaErrorKind,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "StravaError";
  }
}

export function kindForStatus(status: number): StravaErrorKind {
  if (status === 401) return "auth";
  if (status === 403) return "permission";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  return "server";
}

export interface StravaSummaryActivity extends StravaActivity {
  id: number;
  name?: string;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  /** Epoch seconds */
  expires_at: number;
  athlete?: { id: number };
}

type FetchLike = typeof fetch;

async function stravaFetch<T>(url: string, init: RequestInit, fetchImpl: FetchLike): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    throw new StravaError("network", null, `Strava request failed: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new StravaError(kindForStatus(res.status), res.status, `Strava responded ${res.status}`);
  }
  return (await res.json()) as T;
}

export function authorizeUrl(opts: { clientId: string; redirectUri: string; state: string }): string {
  const q = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: REQUESTED_SCOPE,
    state: opts.state,
  });
  return `${STRAVA}/oauth/authorize?${q}`;
}

/** Strava returns the scopes the athlete actually granted in the callback's `scope` param. */
export function hasRequiredScope(granted: string | null): boolean {
  return (granted ?? "").split(/[,\s]+/).includes(REQUIRED_SCOPE);
}

export function exchangeCode(
  code: string,
  creds: { clientId: string; clientSecret: string },
  fetchImpl: FetchLike = fetch,
): Promise<StravaTokenResponse> {
  return stravaFetch(
    `${STRAVA}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    },
    fetchImpl,
  );
}

export function refreshAccessToken(
  refreshToken: string,
  creds: { clientId: string; clientSecret: string },
  fetchImpl: FetchLike = fetch,
): Promise<StravaTokenResponse> {
  return stravaFetch(
    `${STRAVA}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    },
    fetchImpl,
  );
}

/** Lists the athlete's activities that started in (afterSec, beforeSec), newest pages first. */
export async function listActivities(
  accessToken: string,
  range: { afterSec: number; beforeSec: number },
  opts: { max?: number; fetchImpl?: FetchLike } = {},
): Promise<StravaSummaryActivity[]> {
  const max = opts.max ?? 100;
  const perPage = Math.min(max, 100);
  const out: StravaSummaryActivity[] = [];
  for (let page = 1; out.length < max; page++) {
    const q = new URLSearchParams({
      after: String(range.afterSec),
      before: String(range.beforeSec),
      per_page: String(perPage),
      page: String(page),
    });
    const batch = await stravaFetch<StravaSummaryActivity[]>(
      `${STRAVA}/api/v3/athlete/activities?${q}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      opts.fetchImpl ?? fetch,
    );
    out.push(...batch);
    if (batch.length < perPage) break;
  }
  return out.slice(0, max);
}

type RawStreams = Partial<Record<"time" | "latlng" | "distance", { data?: unknown[] }>>;

/** Flattens a `key_by_type=true` streams response into what `checkActivity` expects. */
export function flattenStreams(raw: RawStreams): ActivityStreams {
  return {
    time: raw.time?.data as number[] | undefined,
    latlng: raw.latlng?.data as [number, number][] | undefined,
    distance: raw.distance?.data as number[] | undefined,
  };
}

export async function getStreams(
  accessToken: string,
  activityId: number | string,
  fetchImpl: FetchLike = fetch,
): Promise<ActivityStreams> {
  const raw = await stravaFetch<RawStreams | unknown[]>(
    `${STRAVA}/api/v3/activities/${activityId}/streams?keys=time,latlng,distance&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    fetchImpl,
  );
  // A successful response with no streams (e.g. indoor recording) is real data, not an API failure.
  return Array.isArray(raw) ? {} : flattenStreams(raw);
}
