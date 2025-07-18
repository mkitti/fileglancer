import { Link } from 'react-router';

import { useZoneAndFspMapContext } from '@/contexts/ZonesAndFspMapContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import type { Ticket } from '@/contexts/TicketsContext';
import {
  formatDateString,
  getPreferredPathForDisplay,
  makeMapKey
} from '@/utils';
import { FileSharePath } from '@/shared.types';

export default function TicketRow({ ticket }: { ticket: Ticket }) {
  const { zonesAndFileSharePathsMap } = useZoneAndFspMapContext();
  const { pathPreference } = usePreferencesContext();

  const ticketFsp = zonesAndFileSharePathsMap[
    makeMapKey('fsp', ticket.fsp_name)
  ] as FileSharePath;
  const displayPath = getPreferredPathForDisplay(
    pathPreference,
    ticketFsp,
    ticket.path
  );

  return (
    <div className="grid grid-cols-[2fr_3fr_1fr_1fr] gap-4 px-4 py-3 border-b border-surface hover:bg-surface-light">
      <div className="line-clamp-2">
        <Link
          to={`/browse/${ticket.fsp_name}/${ticket.path}`}
          className="text-primary hover:underline truncate block"
        >
          {displayPath}
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
  );
}
