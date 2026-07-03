import EditListingDialog from '@/components/ui/AppsPage/EditListingDialog';
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
    <EditListingDialog
      listing={actions.editTarget}
      onClose={actions.closeEdit}
      onSave={actions.saveEdit}
      open={actions.editTarget !== null}
      saving={actions.saving}
    />
  );
}
