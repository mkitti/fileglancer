import React from 'react';
import { Collapse, Typography, List } from '@material-tailwind/react';
import { HiChevronRight } from 'react-icons/hi';
import { HiStar } from 'react-icons/hi';

import ZoneComponent from './Zone';
import FileSharePathComponent from './FileSharePath';
import Folder from './Folder';
import {
  FolderFavorite,
  usePreferencesContext
} from '@/contexts/PreferencesContext';
import useToggleOpenFavorites from '@/hooks/useToggleOpenFavorites';
import { FileSharePath, Zone } from '@/shared.types';

type FavoritesBrowserProps = {
  searchQuery: string;
  setOpenZones: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  filteredZoneFavorites: Zone[];
  filteredFileSharePathFavorites: FileSharePath[];
  filteredFolderFavorites: FolderFavorite[];
};

export default function FavoritesBrowser({
  searchQuery,
  setOpenZones,
  filteredZoneFavorites,
  filteredFileSharePathFavorites,
  filteredFolderFavorites
}: FavoritesBrowserProps) {
  const { openFavorites, toggleOpenFavorites } = useToggleOpenFavorites();
  const { zoneFavorites, fileSharePathFavorites, folderFavorites } =
    usePreferencesContext();

  const displayZones =
    filteredZoneFavorites.length > 0 || searchQuery.length > 0
      ? filteredZoneFavorites
      : zoneFavorites;

  const displayFileSharePaths =
    filteredFileSharePathFavorites.length > 0 || searchQuery.length > 0
      ? filteredFileSharePathFavorites
      : fileSharePathFavorites;

  const displayFolders =
    filteredFolderFavorites.length > 0 || searchQuery.length > 0
      ? filteredFolderFavorites
      : folderFavorites;

  return (
    <div className="flex flex-col short:mt-1 mt-2 mx-1">
      <List className="!min-w-50">
        <List.Item
          onClick={() => toggleOpenFavorites('all')}
          className="cursor-pointer rounded-md py-3 short:py-1 hover:!bg-surface-light focus:!bg-surface-light"
        >
          <List.ItemStart>
            <HiStar className="icon-default short:icon-small text-surface-foreground" />
          </List.ItemStart>
          <Typography className="font-bold text-surface-foreground short:text-sm text-base">
            Favorites
          </Typography>
          <List.ItemEnd>
            <HiChevronRight
              className={`icon-default short:icon-small ${openFavorites['all'] ? 'rotate-90' : ''}`}
            />
          </List.ItemEnd>
        </List.Item>
      </List>
      <Collapse className="w-full" open={openFavorites['all'] ? true : false}>
        <List className="!py-0 !gap-0 ">
          {/* Zone favorites */}
          {displayZones.map(zone => {
            return (
              <ZoneComponent
                key={zone.name}
                zone={zone}
                openZones={openFavorites}
                toggleOpenZones={toggleOpenFavorites}
              />
            );
          })}

          {/* File share path favorites */}
          {displayFileSharePaths.map((fsp, index) => {
            return (
              <FileSharePathComponent key={fsp.name} fsp={fsp} index={index} />
            );
          })}

          {/* Directory favorites */}
          {displayFolders.map(folderFavorite => {
            return (
              <Folder
                key={folderFavorite.fsp.name + '-' + folderFavorite.folderPath}
                folderFavorite={folderFavorite}
                setOpenZones={setOpenZones}
              />
            );
          })}
        </List>
      </Collapse>
    </div>
  );
}
