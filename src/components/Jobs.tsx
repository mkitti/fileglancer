import { Typography } from '@material-tailwind/react';

import TicketRow from '@/components/ui/JobsPage/TicketRow';
import { useTicketContext } from '@/contexts/TicketsContext';

export default function Jobs() {
  const { allTickets } = useTicketContext();

  return (
    <>
      <Typography type="h5" className="mb-6 text-foreground font-bold">
        Jobs
      </Typography>
      <div className="rounded-lg shadow bg-background">
        <div className="grid grid-cols-[2fr_3fr_1fr_1fr] gap-4 px-4 py-2 border-b border-surface">
          <Typography className="font-bold">Target File</Typography>
          <Typography className="font-bold">Description</Typography>
          <Typography className="font-bold">Status</Typography>
          <Typography className="font-bold">Last Updated</Typography>
        </div>

        {allTickets?.map(ticket => (
          <TicketRow key={ticket.key} ticket={ticket} />
        ))}

        {!allTickets || allTickets.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No jobs found.
          </div>
        ) : null}
      </div>
    </>
  );
}
