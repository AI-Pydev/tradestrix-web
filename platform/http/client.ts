import { buildAuthorizedHeaders, throwIfApiError } from "@/lib/auth";

export { buildAuthorizedHeaders, throwIfApiError };

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1/multi-stock";

export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ??
  API_BASE_URL.replace(/\/api\/v1\/multi-stock\/?$/, "");

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

export async function getBackendJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    cache: "no-store",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

export async function postBackendJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "POST",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

export async function postBackendJsonWithBody<T, TBody>(path: string, body: TBody): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "POST",
    headers: buildAuthorizedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

export async function patchBackendJsonWithBody<T, TBody>(path: string, body: TBody): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "PATCH",
    headers: buildAuthorizedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

export async function putBackendJsonWithBody<T, TBody>(path: string, body: TBody): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "PUT",
    headers: buildAuthorizedHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}

export async function deleteBackend(path: string): Promise<void> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
}

export async function deleteBackendJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildAuthorizedHeaders(),
  });
  await throwIfApiError(response);
  return (await response.json()) as T;
}
