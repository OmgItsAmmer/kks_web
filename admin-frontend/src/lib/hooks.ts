import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ApiError } from './api-client';

/** Filters live in the URL so a list can be bookmarked, shared and survives a reload. */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const state = { ...defaults } as T;
  for (const key of Object.keys(defaults)) {
    const v = params.get(key);
    if (v !== null) (state as Record<string, string>)[key] = v;
  }
  const set = useCallback(
    (patch: Partial<T>, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === '' || v === (defaults as Record<string, string>)[k]) next.delete(k);
            else next.set(k, String(v));
          }
          if (resetPage && !('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );
  return [state, set] as const;
}

/** One place that turns an API failure into a friendly toast (with the request id for support). */
export function toastError(error: unknown, fallback = 'Something went wrong'): void {
  if (error instanceof ApiError) {
    toast.error(error.message, { description: error.requestId ? `Reference: ${error.requestId.slice(0, 8)}` : undefined });
  } else {
    toast.error(fallback);
  }
}
