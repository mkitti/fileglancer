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
 * What each scope allows, shown next to its checkbox when creating a token.
 *
 * Kept verbatim in sync with the scope table on the Python API docs page.
 * Typed as a total Record so adding a scope to API_SCOPES without describing
 * it here is a compile error rather than a blank row in the UI.
 */
export const SCOPE_DESCRIPTIONS: Record<ApiScope, string> = {
  'files:read': 'List directories and read file contents',
  'files:write': 'Create, rename, delete, and write files',
  'links:read': 'List data links and Neuroglancer links',
  'links:write': 'Create and delete data links and Neuroglancer links',
  'jobs:read':
    "List jobs and read each job's full details, parameters, environment, and log files",
  'jobs:write': 'Submit and cancel jobs'
};

/**
 * Scopes whose consequences are worse than their name suggests, and the plain
 * English explanation shown when one of them is selected.
 *
 * Only these two are listed: the read scopes and the link scopes cannot be
 * used to modify a user's files or run code as them.
 */
export const SCOPE_WARNINGS: Partial<Record<ApiScope, string>> = {
  'files:write':
    'files:write lets them create, change, and delete any file you can reach, including data you never meant to share.',
  'jobs:write':
    'jobs:write lets them run any code on the cluster as you. That includes reading and changing all of your files, even if you did not grant the file scopes.'
};

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
  list: () => ['apiTokens', 'list'] as const,
  scopes: () => ['apiTokens', 'scopes'] as const
};

/**
 * The scopes this server supports, which may be a subset of API_SCOPES.
 *
 * `files:write` and `jobs:write` are withheld by default because both amount
 * to full access to the user's files; an admin opts into them per server.
 */
const fetchEnabledScopes = async (signal?: AbortSignal): Promise<string[]> => {
  const response = await sendFetchRequest(
    '/api/tokens/scopes',
    'GET',
    undefined,
    { signal }
  );

  const body = await getResponseJsonOrError(response);

  if (!response.ok) {
    throwResponseNotOkError(response, body);
  }

  return (body as { scopes: string[] }).scopes ?? [];
};

/**
 * Query hook for the scopes this server supports.
 */
export function useEnabledScopesQuery(): UseQueryResult<string[], Error> {
  return useQuery<string[], Error>({
    queryKey: apiTokenQueryKeys.scopes(),
    queryFn: ({ signal }) => fetchEnabledScopes(signal)
  });
}

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
