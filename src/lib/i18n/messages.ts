const fallbackMessages = {
  extensionName: 'Custom Auto Refresh',
  extensionShortName: 'Auto Refresh',
  extensionDescription: 'Refresh the current tab on a custom interval.',
  actionTitle: 'Custom Auto Refresh',
  intervalLabel: 'Interval',
  start: 'Start',
  stop: 'Stop',
  active: 'Refreshing',
  idle: 'Idle',
  nextRefresh: 'Next refresh',
  cannotRefresh: 'This page cannot be refreshed by the extension.',
  invalidInterval: 'Enter a valid refresh interval.',
  sourceCode: 'Source Code'
} as const;

export type MessageKey = keyof typeof fallbackMessages;

export function t(key: MessageKey, substitutions?: string | string[]): string {
  const message = getChromeMessage(key, substitutions);
  return message || fallbackMessages[key];
}

export function getUiLanguage(): string {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
    return chrome.i18n.getUILanguage();
  }
  return navigator.language || 'en';
}

export const FALLBACK_MESSAGES = fallbackMessages;

function getChromeMessage(key: MessageKey, substitutions?: string | string[]): string {
  if (typeof chrome === 'undefined' || !chrome.i18n?.getMessage) {
    return '';
  }
  return chrome.i18n.getMessage(key, substitutions);
}
