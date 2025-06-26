import React from 'react';
import { Card, Input } from '@material-tailwind/react';
import { FunnelIcon } from '@heroicons/react/24/outline';

import FavoritesBrowser from './FavoritesBrowser';
import ZonesBrowser from './ZonesBrowser';
import useSearchFilter from '@/hooks/useSearchFilter';

export default function Sidebar() {
  const {
    searchQuery,
    handleSearchChange,
    filteredZonesMap,
    filteredZoneFavorites,
    filteredFileSharePathFavorites,
    filteredFolderFavorites
  } = useSearchFilter();
  return (
    <Card className="min-w-full h-full overflow-hidden rounded-none bg-surface shadow-lg flex flex-col px-3">
      <div className="my-3 short:my-1">
        <Input
          className="bg-background text-foreground short:text-xs"
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
      <div className="flex flex-col overflow-y-scroll flex-grow mb-3 short:gap-1 w-full border border-surface rounded-md py-2 px-2.5 shadow-sm bg-background sidebar-scroll">
        <FavoritesBrowser
          searchQuery={searchQuery}
          filteredZoneFavorites={filteredZoneFavorites}
          filteredFileSharePathFavorites={filteredFileSharePathFavorites}
          filteredFolderFavorites={filteredFolderFavorites}
        />
        <ZonesBrowser
          searchQuery={searchQuery}
          filteredZonesMap={filteredZonesMap}
        />
      </div>
    </Card>
  );
}
