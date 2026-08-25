import { Card, Typography } from '@material-tailwind/react';
import { HiOutlineTrash } from 'react-icons/hi';

import FgButton from '@/components/designSystem/atoms/FgButton';
import { formatDateOnly } from '@/utils';
import type { ApiTokenInfo } from '@/queries/apiTokenQueries';

export default function ApiTokenCard({
  token,
  onRevoke,
  isRevoking
}: {
  readonly token: ApiTokenInfo;
  readonly onRevoke: (token: ApiTokenInfo) => void;
  readonly isRevoking: boolean;
}) {
  const isExpired = new Date(token.expires_at) < new Date();

  return (
    <Card className="p-4 dark:border-surface-light">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography className="text-foreground font-semibold">
            {token.name}
            {isExpired ? (
              <span className="ml-2 text-error text-sm font-normal">
                Expired
              </span>
            ) : null}
          </Typography>
          <Typography className="text-secondary text-sm">
            {token.scopes.join(', ')}
          </Typography>
          <Typography className="text-secondary text-sm">
            Created {formatDateOnly(token.created_at)} &middot; Expires{' '}
            {formatDateOnly(token.expires_at)} &middot; Last used{' '}
            {token.last_used_at ? formatDateOnly(token.last_used_at) : 'Never'}
          </Typography>
        </div>
        <FgButton
          disabled={isRevoking}
          icon={HiOutlineTrash}
          onClick={() => onRevoke(token)}
          size="sm"
        >
          Revoke
        </FgButton>
      </div>
    </Card>
  );
}
