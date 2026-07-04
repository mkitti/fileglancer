import { Typography } from '@material-tailwind/react';
import { HiOutlinePlus } from 'react-icons/hi';

import FgDialog from '@/components/ui/Dialogs/FgDialog';
import FgButton from '@/components/designSystem/atoms/FgButton';
import AppTrustNotice from '@/components/ui/AppsPage/AppTrustNotice';
import { repoLabel } from '@/utils';
import type { AppListing } from '@/shared.types';

interface AddFromCatalogDialogProps {
  readonly listing: AppListing | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly adding: boolean;
}

/**
 * Confirmation for adding a catalog listing to the user's apps. Adding pins and
 * (on launch) runs code from the listing's repository as the user, so this
 * surfaces the source repo and the trust notice at the point of adding — the
 * catalog card/menu "Add" buttons would otherwise install with no warning.
 */
export default function AddFromCatalogDialog({
  listing,
  open,
  onClose,
  onConfirm,
  adding
}: AddFromCatalogDialogProps) {
  return (
    <FgDialog onClose={onClose} open={open}>
      <Typography className="text-foreground font-bold mb-2" type="h6">
        Add to My Apps
      </Typography>
      <Typography className="text-foreground mb-3">
        Add <span className="font-semibold">{listing?.name ?? 'this app'}</span>{' '}
        to your apps?
      </Typography>
      {listing ? (
        <Typography className="text-foreground text-sm mb-3">
          Source: <span className="font-mono">{repoLabel(listing.url)}</span>
          {listing.branch ? (
            <>
              {' '}
              (revision <span className="font-mono">{listing.branch}</span>)
            </>
          ) : null}
        </Typography>
      ) : null}
      <AppTrustNotice className="mb-4" />
      <div className="flex justify-end gap-2">
        <FgButton onClick={onClose} variant="ghost">
          Cancel
        </FgButton>
        <FgButton
          disabled={adding}
          icon={HiOutlinePlus}
          loading={adding}
          loadingText="Adding..."
          onClick={onConfirm}
        >
          Add to My Apps
        </FgButton>
      </div>
    </FgDialog>
  );
}
