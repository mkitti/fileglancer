import React from 'react';
import { Collapse, Typography, List } from '@material-tailwind/react';
import { ChevronRightIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

import { ZonesAndFileSharePaths } from '../../../shared.types';
import { useZoneBrowserContext } from '../../../contexts/ZoneBrowserContext';
import Zone from './Zone';

export default function ZonesBrowser({
  searchQuery,
  openZones,
  toggleOpenZones,
  filteredZonesAndFileSharePaths
}: {
  searchQuery: string;
  openZones: Record<string, boolean>;
  toggleOpenZones: (zone: string) => void;
  filteredZonesAndFileSharePaths: ZonesAndFileSharePaths;
}) {
  const { zonesAndFileSharePaths } = useZoneBrowserContext();

  const displayZones: ZonesAndFileSharePaths =
    Object.keys(filteredZonesAndFileSharePaths).length > 0 ||
    searchQuery.length > 0
      ? filteredZonesAndFileSharePaths
      : zonesAndFileSharePaths;

  return (
    <div className="flex flex-col h-full overflow-hidden w-[calc(100%-1.5rem)] my-3 x-short:my-1 mx-3 bg-surface/50">
      <List className="bg-background py-0">
        <List.Item
          onClick={() => toggleOpenZones('all')}
          className="cursor-pointer rounded-none py-3 x-short:py-1 bg-surface/50 hover:!bg-surface-light focus:!bg-surface-light"
        >
          <List.ItemStart>
            <Squares2X2Icon className="icon-default x-short:icon-xsmall text-surface-foreground" />
          </List.ItemStart>
          <Typography className="x-short:text-xs short:text-xs font-semibold text-surface-foreground">
            Zones
          </Typography>
          <List.ItemEnd className="pr-2">
            <ChevronRightIcon
              className={`icon-small x-short:icon-xsmall ${openZones['all'] ? 'rotate-90' : ''}`}
            />
          </List.ItemEnd>
        </List.Item>
      </List>
      <Collapse
        open={openZones['all'] ? true : false}
        className="!overflow-y-auto overflow-x-hidden flex-grow"
      >
        <List className="!overflow-y-auto h-full py-0 gap-0 pr-2 bg-background">
          {Object.entries(displayZones).map(([zoneName, fileSharePaths]) => {
            return (
              <Zone
                zoneName={zoneName}
                fileSharePaths={fileSharePaths}
                openZones={openZones}
                toggleOpenZones={toggleOpenZones}
              />
            );
          })}
        </List>
      </Collapse>
    </div>
  );
}
