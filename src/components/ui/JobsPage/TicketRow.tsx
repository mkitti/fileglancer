import { Typography } from '@material-tailwind/react';

import { useZoneAndFspMapContext } from '@/contexts/ZonesAndFspMapContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import type { Ticket } from '@/contexts/TicketsContext';
import {
  formatDateString,
  getPreferredPathForDisplay,
  makeMapKey
} from '@/utils';
import { FileSharePath } from '@/shared.types';
import { FgStyledLink } from '../widgets/FgLink';

export default function TicketRow({ item }: { item: Ticket }) {
  const { zonesAndFileSharePathsMap } = useZoneAndFspMapContext();
  const { pathPreference } = usePreferencesContext();

  const itemFsp = zonesAndFileSharePathsMap[
    makeMapKey('fsp', item.fsp_name)
  ] as FileSharePath;
  const displayPath = getPreferredPathForDisplay(
    pathPreference,
    itemFsp,
    item.path
  );

  return (
    <>
      <div className="line-clamp-2 max-w-full">
        <FgStyledLink to={`/browse/${item.fsp_name}/${item.path}`}>
          {displayPath}
        </FgStyledLink>
      </div>
      <Typography className="line-clamp-2 text-foreground max-w-full">
        {item.description}
      </Typography>
      <div className="text-sm">
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            item.status === 'Open'
              ? 'bg-blue-200 text-blue-800'
              : item.status === 'Pending'
                ? 'bg-yellow-200 text-yellow-800'
                : item.status === 'Work in progress'
                  ? 'bg-purple-200 text-purple-800'
                  : item.status === 'Done'
                    ? 'bg-green-200 text-green-800'
                    : 'bg-gray-200 text-gray-800'
          }`}
        >
          {item.status}
        </span>
      </div>
      <div className="text-sm text-foreground-muted">
        {formatDateString(item.updated)}
      </div>
    </>
  );
}
