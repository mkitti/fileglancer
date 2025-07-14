import { Typography } from '@material-tailwind/react';
import { useTicketContext } from '@/contexts/TicketsContext';
import { Link } from 'react-router';
import { formatDateString } from '@/utils';

export default function Jobs() {
  const { allTickets } = useTicketContext();

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-6xl p-6">
        <Typography variant="h5" className="mb-6 text-foreground font-bold">
          Jobs
        </Typography>
        <div className="rounded-lg shadow bg-background">
          <div className="grid grid-cols-[2fr_3fr_1fr_1fr] gap-4 px-4 py-2 border-b border-surface">
            <Typography variant="small" className="font-bold">
              Target File
            </Typography>
            <Typography variant="small" className="font-bold">
              Description
            </Typography>
            <Typography variant="small" className="font-bold">
              Status
            </Typography>
            <Typography variant="small" className="font-bold">
              Last Updated
            </Typography>
          </div>

          {allTickets?.map(ticket => (
            <div
              key={ticket.key}
              className="grid grid-cols-[2fr_3fr_1fr_1fr] gap-4 px-4 py-3 border-b border-surface hover:bg-surface-light"
            >
              <div className="line-clamp-2">
                <Link
                  to={`/browse/${ticket.fsp_name}/${ticket.path}`}
                  className="text-primary hover:underline truncate block"
                >
                  {ticket.fsp_name}/{ticket.path}
                </Link>
              </div>
              <div className="line-clamp-2 text-sm text-foreground">
                {ticket.description.split('\n')[0]}
              </div>
              <div className="text-sm">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    ticket.status === 'Open'
                      ? 'bg-blue-200 text-blue-800'
                      : ticket.status === 'Pending'
                        ? 'bg-yellow-200 text-yellow-800'
                        : ticket.status === 'Work in progress'
                          ? 'bg-purple-200 text-purple-800'
                          : ticket.status === 'Done'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
              <div className="text-sm text-foreground-muted">
                {formatDateString(ticket.updated)}
              </div>
            </div>
          ))}

          {!allTickets || allTickets.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No jobs found.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
