import { Collapse, Typography, List } from '@material-tailwind/react';
import { HiChevronRight } from 'react-icons/hi';
import { HiSquares2X2 } from 'react-icons/hi2';

import { ZonesAndFileSharePathsMap } from '@/shared.types';
import { useZoneAndFspMapContext } from '@/contexts/ZonesAndFspMapContext';
import useOpenZones from '@/hooks/useOpenZones';
import Zone from './Zone';

export default function ZonesBrowser({
  searchQuery,
  filteredZonesMap
}: {
  searchQuery: string;
  filteredZonesMap: ZonesAndFileSharePathsMap;
}) {
  const { zonesAndFileSharePathsMap } = useZoneAndFspMapContext();
  const { openZones, toggleOpenZones } = useOpenZones();

  const displayZones: ZonesAndFileSharePathsMap =
    Object.keys(filteredZonesMap).length > 0 || searchQuery.length > 0
      ? filteredZonesMap
      : zonesAndFileSharePathsMap;

  return (
    <div className="flex flex-col my-1 mx-1">
      <List className="!min-w-20">
        <List.Item
          onClick={() => toggleOpenZones('all')}
          className="cursor-pointer rounded-md py-2 short:py-1 hover:!bg-surface-light focus:!bg-surface-light"
        >
          <List.ItemStart>
            <HiSquares2X2 className="icon-default short:icon-small text-surface-foreground" />
          </List.ItemStart>
          <Typography className="font-bold text-surface-foreground short:text-sm text-base">
            Zones
          </Typography>
          <List.ItemEnd>
            <HiChevronRight
              className={`icon-default short:icon-small ${openZones['all'] ? 'rotate-90' : ''}`}
            />
          </List.ItemEnd>
        </List.Item>
      </List>
      <Collapse
        open={openZones['all'] ? true : false}
        className="overflow-x-hidden flex-grow w-full"
      >
        <List className="h-full py-0 gap-0 bg-background">
          {Object.entries(displayZones).map(([key, value]) => {
            if (key.startsWith('zone') && 'fileSharePaths' in value) {
              return (
                <Zone
                  key={key}
                  zone={value}
                  openZones={openZones}
                  toggleOpenZones={toggleOpenZones}
                />
              );
            }
          })}
        </List>
      </Collapse>
    </div>
  );
}
