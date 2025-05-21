import React from 'react';
import { Link } from 'react-router-dom';
import {
  Collapse,
  IconButton,
  Typography,
  List
} from '@material-tailwind/react';
import {
  ChevronRightIcon,
  FolderIcon,
  StarIcon as StarOutline
} from '@heroicons/react/24/outline';
import { StarIcon as StarFilled } from '@heroicons/react/24/solid';

import ZoneComponent from './Zone';
import FileSharePathComponent from './FileSharePath';
import {
  FolderFavorite,
  usePreferencesContext
} from '@/contexts/PreferencesContext';
import { useZoneBrowserContext } from '@/contexts/ZoneBrowserContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import useToggleOpenFavorites from '@/hooks/useToggleOpenFavorites';
import { FileSharePath, Zone } from '@/shared.types';
import { makeMapKey } from '@/utils';

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
  const {
    zoneFavorites,
    fileSharePathFavorites,
    folderFavorites,
    folderPreferenceMap,
    pathPreference,
    handleFavoriteChange
  } = usePreferencesContext();

  const { currentDir, fetchAndFormatFilesForDisplay } = useFileBrowserContext();
  const {
    setCurrentNavigationZone,
    currentFileSharePath,
    setCurrentFileSharePath
  } = useZoneBrowserContext();

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
    <div className="w-[calc(100%-1.5rem)] min-h-fit flex flex-col overflow-hidden h-full mt-3 x-short:mt-1 mx-3 pb-1">
      <List className="bg-background">
        <List.Item
          onClick={() => toggleOpenFavorites('all')}
          className="cursor-pointer rounded-none py-3 x-short:py-1 bg-surface/50 hover:!bg-surface-light focus:!bg-surface-light"
        >
          <List.ItemStart>
            <StarFilled className="icon-default x-short:icon-xsmall text-surface-foreground" />
          </List.ItemStart>
          <Typography className="font-semibold text-surface-foreground x-short:text-xs short:text-xs">
            Favorites
          </Typography>
          <List.ItemEnd className="pr-2">
            <ChevronRightIcon
              className={`icon-small x-short:icon-xsmall ${openFavorites['all'] ? 'rotate-90' : ''}`}
            />
          </List.ItemEnd>
        </List.Item>
      </List>
      <div className="overflow-y-auto">
        <Collapse open={openFavorites['all'] ? true : false}>
          <List className="bg-surface-light !py-0 !gap-0">
            {/* Zone favorites */}
            {displayZones.map(zone => {
              return (
                <ZoneComponent
                  zone={zone}
                  openZones={openFavorites}
                  toggleOpenZones={toggleOpenFavorites}
                />
              );
            })}

            {/* File share path favorites */}
            {displayFileSharePaths.map((fsp, index) => {
              return <FileSharePathComponent fsp={fsp} index={index} />;
            })}

            {/* Directory favorites */}
            {displayFolders.map(folderFavorite => {
              const fileSharePath =
                pathPreference[0] === 'linux_path'
                  ? folderFavorite.fsp.linux_path
                  : pathPreference[0] === 'windows_path'
                    ? folderFavorite.fsp.windows_path
                    : pathPreference[0] === 'mac_path'
                      ? folderFavorite.fsp.mac_path
                      : folderFavorite.fsp.linux_path;

              const mapKey = makeMapKey(
                'folder',
                `${folderFavorite.fsp.name}_${folderFavorite.folderPath}`
              ) as string;
              const isFavoriteDir = folderPreferenceMap[mapKey] ? true : false;
              const splitPath = folderFavorite.folderPath.split('/');
              const folderName = splitPath[splitPath.length - 1];

              return (
                <List.Item
                  key={mapKey}
                  onClick={() => {
                    setOpenZones({
                      all: true,
                      [folderFavorite.fsp.zone]: true
                    });
                    setCurrentNavigationZone(folderFavorite.fsp.zone);
                    setCurrentFileSharePath(folderFavorite.fsp);
                    fetchAndFormatFilesForDisplay(
                      `${folderFavorite.fsp.name}?subpath=${folderFavorite.folderPath}`
                    );
                  }}
                  className={`overflow-x-auto x-short:py-0 flex gap-2 items-center justify-between rounded-none cursor-pointer text-foreground hover:bg-primary-light/30 focus:bg-primary-light/30 ${folderFavorite.fsp === currentFileSharePath && folderFavorite.fsp.name === currentDir ? '!bg-primary-light/30' : '!bg-background'}`}
                >
                  <Link
                    to="/browse"
                    className="flex flex-col gap-2 x-short:gap-1 !text-foreground hover:!text-black focus:!text-black hover:dark:!text-white focus:dark:!text-white"
                  >
                    <div className="flex gap-1 items-center">
                      <FolderIcon className="icon-small x-short:icon-xsmall" />
                      <Typography className="text-sm font-medium leading-4 x-short:text-xs">
                        {folderName}
                      </Typography>
                    </div>
                    <Typography className="text-xs">
                      {`${fileSharePath}/${folderFavorite.folderPath}`}
                    </Typography>
                  </Link>
                  <div
                    onClick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <IconButton
                      variant="ghost"
                      isCircular
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        handleFavoriteChange(folderFavorite, 'folder');
                      }}
                    >
                      {isFavoriteDir ? (
                        <StarFilled className="icon-small x-short:icon-xsmall mb-[2px]" />
                      ) : (
                        <StarOutline className="icon-small x-short:icon-xsmall mb-[2px]" />
                      )}
                    </IconButton>
                  </div>
                </List.Item>
              );
            })}
          </List>
        </Collapse>
      </div>
    </div>
  );
}
