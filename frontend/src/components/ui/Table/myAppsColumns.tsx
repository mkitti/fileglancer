import type { MouseEvent } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import FgExternalLink from '@/components/designSystem/atoms/FgExternalLink';
import FgLink from '@/components/designSystem/atoms/FgLink';
import CardActionsMenu from '@/components/ui/Menus/CardActionsMenu';
import FgTooltip from '@/components/ui/widgets/FgTooltip';
import SharedBadge from '@/components/ui/AppsPage/SharedBadge';
import {
  buildAppMenuItems,
  isAppShared
} from '@/components/ui/AppsPage/appMenuItems';
import { appRevision, buildAppDetailPath, parseGithubUrl } from '@/utils';
import type { AppActions } from '@/hooks/useAppActions';
import type { UserApp } from '@/shared.types';

/** "org/repo" label for an app's GitHub URL; falls back to the raw URL. */
function repoLabel(app: UserApp): string {
  try {
    const { owner, repo } = parseGithubUrl(app.url);
    return `${owner}/${repo}`;
  } catch {
    return app.url;
  }
}

type OnCellContextMenu = (
  e: MouseEvent<HTMLElement>,
  data: { value: string }
) => void;

function NameCell({
  app,
  onContextMenu
}: {
  readonly app: UserApp;
  readonly onContextMenu?: OnCellContextMenu;
}) {
  let detailPath: string | null = null;
  try {
    detailPath = buildAppDetailPath(app.url, app.manifest_path);
  } catch {
    detailPath = null;
  }
  return (
    <div
      className="flex items-center gap-2 truncate w-full h-full"
      onContextMenu={e => {
        e.preventDefault();
        onContextMenu?.(e, { value: app.name });
      }}
    >
      {detailPath ? (
        <FgLink className="truncate" to={detailPath}>
          {app.name}
        </FgLink>
      ) : (
        <span className="truncate">{app.name}</span>
      )}
    </div>
  );
}

export function createMyAppsColumns(actions: AppActions): ColumnDef<UserApp>[] {
  return [
    {
      id: 'repository',
      accessorFn: repoLabel,
      header: 'Repository',
      cell: ({ getValue, row, table }) => {
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
            {/* No icon: the inline-flex icon layout defeats text truncation */}
            <FgExternalLink
              className="truncate min-w-0"
              href={row.original.url}
              showIcon={false}
              size="sm"
            >
              {value}
            </FgExternalLink>
          </div>
        );
      },
      enableSorting: true
    },
    {
      id: 'revision',
      accessorFn: row => appRevision(row.url, row.branch) ?? '',
      header: 'Revision',
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
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row, table }) => (
        <NameCell
          app={row.original}
          onContextMenu={table.options.meta?.onCellContextMenu}
        />
      ),
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
      id: 'status',
      accessorFn: row => (isAppShared(row) ? 'Shared' : ''),
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center h-full">
          {isAppShared(row.original) ? <SharedBadge /> : null}
        </div>
      ),
      enableSorting: true
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div className="flex items-center justify-end h-full">
            <CardActionsMenu<UserApp>
              actionProps={app}
              menuItems={buildAppMenuItems(app, actions)}
            />
          </div>
        );
      },
      enableSorting: false
    }
  ];
}
