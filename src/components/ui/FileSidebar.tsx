import React from 'react';
import { Card, Input } from '@material-tailwind/react';
import { FunnelIcon } from '@heroicons/react/24/outline';

import SidebarFavorites from './SidebarFavorites';
import SidebarZones from './SidebarZones';
import useSearchFilter from '../../hooks/useSearchFilter';
import useOpenZones from '../../hooks/useOpenZones';

export default function FileSidebar() {
  const { openZones, setOpenZones, toggleOpenZones } = useOpenZones();
  const {
    searchQuery,
    handleSearchChange,
    filteredFileSharePaths,
    filteredZoneFavorites,
    filteredFileSharePathFavorites,
    filteredDirectoryFavorites
  } = useSearchFilter();
  return (
    <Card className="max-w-[280px] max-h-full overflow-hidden rounded-none bg-surface shadow-lg flex flex-col">
      <div className="w-[calc(100%-1.5rem)] mx-3 mt-3">
        <Input
          className="bg-background text-foreground"
          type="search"
          placeholder="Type to filter zones"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleSearchChange(e)
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
          filteredZoneFavorites={filteredZoneFavorites}
          filteredFileSharePathFavorites={filteredFileSharePathFavorites}
          filteredDirectoryFavorites={filteredDirectoryFavorites}
        />
        <SidebarZones
          searchQuery={searchQuery}
          openZones={openZones}
          toggleOpenZones={toggleOpenZones}
          filteredFileSharePaths={filteredFileSharePaths}
        />
      </div>
    </Card>
  );
}
