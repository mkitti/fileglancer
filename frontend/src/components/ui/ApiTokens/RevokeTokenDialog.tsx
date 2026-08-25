import { Typography } from '@material-tailwind/react';
import { HiOutlineTrash } from 'react-icons/hi';

import FgButton from '@/components/designSystem/atoms/FgButton';
import FgDialog from '@/components/ui/Dialogs/FgDialog';

type RevokeTokenDialogProps = {
  readonly open: boolean;
  readonly tokenName: string;
  readonly isPending: boolean;
  /** Message from a failed revoke, so a retry is not blind. */
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
};

export default function RevokeTokenDialog({
  open,
  tokenName,
  isPending,
  error,
  onClose,
  onConfirm
}: RevokeTokenDialogProps) {
  return (
    <FgDialog onClose={onClose} open={open}>
      <Typography className="text-foreground font-bold mb-2" type="h6">
        Revoke API Token
      </Typography>
      <Typography className="text-foreground mb-4">
        Are you sure you want to revoke <strong>{tokenName}</strong>? Any script
        or notebook using this token will stop working immediately. This cannot
        be undone.
      </Typography>
      {error ? (
        <Typography className="text-error text-sm mb-4">
          Could not revoke this token: {error}
        </Typography>
      ) : null}

      <div className="flex justify-end gap-2">
        <FgButton disabled={isPending} onClick={onClose} variant="ghost">
          Keep token
        </FgButton>
        <FgButton
          color="error"
          disabled={isPending}
          icon={HiOutlineTrash}
          loading={isPending}
          loadingText="Revoking..."
          onClick={onConfirm}
        >
          Revoke Token
        </FgButton>
      </div>
    </FgDialog>
  );
}
