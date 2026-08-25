import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import { sendFetchRequest } from '@/utils';
import {
  getResponseJsonOrError,
  throwResponseNotOkError
} from '@/queries/queryUtils';

/**
 * The scopes an API token can grant. Must match API_SCOPES in
 * fileglancer/auth.py.
 */
export const API_SCOPES = [
  'files:read',
  'files:write',
  'links:read',
  'links:write',
  'jobs:read',
  'jobs:write'
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/**
 * An API token, without its secret.
 */
export type ApiTokenInfo = {
  token_id: string;
  name: string;
  scopes: string[];
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
};

type ApiTokenListResponse = {
  tokens: ApiTokenInfo[];
};

/**
 * The result of creating a token. The secret is shown once and is not
 * recoverable afterwards.
 */
export type CreateTokenResult = {
  token: ApiTokenInfo;
  secret: string;
};

export type CreateTokenParams = {
  name: string;
  scopes: string[];
  expires_in_days?: number;
};

// Query key factory for API tokens
export const apiTokenQueryKeys = {
  all: ['apiTokens'] as const,
  list: () => ['apiTokens', 'list'] as const
};

/**
 * Fetches all API tokens for the current user from the backend
 */
const fetchApiTokens = async (
  signal?: AbortSignal
): Promise<ApiTokenInfo[]> => {
  const response = await sendFetchRequest('/api/tokens', 'GET', undefined, {
    signal
  });

  const body = await getResponseJsonOrError(response);

  if (!response.ok) {
    throwResponseNotOkError(response, body);
  }

  return (body as ApiTokenListResponse).tokens ?? [];
};

/**
 * Query hook for fetching all API tokens for the current user
 *
 * @returns Query result with API tokens
 */
export function useApiTokensQuery(): UseQueryResult<ApiTokenInfo[], Error> {
  return useQuery<ApiTokenInfo[], Error>({
    queryKey: apiTokenQueryKeys.list(),
    queryFn: ({ signal }) => fetchApiTokens(signal)
  });
}

/**
 * Mutation hook for creating an API token.
 *
 * The returned secret is the only copy; the server keeps only a hash of it.
 */
export function useCreateApiTokenMutation(): UseMutationResult<
  CreateTokenResult,
  Error,
  CreateTokenParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTokenParams) => {
      const response = await sendFetchRequest('/api/tokens', 'POST', {
        name: params.name,
        scopes: params.scopes,
        expires_in_days: params.expires_in_days ?? 30
      });

      const body = await getResponseJsonOrError(response);

      if (!response.ok) {
        throwResponseNotOkError(response, body);
      }

      return body as CreateTokenResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenQueryKeys.all });
    }
  });
}

/**
 * Mutation hook for revoking an API token by its public token_id.
 */
export function useDeleteApiTokenMutation(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      // sendFetchRequest strips the body from DELETE requests, so the id
      // goes in the path instead.
      const response = await sendFetchRequest(
        `/api/tokens/${encodeURIComponent(tokenId)}`,
        'DELETE'
      );

      if (!response.ok) {
        const body = await getResponseJsonOrError(response);
        throwResponseNotOkError(response, body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenQueryKeys.all });
    }
  });
}
