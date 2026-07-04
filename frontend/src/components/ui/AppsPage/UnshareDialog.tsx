import { Typography } from '@material-tailwind/react';
import { FaUsersSlash } from 'react-icons/fa6';

import FgDialog from '@/components/ui/Dialogs/FgDialog';
import FgButton from '@/components/designSystem/atoms/FgButton';

interface UnshareDialogProps {
  readonly name?: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly unsharing: boolean;
}

/**
 * Confirmation for removing a catalog listing. Unsharing affects other users
 * (they can no longer see or add the app) and discards the listing's curated
 * name/description, so it warrants a confirm rather than a one-click action.
 */
export default function UnshareDialog({
  name,
  open,
  onClose,
  onConfirm,
  unsharing
}: UnshareDialogProps) {
  return (
    <FgDialog onClose={onClose} open={open}>
      <Typography className="text-foreground font-bold mb-2" type="h6">
        Unshare from Catalog
      </Typography>
      <Typography className="text-foreground mb-4">
        Remove <span className="font-semibold">{name ?? 'this app'}</span> from
        the shared catalog? Other users will no longer see or be able to add it,
        and its catalog name and description will be discarded. Your own copy is
        unaffected.
      </Typography>
      <div className="flex justify-end gap-2">
        <FgButton onClick={onClose} variant="ghost">
          Keep shared
        </FgButton>
        <FgButton
          color="error"
          disabled={unsharing}
          icon={FaUsersSlash}
          loading={unsharing}
          loadingText="Unsharing..."
          onClick={onConfirm}
        >
          Unshare
        </FgButton>
      </div>
    </FgDialog>
  );
}
