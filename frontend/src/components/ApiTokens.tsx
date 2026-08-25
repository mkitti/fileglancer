import { useState } from 'react';
import { Card, Typography } from '@material-tailwind/react';
import { HiOutlineKey, HiOutlinePlus } from 'react-icons/hi';

import FgButton from '@/components/designSystem/atoms/FgButton';
import FgIcon from '@/components/designSystem/atoms/FgIcon';
import ApiTokenCard from '@/components/ui/ApiTokens/ApiTokenCard';
import CreateTokenDialog from '@/components/ui/ApiTokens/CreateTokenDialog';
import NewTokenDialog from '@/components/ui/ApiTokens/NewTokenDialog';
import { Spinner } from '@/components/ui/widgets/Loaders';
import {
  useApiTokensQuery,
  useDeleteApiTokenMutation
} from '@/queries/apiTokenQueries';
import type { CreateTokenResult } from '@/queries/apiTokenQueries';

export default function ApiTokens() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newToken, setNewToken] = useState<CreateTokenResult | null>(null);
  const { data, isLoading, error, refetch } = useApiTokensQuery();
  const deleteToken = useDeleteApiTokenMutation();

  const tokens = data ?? [];
  const hasTokens = tokens.length > 0;

  return (
    <>
      <Typography className="mb-6 text-foreground font-bold" type="h5">
        API Tokens
      </Typography>

      <Typography className="mb-6 text-foreground">
        API tokens let scripts and notebooks use Fileglancer through the{' '}
        <code>fileglancer</code> Python package. A token acts on your behalf,
        limited to the scopes you grant it. The token is shown only once, when
        you create it.
      </Typography>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner text="Loading API tokens..." />
        </div>
      ) : null}

      {error ? (
        <Card className="p-4 bg-error/10 border border-error/20">
          <Typography className="text-error">
            Failed to load API tokens: {error.message}
          </Typography>
          <FgButton className="mt-2" onClick={() => refetch()} size="sm">
            Retry
          </FgButton>
        </Card>
      ) : null}

      {!isLoading && !error && !hasTokens ? (
        <Card className="mb-6 p-8 text-center dark:border-surface-light">
          <FgIcon
            className="mx-auto h-12 w-12 mb-4"
            color="secondary"
            icon={HiOutlineKey}
          />
          <Typography className="text-foreground font-semibold mb-2">
            No API tokens
          </Typography>
          <Typography className="text-secondary mb-4">
            Create a token to use Fileglancer from Python.
          </Typography>
          <FgButton
            icon={HiOutlinePlus}
            onClick={() => setShowCreateDialog(true)}
            size="sm"
          >
            New Token
          </FgButton>
        </Card>
      ) : null}

      {!isLoading && !error && hasTokens ? (
        <div className="mb-6">
          <div className="mb-4">
            <FgButton
              icon={HiOutlinePlus}
              onClick={() => setShowCreateDialog(true)}
              size="sm"
            >
              New Token
            </FgButton>
          </div>
          <div className="space-y-4" data-testid="api-token-list">
            {tokens.map(token => (
              <ApiTokenCard
                isRevoking={deleteToken.isPending}
                key={token.token_id}
                onRevoke={id => deleteToken.mutate(id)}
                token={token}
              />
            ))}
          </div>
        </div>
      ) : null}

      <CreateTokenDialog
        onTokenCreated={setNewToken}
        setShowDialog={setShowCreateDialog}
        showDialog={showCreateDialog}
      />

      <NewTokenDialog onClose={() => setNewToken(null)} result={newToken} />
    </>
  );
}
