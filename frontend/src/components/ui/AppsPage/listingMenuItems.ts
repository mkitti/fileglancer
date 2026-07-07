import type { MenuItem } from '@/components/ui/Menus/FgMenuItems';
import type { ListingActions } from '@/hooks/useListingActions';
import type { AppListing, UserApp } from '@/shared.types';

/**
 * Actions menu items for a catalog listing, shared by the catalog card and
 * table views.
 */
export function buildListingMenuItems(
  listing: AppListing,
  installedApp: UserApp | undefined,
  canManage: boolean,
  actions: ListingActions
): MenuItem<AppListing>[] {
  const alreadyAdded = installedApp !== undefined;
  return [
    {
      name: 'Add to my apps',
      action: l => actions.requestAdd(l),
      shouldShow: !alreadyAdded
    },
    { name: 'View', action: l => actions.view(l) },
    {
      name: 'View in My Apps',
      action: () => installedApp && actions.viewInMyApps(installedApp),
      shouldShow: alreadyAdded
    },
    {
      name: 'Edit',
      action: l => actions.requestEdit(l),
      shouldShow: canManage
    },
    {
      name: 'Unshare',
      action: l => actions.requestUnshare(l),
      color: 'text-error',
      shouldShow: canManage
    }
  ];
}
