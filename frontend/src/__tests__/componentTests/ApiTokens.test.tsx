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
    SCOPE_DESCRIPTIONS: actual.SCOPE_DESCRIPTIONS,
    SCOPE_WARNINGS: actual.SCOPE_WARNINGS,
    useApiTokensQuery: () => mockUseApiTokensQuery(),
    useCreateApiTokenMutation: () => mockUseCreateApiTokenMutation(),
    useDeleteApiTokenMutation: () => mockUseDeleteApiTokenMutation()
  };
});

// Naive (no offset) on purpose, unlike the other fixtures in this file: a
// SQLAlchemy DateTime column serializes without a timezone unless something
// re-attaches one. This exercises formatDateOnly's Z-append fallback so a
// regression here (e.g. a missed _ensure_utc call) is actually caught.
const existingToken: ApiTokenInfo = {
  token_id: 'tok_123',
  name: 'laptop notebook',
  scopes: ['files:read', 'files:write'],
  created_at: '2026-01-01T00:00:00',
  expires_at: '2027-01-01T00:00:00',
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
    error: null,
    reset: vi.fn()
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

  it('asks for confirmation before revoking, then calls the delete mutation with the token id', async () => {
    setTokens([existingToken]);
    const user = userEvent.setup();

    render(<ApiTokens />);

    await user.click(screen.getByRole('button', { name: 'Revoke' }));

    // Revoking is destructive and irreversible - it must not happen on the
    // first click.
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/revoke api token/i)).toBeInTheDocument();
    // The confirmation copy names the token (in addition to the card above).
    expect(screen.getAllByText('laptop notebook')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Revoke Token' }));

    expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
    expect(mockDeleteMutate.mock.calls[0][0]).toBe('tok_123');
  });

  it('shows what each scope allows next to its checkbox', async () => {
    setTokens([]);
    const user = userEvent.setup();

    render(<ApiTokens />);
    await user.click(screen.getByRole('button', { name: /new token/i }));

    expect(
      screen.getByLabelText(/^files:read — List directories and read file/)
    ).toBeInTheDocument();
    // jobs:read reaches more than the name implies: full job detail and logs.
    expect(
      screen.getByLabelText(
        /^jobs:read .*parameters, environment, and log files/
      )
    ).toBeInTheDocument();
  });

  it('shows no theft warning when only read scopes are selected', async () => {
    setTokens([]);
    const user = userEvent.setup();

    render(<ApiTokens />);
    await user.click(screen.getByRole('button', { name: /new token/i }));
    await user.click(screen.getByLabelText(/^links:read/));

    expect(screen.queryByText(/treat this token like a password/i)).toBeNull();
  });

  it('warns about file access when files:write is selected', async () => {
    setTokens([]);
    const user = userEvent.setup();

    render(<ApiTokens />);
    await user.click(screen.getByRole('button', { name: /new token/i }));
    await user.click(screen.getByLabelText(/^files:write/));

    expect(
      screen.getByText(/treat this token like a password/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/files:write lets them create, change, and delete/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/jobs:write lets them run any code/)).toBeNull();
  });

  it('warns that jobs:write can run code as you, regardless of file scopes', async () => {
    setTokens([]);
    const user = userEvent.setup();

    render(<ApiTokens />);
    await user.click(screen.getByRole('button', { name: /new token/i }));
    await user.click(screen.getByLabelText(/^jobs:write/));

    expect(
      screen.getByText(
        /jobs:write lets them run any code on the cluster as you/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/even if you did not grant the file scopes/)
    ).toBeInTheDocument();
  });

  it('lists both warnings when files:write and jobs:write are both selected', async () => {
    setTokens([]);
    const user = userEvent.setup();

    render(<ApiTokens />);
    await user.click(screen.getByRole('button', { name: /new token/i }));
    await user.click(screen.getByLabelText(/^files:write/));
    await user.click(screen.getByLabelText(/^jobs:write/));

    expect(
      screen.getByText(/files:write lets them create/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/jobs:write lets them run any code/)
    ).toBeInTheDocument();
  });

  it('disables Create when the name is whitespace-only', async () => {
    setTokens([]);
    const user = userEvent.setup();

    render(<ApiTokens />);

    await user.click(screen.getByRole('button', { name: /new token/i }));
    await user.type(screen.getByLabelText('Name'), '   ');

    expect(screen.getByRole('button', { name: /^create$/i })).toBeDisabled();
  });

  it('disables Create when no scopes are selected', async () => {
    setTokens([]);
    const user = userEvent.setup();

    render(<ApiTokens />);

    await user.click(screen.getByRole('button', { name: /new token/i }));
    await user.type(screen.getByLabelText('Name'), 'valid name');
    // Uncheck the default files:read scope, leaving none selected.
    await user.click(screen.getByLabelText(/^files:read/));

    expect(screen.getByRole('button', { name: /^create$/i })).toBeDisabled();
  });

  it('keeps the dialog open and shows the error on a failed create, without opening the secret dialog', async () => {
    setTokens([existingToken]);
    const failure = new Error('token limit reached');
    mockCreateMutateAsync.mockRejectedValue(failure);
    mockUseCreateApiTokenMutation.mockReturnValue({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
      error: failure,
      reset: vi.fn()
    });
    const user = userEvent.setup();

    render(<ApiTokens />);

    await user.click(screen.getByRole('button', { name: /new token/i }));
    await user.type(screen.getByLabelText('Name'), 'new token');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByText('token limit reached')).toBeInTheDocument();
    // The create dialog is still open - its Name field is still present.
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    // The one-time secret dialog never appeared.
    expect(screen.queryByText(/token created/i)).not.toBeInTheDocument();
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
