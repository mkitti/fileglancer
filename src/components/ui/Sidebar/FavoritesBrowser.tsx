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

import Zone from './Zone';
import FileSharePathComponent from './FileSharePath';
import { usePreferencesContext } from '../../../contexts/PreferencesContext';
import { useZoneBrowserContext } from '../../../contexts/ZoneBrowserContext';
import { useFileBrowserContext } from '../../../contexts/FileBrowserContext';
import useToggleOpenFavorites from '../../../hooks/useToggleOpenFavorites';
// import {
//   FileSharePath
//   //   ZonesAndFileSharePathsMap
// } from '../../../shared.types';
import { makeMapKey } from '../../../utils';

type FavoritesBrowserProps = {
  setOpenZones: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};

export default function FavoritesBrowser({
  setOpenZones
}: FavoritesBrowserProps) {
  const { openFavorites, toggleOpenFavorites } = useToggleOpenFavorites();
  const {
    zoneFavorites,
    fileSharePathFavorites,
    folderFavorites,
    folderPreferenceKeys,
    pathPreference,
    handleFavoriteChange
  } = usePreferencesContext();

  const { currentDir, fetchAndFormatFilesForDisplay } = useFileBrowserContext();
  const {
    setCurrentNavigationZone,
    currentFileSharePath,
    setCurrentFileSharePath
  } = useZoneBrowserContext();

  const displayZones = zoneFavorites;
  // filteredZoneFavorites.length > 0 || searchQuery.length > 0
  //   ? filteredZoneFavorites
  //   : zoneFavorites;

  const displayFileSharePaths = fileSharePathFavorites;
  //     filteredFileSharePathFavorites.length > 0 || searchQuery.length > 0
  //       ? filteredFileSharePathFavorites
  //       : fileSharePathFavorites;

  const displayFolders = folderFavorites;
  //     filteredDirectoryFavorites.length > 0 || searchQuery.length > 0
  //       ? filteredDirectoryFavorites
  //       : folderFavorites;

  return (
    <div className="w-[calc(100%-1.5rem)] min-h-fit flex flex-col overflow-hidden h-full mt-3 mx-3 pb-1">
      <List className="bg-background">
        <List.Item
          onClick={() => toggleOpenFavorites('all')}
          className="cursor-pointer rounded-none py-3 bg-surface/50 hover:!bg-surface-light focus:!bg-surface-light"
        >
          <List.ItemStart>
            <StarFilled className="h-5 w-5 text-surface-foreground" />
          </List.ItemStart>
          <Typography className="font-semibold text-surface-foreground">
            Favorites
          </Typography>
          <List.ItemEnd className="pr-2">
            <ChevronRightIcon
              className={`h-4 w-4 ${openFavorites['all'] ? 'rotate-90' : ''}`}
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
                <Zone
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
              );
              const isFavoriteDir = folderPreferenceKeys.includes(mapKey)
                ? true
                : false;
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
                  className={`flex gap-2 items-center justify-between rounded-none cursor-pointer text-foreground hover:bg-primary-light/30 focus:bg-primary-light/30 ${folderFavorite.fsp.name === currentFileSharePath?.name && folderName === currentDir ? '!bg-primary-light/30' : '!bg-background'}`}
                >
                  <Link
                    to="/files"
                    className="flex flex-col gap-2 !text-foreground hover:!text-black focus:!text-black hover:dark:!text-white focus:dark:!text-white"
                  >
                    <div className="flex gap-1 items-center">
                      <FolderIcon className="h-4 w-4" />
                      <Typography className="text-sm font-medium leading-4">
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
                        <StarFilled className="h-4 w-4 mb-[2px]" />
                      ) : (
                        <StarOutline className="h-4 w-4 mb-[2px]" />
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
