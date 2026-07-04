import EditListingDialog from '@/components/ui/AppsPage/EditListingDialog';
import UnshareDialog from '@/components/ui/AppsPage/UnshareDialog';
import type { ListingActions } from '@/hooks/useListingActions';

/**
 * The dialogs backing the two-step listing actions from `useListingActions`.
 * Render once per page that uses the hook.
 */
export default function ListingActionDialogs({
  actions
}: {
  readonly actions: ListingActions;
}) {
  return (
    <>
      <EditListingDialog
        listing={actions.editTarget}
        onClose={actions.closeEdit}
        onSave={actions.saveEdit}
        open={actions.editTarget !== null}
        saving={actions.saving}
      />
      <UnshareDialog
        name={actions.unshareTarget?.name}
        onClose={actions.closeUnshare}
        onConfirm={actions.confirmUnshare}
        open={actions.unshareTarget !== null}
        unsharing={actions.unsharingId !== null}
      />
    </>
  );
}
