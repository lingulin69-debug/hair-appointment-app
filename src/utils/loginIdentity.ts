export type RememberedLogin = {
  identifier: string;
  password: string;
};

export const REMEMBERED_LOGIN_STORAGE_KEY = 'amy-salon-remembered-login';
export const ACTIVE_LOGIN_SESSION_STORAGE_KEY = 'amy-salon-active-login-session';
export const DEFAULT_LOGIN_ALIAS_DOMAIN = 'amysalon.local';

export function normalizeLoginIdentifier(value: string): string {
  const normalizedValue = value.trim().toLocaleLowerCase('en-US');

  if (!normalizedValue) {
    return '';
  }

  if (normalizedValue.includes('@')) {
    return normalizedValue;
  }

  return `${normalizedValue}@${DEFAULT_LOGIN_ALIAS_DOMAIN}`;
}

export function loadRememberedLogin(): RememberedLogin | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(REMEMBERED_LOGIN_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<RememberedLogin> | null;
    const identifier = typeof parsedValue?.identifier === 'string' ? parsedValue.identifier.trim() : '';
    const password = typeof parsedValue?.password === 'string' ? parsedValue.password : '';

    if (!identifier || !password) {
      return null;
    }

    return {
      identifier,
      password,
    };
  } catch {
    return null;
  }
}

export function saveRememberedLogin(credentials: RememberedLogin) {
  if (typeof window === 'undefined') {
    return;
  }

  const identifier = credentials.identifier.trim();
  if (!identifier || !credentials.password) {
    clearRememberedLogin();
    return;
  }

  window.localStorage.setItem(
    REMEMBERED_LOGIN_STORAGE_KEY,
    JSON.stringify({
      identifier,
      password: credentials.password,
    })
  );
}

export function clearRememberedLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(REMEMBERED_LOGIN_STORAGE_KEY);
}

export function hasActiveLoginSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(ACTIVE_LOGIN_SESSION_STORAGE_KEY) === '1';
}

function getNavigationType(): string {
  if (typeof window === 'undefined' || typeof window.performance === 'undefined') {
    return '';
  }

  const navigationEntries =
    typeof window.performance.getEntriesByType === 'function'
      ? window.performance.getEntriesByType('navigation')
      : [];
  const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;

  if (navigationEntry && typeof navigationEntry.type === 'string') {
    return navigationEntry.type;
  }

  const legacyNavigation = (window.performance as Performance & {
    navigation?: { type?: number };
  }).navigation;

  return legacyNavigation?.type === 1 ? 'reload' : '';
}

export function hasAcceptedLoginSession(): boolean {
  return hasActiveLoginSession() || getNavigationType() === 'reload';
}

export function activateLoginSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(ACTIVE_LOGIN_SESSION_STORAGE_KEY, '1');
}

export function clearActiveLoginSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(ACTIVE_LOGIN_SESSION_STORAGE_KEY);
}