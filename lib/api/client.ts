import type { Envelope, UploadResult } from '@/types/api';
const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'atopsy.accessToken';
export const token = {
  get: () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
  set: (value: string) => localStorage.setItem(TOKEN_KEY, value),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('atopsy:expired'));
  },
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function responseError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  const details = body?.error?.details || body?.detail;
  const fields: Record<string, string> = {};
  if (Array.isArray(details))
    for (const item of details)
      fields[item.field || item.loc?.at(-1) || 'form'] = item.message || item.msg;
  const message =
    body?.message ||
    (typeof body?.detail === 'string' ? body.detail : null) ||
    Object.values(fields).join('. ') ||
    `Request failed (${response.status}). Please try again.`;
  return new ApiError(message, response.status, fields);
}
let refreshFlight: Promise<string> | null = null;
export function refreshSession(): Promise<string> {
  if (refreshFlight) return refreshFlight;
  const before = token.get();
  const refresh = async () => {
    const current = token.get();
    if (current && current !== before) return current;
    const response = await fetch(`${base}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) token.clear();
      throw await responseError(response);
    }
    const body: Envelope<{ accessToken: string }> = await response.json();
    token.set(body.data.accessToken);
    return body.data.accessToken;
  };
  refreshFlight = (
    navigator.locks ? navigator.locks.request('atopsy-refresh', refresh) : refresh()
  ).finally(() => {
    refreshFlight = null;
  });
  return refreshFlight;
}
export async function request(
  path: string,
  options: RequestInit = {},
  authenticated = true,
  retry = true,
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const access = token.get();
  if (authenticated && access) headers.set('Authorization', `Bearer ${access}`);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('Unable to connect. Check your connection and try again.', 0);
  }
  if (response.status === 401 && authenticated && retry) {
    await refreshSession();
    return request(path, options, true, false);
  }
  if (!response.ok) {
    if (response.status === 401 && authenticated) token.clear();
    throw await responseError(response);
  }
  return response;
}
export async function api<T>(
  path: string,
  options?: RequestInit,
  authenticated = true,
): Promise<Envelope<T>> {
  const response = await request(path, options, authenticated);
  if (response.status === 204) return { success: true, data: null as T };
  const body: Envelope<T> = await response.json();
  if (body.success === false)
    throw new ApiError(body.message || 'The operation could not be completed.', response.status);
  return body;
}
export async function download(path: string, filename: string) {
  const response = await request(path);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function uploadFiles(
  caseId: string,
  files: File[],
  category: string,
  onProgress: (value: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  if (!token.get()) await refreshSession();
  const send = (retry: boolean): Promise<UploadResult> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      form.append('category', category);
      xhr.open('POST', `${base}/intelligence/cases/${encodeURIComponent(caseId)}/evidence`);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Authorization', `Bearer ${token.get()}`);
      xhr.timeout = 120000;
      const abort = () => xhr.abort();
      signal?.addEventListener('abort', abort, { once: true });
      xhr.onloadend = () => signal?.removeEventListener('abort', abort);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onerror = () =>
        reject(
          new ApiError('Upload connection failed. Verify the evidence list before retrying.', 0),
        );
      xhr.ontimeout = () =>
        reject(new ApiError('Upload timed out. Check the evidence list before retrying.', 408));
      xhr.onabort = () =>
        reject(
          new ApiError('Upload cancelled. Any files already received may still be registered.', 0),
        );
      xhr.onload = async () => {
        if (xhr.status === 401 && retry) {
          try {
            await refreshSession();
            resolve(await send(false));
          } catch (e) {
            reject(e);
          }
          return;
        }
        try {
          const response = new Response(xhr.responseText, {
            status: xhr.status,
            headers: { 'Content-Type': 'application/json' },
          });
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(await responseError(response));
            return;
          }
          const body: Envelope<UploadResult> = JSON.parse(xhr.responseText);
          if (!body.success)
            reject(new ApiError(body.message || 'Acquisition failed.', xhr.status));
          else resolve(body.data);
        } catch {
          reject(
            new ApiError(
              'The upload returned an invalid response. Verify the evidence list before retrying.',
              xhr.status,
            ),
          );
        }
      };
      if (signal?.aborted) {
        reject(new ApiError('Upload cancelled.', 0));
        return;
      }
      xhr.send(form);
    });
  return send(true);
}
