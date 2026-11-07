/**
 * Typed fetch wrapper for the admin API.
 *  - Sends the session cookie (credentials: include).
 *  - Unwraps the `{ success, data }` envelope and turns errors into `ApiError` with a readable message.
 *  - Keeps the request id so an error can be traced in the server log.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '/api/v1';
const ADMIN = `${BASE}/admin`;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly requestId?: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
  get isStale(): boolean {
    return this.status === 409;
  }
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}
export interface Paged<T> {
  items: T[];
  pagination: Pagination;
  summary?: Record<string, unknown>;
}

type Query = Record<string, string | number | boolean | undefined | null>;

const toQuery = (q?: Query): string => {
  if (!q) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void): void => {
  onUnauthorized = fn;
};

async function request<T>(method: string, path: string, body?: unknown, raw = false): Promise<{ json: any; res: Response; data: T }> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${ADMIN}${path}`, {
      method,
      credentials: 'include',
      headers: isForm || body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection.', 0);
  }
  if (raw) return { json: null, res, data: undefined as T };
  const requestId = res.headers.get('x-request-id') ?? undefined;
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok || json?.success === false) {
    if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized?.();
    const fieldErrors = json?.errors as Record<string, string[]> | undefined;
    const detail = fieldErrors ? Object.values(fieldErrors).flat().join(' · ') : '';
    throw new ApiError(
      detail || json?.error || (res.status === 429 ? 'Too many requests. Please wait a moment.' : `Something went wrong (${res.status})`),
      res.status,
      json?.errorCode,
      requestId,
      fieldErrors,
    );
  }
  return { json, res, data: json?.data as T };
}

export const api = {
  get: async <T>(path: string, query?: Query): Promise<T> => (await request<T>('GET', `${path}${toQuery(query)}`)).data,
  post: async <T>(path: string, body?: unknown): Promise<T> => (await request<T>('POST', path, body ?? {})).data,
  put: async <T>(path: string, body?: unknown): Promise<T> => (await request<T>('PUT', path, body ?? {})).data,
  patch: async <T>(path: string, body?: unknown): Promise<T> => (await request<T>('PATCH', path, body ?? {})).data,
  del: async <T>(path: string, body?: unknown): Promise<T> => (await request<T>('DELETE', path, body)).data,
  /** Paginated list: returns the rows plus page info (and an optional summary). */
  list: async <T>(path: string, query?: Query): Promise<Paged<T>> => {
    const { json } = await request<T[]>('GET', `${path}${toQuery(query)}`);
    return { items: json.data as T[], pagination: json.pagination as Pagination, summary: json.summary };
  },
  /** Download a file (CSV) through the browser. */
  download: async (path: string, query: Query, filename: string): Promise<void> => {
    const res = await fetch(`${ADMIN}${path}${toQuery(query)}`, { credentials: 'include' });
    if (!res.ok) throw new ApiError('Could not create the file', res.status);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
