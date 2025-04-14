import React from 'react';
import { Card, Input } from '@material-tailwind/react';
import { FunnelIcon } from '@heroicons/react/24/outline';

import SidebarFavorites from './SidebarFavorites';
import SidebarZones from './SidebarZones';
import { useZoneBrowserContext } from '../../contexts/ZoneBrowserContext';
import useZoneFilter from '../../hooks/useZoneFilter';
import useOpenZones from '../../hooks/useOpenZones';

export default function FileSidebar() {
  const { openZones, setOpenZones, toggleOpenZones } = useOpenZones();
  const { fileSharePaths } = useZoneBrowserContext();

  const { searchQuery, handleSearchChange } = useZoneFilter();
  console.log('open zones:', openZones);
  return (
    <Card className="max-w-[280px] max-h-full overflow-hidden rounded-none bg-surface shadow-lg flex flex-col">
      <div className="w-[calc(100%-1.5rem)] mx-3 mt-3">
        <Input
          className="bg-background text-foreground"
          type="search"
          placeholder="Type to filter zones"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleSearchChange(e, fileSharePaths)
          }
        >
          <Input.Icon>
            <FunnelIcon className="h-full w-full" />
          </Input.Icon>
        </Input>
      </div>
      <div className="flex-1">
        <SidebarFavorites
          searchQuery={searchQuery}
          setOpenZones={setOpenZones}
        />
        <SidebarZones
          searchQuery={searchQuery}
          openZones={openZones}
          toggleOpenZones={toggleOpenZones}
        />
      </div>
    </Card>
  );
}
