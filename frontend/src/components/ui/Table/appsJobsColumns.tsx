import type { ColumnDef } from '@tanstack/react-table';

import FgLink from '@/components/designSystem/atoms/FgLink';
import CardActionsMenu from '@/components/ui/Menus/CardActionsMenu';
import JobStatusBadge from '@/components/ui/AppsPage/JobStatusBadge';
import { formatDateString } from '@/utils';
import { formatDuration } from '@/utils/jobDisplay';
import type { MenuItem } from '@/components/ui/Menus/FgMenuItems';
import { isActiveJobStatus } from '@/shared.types';
import type { Job } from '@/shared.types';

type JobActionCallbacks = {
  onViewDetail: (jobId: number) => void;
  onRelaunch: (job: Job) => void;
  onRename: (job: Job) => void;
  onCancel: (job: Job) => void;
  onDelete: (jobId: number) => void;
};

type JobRowActionProps = JobActionCallbacks & {
  job: Job;
};

export function createAppsJobsColumns(
  callbacks: JobActionCallbacks
): ColumnDef<Job>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row, table }) => {
        const job = row.original;
        const label = job.name || `${job.app_name} - ${job.entry_point_name}`;
        const onContextMenu = table.options.meta?.onCellContextMenu;
        return (
          <div
            className="flex items-center truncate w-full h-full"
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu?.(e, { value: label });
            }}
          >
            <FgLink className="truncate text-left" to={`/apps/jobs/${job.id}`}>
              {label}
            </FgLink>
          </div>
        );
      },
      enableSorting: true
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as Job['status'];
        return (
          <div className="flex items-center gap-2 h-full">
            <JobStatusBadge status={status} />
          </div>
        );
      },
      enableSorting: true
    },
    {
      accessorKey: 'created_at',
      header: 'Submitted',
      cell: ({ getValue, table }) => {
        const value = getValue() as string;
        const formatted = formatDateString(value);
        const onContextMenu = table.options.meta?.onCellContextMenu;
        return (
          <div
            className="flex items-center truncate w-full h-full"
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu?.(e, { value: formatted });
            }}
          >
            <span className="truncate text-sm">{formatted}</span>
          </div>
        );
      },
      enableSorting: true
    },
    {
      id: 'duration',
      header: 'Duration',
      cell: ({ row }) => {
        const duration =
          formatDuration(row.original.started_at, row.original.finished_at) ??
          '-';
        return (
          <div className="flex items-center h-full">
            <span className="text-sm">{duration}</span>
          </div>
        );
      },
      enableSorting: false
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const job = row.original;
        const canCancel = isActiveJobStatus(job.status);

        const isService = job.entry_point_type === 'service';
        const menuItems: MenuItem<JobRowActionProps>[] = [
          {
            name: 'View Details',
            action: props => props.onViewDetail(props.job.id)
          },
          {
            name: 'Relaunch',
            action: props => props.onRelaunch(props.job)
          },
          {
            name: 'Rename',
            action: props => props.onRename(props.job)
          },
          {
            name: isService ? 'Stop Service' : 'Cancel',
            action: props => props.onCancel(props.job),
            shouldShow: canCancel
          },
          {
            name: 'Delete',
            color: 'text-error',
            action: props => props.onDelete(props.job.id),
            shouldShow: !canCancel
          }
        ];

        const actionProps: JobRowActionProps = {
          job,
          ...callbacks
        };

        return (
          <div className="flex items-center justify-end h-full">
            <CardActionsMenu<JobRowActionProps>
              actionProps={actionProps}
              menuItems={menuItems}
            />
          </div>
        );
      },
      enableSorting: false
    }
  ];
}
