import { DEFAULT_INTERVAL_SECONDS } from './interval';
import type { RefreshRequest, RefreshResponse, RefreshState } from './types';

const previewState: RefreshState = {
  canRefresh: true,
  isRefreshing: false,
  intervalSeconds: DEFAULT_INTERVAL_SECONDS,
  remainingMs: null,
  nextRefreshAt: null
};

export function getPopupState(): Promise<RefreshState> {
  return sendMessage<RefreshState>({ type: 'popup:get-state' }, previewState);
}

export function startRefresh(intervalSeconds: number): Promise<RefreshState> {
  return sendMessage<RefreshState>({ type: 'refresh:start', intervalSeconds }, previewState);
}

export function stopRefresh(): Promise<RefreshState> {
  return sendMessage<RefreshState>({ type: 'refresh:stop' }, previewState);
}

function sendMessage<T>(message: RefreshRequest, fallback: T): Promise<T> {
  if (!hasExtensionRuntime()) {
    return Promise.resolve(fallback);
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RefreshResponse<T> | undefined) => {
      const error = chrome.runtime.lastError?.message;
      if (error) {
        reject(new Error(error));
        return;
      }
      if (!response) {
        reject(new Error('The extension background service did not respond.'));
        return;
      }
      if (!response.ok) {
        reject(new Error(response.error));
        return;
      }
      resolve(response.data);
    });
  });
}

function hasExtensionRuntime(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
}
