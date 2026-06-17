export interface RefreshState {
  canRefresh: boolean;
  isRefreshing: boolean;
  intervalSeconds: number;
  remainingMs: number | null;
  nextRefreshAt: number | null;
}

export type RefreshRequest =
  | { type: 'popup:get-state' }
  | { type: 'refresh:start'; intervalSeconds: number }
  | { type: 'refresh:stop' };

export type RefreshResponse<T> = { ok: true; data: T } | { ok: false; error: string };
