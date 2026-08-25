import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import ApiTokens from '@/components/ApiTokens';
import type {
  ApiTokenInfo,
  CreateTokenResult
} from '@/queries/apiTokenQueries';

const mockUseApiTokensQuery = vi.fn();
const mockUseCreateApiTokenMutation = vi.fn();
const mockUseDeleteApiTokenMutation = vi.fn();

vi.mock('@/queries/apiTokenQueries', async () => {
  const actual = await vi.importActual<
    typeof import('@/queries/apiTokenQueries')
  >('@/queries/apiTokenQueries');
  return {
    API_SCOPES: actual.API_SCOPES,
    useApiTokensQuery: () => mockUseApiTokensQuery(),
    useCreateApiTokenMutation: () => mockUseCreateApiTokenMutation(),
    useDeleteApiTokenMutation: () => mockUseDeleteApiTokenMutation()
  };
});

const existingToken: ApiTokenInfo = {
  token_id: 'tok_123',
  name: 'laptop notebook',
  scopes: ['files:read', 'files:write'],
  created_at: '2026-01-01T00:00:00Z',
  expires_at: '2027-01-01T00:00:00Z',
  last_used_at: null
};

const mockDeleteMutate = vi.fn();
const mockCreateMutateAsync = vi.fn();

function setTokens(tokens: ApiTokenInfo[]) {
  mockUseApiTokensQuery.mockReturnValue({
    data: tokens,
    isLoading: false,
    error: null,
    refetch: vi.fn()
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCreateApiTokenMutation.mockReturnValue({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
    error: null
  });
  mockUseDeleteApiTokenMutation.mockReturnValue({
    mutate: mockDeleteMutate,
    isPending: false
  });
});

describe('ApiTokens page', () => {
  it('renders the empty state when there are no tokens', () => {
    setTokens([]);

    render(<ApiTokens />);

    expect(screen.getByText('No API tokens')).toBeInTheDocument();
    expect(screen.queryByTestId('api-token-list')).not.toBeInTheDocument();
  });

  it('renders a token name and its scopes when the list is non-empty', () => {
    setTokens([existingToken]);

    render(<ApiTokens />);

    expect(screen.getByText('laptop notebook')).toBeInTheDocument();
    expect(screen.getByText('files:read, files:write')).toBeInTheDocument();
  });

  it('calls the delete mutation with the token id when Revoke is clicked', async () => {
    setTokens([existingToken]);
    const user = userEvent.setup();

    render(<ApiTokens />);

    await user.click(screen.getByRole('button', { name: /revoke/i }));

    expect(mockDeleteMutate).toHaveBeenCalledWith('tok_123');
  });

  it('shows the secret exactly once after creating a token, and the listing never renders it', async () => {
    setTokens([existingToken]);
    const secret = 'fgt_super_secret_value';
    const createdResult: CreateTokenResult = {
      token: {
        token_id: 'tok_456',
        name: 'new token',
        scopes: ['files:read'],
        created_at: '2026-08-24T00:00:00Z',
        expires_at: '2026-09-23T00:00:00Z',
        last_used_at: null
      },
      secret
    };
    mockCreateMutateAsync.mockResolvedValue(createdResult);
    const user = userEvent.setup();

    render(<ApiTokens />);

    // The secret must not be present anywhere before creation.
    expect(screen.queryByText(new RegExp(secret))).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new token/i }));
    await user.type(screen.getByLabelText('Name'), 'new token');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    // The one-time secret dialog shows the secret.
    const secretText = await screen.findByText(new RegExp(secret));
    expect(secretText).toBeInTheDocument();

    // The token listing (rendered from useApiTokensQuery data) never
    // includes the secret, even while the one-time dialog is open.
    const list = screen.getByTestId('api-token-list');
    expect(
      within(list).queryByText(new RegExp(secret))
    ).not.toBeInTheDocument();

    // Only the one-time dialog renders the secret - a single occurrence.
    expect(screen.getAllByText(new RegExp(secret))).toHaveLength(1);
  });
});
