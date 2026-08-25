import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import * as utils from '@/utils';
import {
  API_SCOPES,
  useApiTokensQuery,
  useCreateApiTokenMutation
} from '@/queries/apiTokenQueries';

// Mock the utils module so we can control sendFetchRequest's resolved
// Response directly, without depending on its internal fetch/health-check
// handling.
vi.mock('@/utils', async () => {
  const actual = await vi.importActual('@/utils');
  return {
    ...actual,
    sendFetchRequest: vi.fn()
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('apiTokenQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the six documented scopes', () => {
    expect([...API_SCOPES].sort()).toEqual([
      'files:read',
      'files:write',
      'jobs:read',
      'jobs:write',
      'links:read',
      'links:write'
    ]);
  });

  it('returns the token list', async () => {
    vi.mocked(utils.sendFetchRequest).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tokens: [
          {
            token_id: 'abc123',
            name: 'laptop',
            scopes: ['files:read'],
            created_at: '2026-08-24T00:00:00Z',
            expires_at: '2026-09-23T00:00:00Z',
            last_used_at: null
          }
        ]
      })
    } as unknown as Response);

    const { result } = renderHook(() => useApiTokensQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe('laptop');
  });

  it('returns the one-time secret from a create', async () => {
    vi.mocked(utils.sendFetchRequest).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        token: {
          token_id: 'abc123',
          name: 'laptop',
          scopes: ['files:read'],
          created_at: '2026-08-24T00:00:00Z',
          expires_at: '2026-09-23T00:00:00Z',
          last_used_at: null
        },
        secret: 'fgt_abc123_supersecret'
      })
    } as unknown as Response);

    const { result } = renderHook(() => useCreateApiTokenMutation(), {
      wrapper
    });
    const created = await result.current.mutateAsync({
      name: 'laptop',
      scopes: ['files:read'],
      expires_in_days: 30
    });

    expect(created.secret).toBe('fgt_abc123_supersecret');
  });

  it('surfaces an error response', async () => {
    vi.mocked(utils.sendFetchRequest).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'Unknown scopes: nope' })
    } as unknown as Response);

    const { result } = renderHook(() => useCreateApiTokenMutation(), {
      wrapper
    });

    await expect(
      result.current.mutateAsync({ name: 'x', scopes: ['nope'] })
    ).rejects.toThrow();
  });
});
