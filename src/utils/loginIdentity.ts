export type RememberedLogin = {
  identifier: string;
  password: string;
};

export const REMEMBERED_LOGIN_STORAGE_KEY = 'amy-salon-remembered-login';
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