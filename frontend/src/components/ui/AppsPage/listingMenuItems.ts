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
      action: l => void actions.add(l),
      shouldShow: !alreadyAdded
    },
    { name: 'View', action: l => actions.view(l) },
    {
      name: 'View in My Apps',
      action: () => installedApp && actions.viewInMyApps(installedApp),
      shouldShow: alreadyAdded
    },
    {
      name: 'Unshare',
      action: l => void actions.unshare(l),
      color: 'text-error',
      shouldShow: canManage
    }
  ];
}
