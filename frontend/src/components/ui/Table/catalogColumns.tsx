import type { ColumnDef } from '@tanstack/react-table';

import FgLink from '@/components/designSystem/atoms/FgLink';
import CardActionsMenu from '@/components/ui/Menus/CardActionsMenu';
import FgTooltip from '@/components/ui/widgets/FgTooltip';
import InYourAppsBadge from '@/components/ui/AppsPage/InYourAppsBadge';
import { buildListingMenuItems } from '@/components/ui/AppsPage/listingMenuItems';
import { buildListingDetailPath } from '@/hooks/useListingActions';
import type { ListingActions } from '@/hooks/useListingActions';
import { formatDateString } from '@/utils';
import type { AppListing, UserApp } from '@/shared.types';

export function createCatalogColumns(
  actions: ListingActions,
  getInstalledApp: (listing: AppListing) => UserApp | undefined,
  currentUsername: string | undefined
): ColumnDef<AppListing>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue, row, table }) => {
        const value = getValue() as string;
        const onContextMenu = table.options.meta?.onCellContextMenu;
        return (
          <div
            className="flex items-center gap-2 truncate w-full h-full"
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu?.(e, { value });
            }}
          >
            <FgLink
              className="truncate"
              to={buildListingDetailPath(row.original.id)}
            >
              {value}
            </FgLink>
          </div>
        );
      },
      enableSorting: true
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue, table }) => {
        const value = (getValue() as string | undefined) ?? '';
        const onContextMenu = table.options.meta?.onCellContextMenu;
        return (
          <div
            className="flex items-center truncate w-full h-full"
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu?.(e, { value });
            }}
          >
            {value ? (
              <FgTooltip label={value} triggerClasses="max-w-full truncate">
                <span className="truncate text-sm">{value}</span>
              </FgTooltip>
            ) : null}
          </div>
        );
      },
      enableSorting: true
    },
    {
      accessorKey: 'owner_username',
      header: 'Sharer',
      cell: ({ getValue, table }) => {
        const value = getValue() as string;
        const onContextMenu = table.options.meta?.onCellContextMenu;
        return (
          <div
            className="flex items-center truncate w-full h-full"
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu?.(e, { value });
            }}
          >
            <span className="truncate text-sm">{value}</span>
          </div>
        );
      },
      enableSorting: true
    },
    {
      accessorKey: 'published_at',
      header: 'Shared on',
      cell: ({ getValue, table }) => {
        const formattedDate = formatDateString(getValue() as string);
        const onContextMenu = table.options.meta?.onCellContextMenu;
        return (
          <div
            className="flex items-center truncate w-full h-full"
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu?.(e, { value: formattedDate });
            }}
          >
            <span className="truncate text-sm">{formattedDate}</span>
          </div>
        );
      },
      enableSorting: true
    },
    {
      id: 'status',
      accessorFn: row => (getInstalledApp(row) ? 'In your apps' : ''),
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center h-full">
          {getInstalledApp(row.original) ? <InYourAppsBadge /> : null}
        </div>
      ),
      enableSorting: true
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const listing = row.original;
        const canManage =
          currentUsername !== undefined &&
          currentUsername === listing.owner_username;
        return (
          <div className="flex items-center justify-end h-full">
            <CardActionsMenu<AppListing>
              actionProps={listing}
              menuItems={buildListingMenuItems(
                listing,
                getInstalledApp(listing),
                canManage,
                actions
              )}
            />
          </div>
        );
      },
      enableSorting: false
    }
  ];
}
