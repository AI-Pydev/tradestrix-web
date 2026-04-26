export type UserRole = "USER" | "ADMIN";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";

export type AuthUser = {
  id: number;
  name?: string | null;
  email: string;
  picture?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at?: string | null;
  last_login_at?: string | null;
};

export type GoogleLoginResponse = {
  status: UserStatus;
  message: string;
  user: AuthUser;
  access_token?: string | null;
  token_type?: "bearer" | null;
};

export type AuthSessionResponse = {
  user: AuthUser;
};

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://127.0.0.1:8000";

const AUTH_TOKEN_STORAGE_KEY = "tradestrix.auth.token";
const AUTH_CHANGED_EVENT = "tradestrix-auth-changed";

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  notifyAuthChanged();
}

export function clearStoredAuthToken() {
  if (typeof window === "undefined") {
    return;
  }
  const existing = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  if (existing !== null) {
    notifyAuthChanged();
  }
}

export function buildAuthorizedHeaders(headers?: HeadersInit) {
  const merged = new Headers(headers ?? {});
  const token = getStoredAuthToken();
  if (token) {
    merged.set("Authorization", `Bearer ${token}`);
  }
  return merged;
}

export function listenForAuthChanges(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const storageListener = (event: StorageEvent) => {
    if (event.key === AUTH_TOKEN_STORAGE_KEY) {
      listener();
    }
  };
  const customListener = () => listener();

  window.addEventListener("storage", storageListener);
  window.addEventListener(AUTH_CHANGED_EVENT, customListener);

  return () => {
    window.removeEventListener("storage", storageListener);
    window.removeEventListener(AUTH_CHANGED_EVENT, customListener);
  };
}

export async function throwIfApiError(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  if (response.status === 401) {
    clearStoredAuthToken();
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { detail?: string };
    throw new Error(payload.detail || `API request failed: ${response.status} ${response.statusText}`);
  }

  const detail = await response.text();
  throw new Error(detail || `API request failed: ${response.status} ${response.statusText}`);
}

export async function loginWithGoogleCredential(credential: string) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/google-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential }),
  });
  await throwIfApiError(response);
  return (await response.json()) as GoogleLoginResponse;
}

export async function fetchAuthSession() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/session`, {
    cache: "no-store",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as AuthSessionResponse;
}

export async function fetchAdminUsers() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/users`, {
    cache: "no-store",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as AuthUser[];
}

export async function updateAdminUserStatus(userId: number, status: UserStatus) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: buildAuthorizedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ status }),
  });
  await throwIfApiError(response);
  return (await response.json()) as AuthUser;
}
