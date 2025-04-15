import React from 'react';
import { Link } from 'react-router-dom';
import {
  Collapse,
  Typography,
  List,
  IconButton
} from '@material-tailwind/react';
import {
  ChevronRightIcon,
  RectangleStackIcon,
  Squares2X2Icon,
  StarIcon as StarOutline
} from '@heroicons/react/24/outline';
import { StarIcon as StarFilled } from '@heroicons/react/24/solid';

import { FileSharePaths } from '../../shared.types';
import { usePreferencesContext } from '../../contexts/PreferencesContext';
import { useZoneBrowserContext } from '../../contexts/ZoneBrowserContext';

export default function SidebarZones({
  searchQuery,
  openZones,
  toggleOpenZones,
  filteredFileSharePaths,
  handleFileSharePathClick
}: {
  searchQuery: string;
  openZones: Record<string, boolean>;
  toggleOpenZones: (zone: string) => void;
  filteredFileSharePaths: FileSharePaths;
  handleFileSharePathClick: (zone: string, fileSharePath: string) => void;
}) {
  const {
    zoneFavorites,
    fileSharePathFavorites,
    pathPreference,
    handleFavoriteChange
  } = usePreferencesContext();
  const { fileSharePaths } = useZoneBrowserContext();

  const displayPaths =
    Object.keys(filteredFileSharePaths).length > 0 || searchQuery.length > 0
      ? filteredFileSharePaths
      : fileSharePaths;

  const sortByFavorites = (displayPaths: FileSharePaths) => {
    // Sort the zones based on favorites
    const sortedPaths = Object.keys(displayPaths)
      .sort((a, b) => {
        const aIsFavorite = zoneFavorites.includes(a);
        const bIsFavorite = zoneFavorites.includes(b);
        if (aIsFavorite && !bIsFavorite) {
          return -1;
        }
        if (!aIsFavorite && bIsFavorite) {
          return 1;
        }
        return a.localeCompare(b);
      })
      .reduce((acc, key) => {
        // Sort the items within each zone
        acc[key] = [...displayPaths[key]].sort((a, b) => {
          // Check if linux_path of adjacent items are favorite paths
          const aIsFavorite = fileSharePathFavorites.includes(a);
          const bIsFavorite = fileSharePathFavorites.includes(b);

          if (aIsFavorite && !bIsFavorite) {
            return -1;
          }
          if (!aIsFavorite && bIsFavorite) {
            return 1;
          }
          return a.name.localeCompare(b.name);
        });
        return acc;
      }, {} as FileSharePaths);
    return sortedPaths;
  };

  // Sort displayPaths so zones that are favorites are at the top
  const sortedDisplayPaths: FileSharePaths = zoneFavorites
    ? sortByFavorites(displayPaths)
    : displayPaths;

  return (
    <div className="flex flex-col h-full overflow-hidden w-[calc(100%-1.5rem)] my-3 mx-3 bg-surface/50">
      <List className="bg-background py-0">
        <List.Item
          onClick={() => toggleOpenZones('all')}
          className="cursor-pointer rounded-none py-3 bg-surface/50 hover:!bg-surface-light focus:!bg-surface-light"
        >
          <List.ItemStart>
            <Squares2X2Icon className="h-5 w-5 text-surface-foreground" />
          </List.ItemStart>
          <Typography className="font-semibold text-surface-foreground">
            Zones
          </Typography>
          <List.ItemEnd className="pr-2">
            <ChevronRightIcon
              className={`h-4 w-4 ${openZones['all'] ? 'rotate-90' : ''}`}
            />
          </List.ItemEnd>
        </List.Item>
      </List>
      <Collapse
        open={openZones['all'] ? true : false}
        className="!overflow-y-auto overflow-x-hidden flex-grow"
      >
        <List className="!overflow-y-auto h-full py-0 gap-0 pr-2 bg-background">
          {Object.entries(sortedDisplayPaths).map(
            ([zone, pathItems], index) => {
              const isOpen = openZones[zone] || false;
              const isFavoriteZone = zoneFavorites.includes(zone)
                ? true
                : false;
              return (
                <React.Fragment key={zone}>
                  <List.Item
                    onClick={() => toggleOpenZones(zone)}
                    className="cursor-pointer rounded-none py-1 flex-shrink-0 hover:!bg-primary-light/30 focus:!bg-primary-light/30  !bg-background"
                  >
                    <List.ItemStart>
                      <Squares2X2Icon className="h-4 w-4" />
                    </List.ItemStart>
                    <div className="flex-1 min-w-0 flex items-center gap-1">
                      <Typography className="text-sm">{zone}</Typography>
                      <div
                        className="flex items-center"
                        onClick={e => e.stopPropagation()}
                      >
                        <IconButton
                          variant="ghost"
                          isCircular
                          onClick={() => handleFavoriteChange(zone, 'zone')}
                        >
                          {isFavoriteZone ? (
                            <StarFilled className="h-4 w-4 mb-[2px]" />
                          ) : (
                            <StarOutline className="h-4 w-4 mb-[2px]" />
                          )}
                        </IconButton>
                      </div>
                    </div>
                    <List.ItemEnd>
                      <ChevronRightIcon
                        className={`h-4 w-4 ${isOpen ? 'rotate-90' : ''}`}
                      />
                    </List.ItemEnd>
                  </List.Item>
                  <Collapse open={isOpen}>
                    <List className="bg-background !gap-0">
                      {pathItems.map((pathItem, pathIndex) => {
                        const isFavoritePath = fileSharePathFavorites.includes(
                          pathItem
                        )
                          ? true
                          : false;
                        return (
                          <List.Item
                            key={`${zone}-${pathItem.name}`}
                            onClick={() =>
                              handleFileSharePathClick(
                                pathItem.zone,
                                pathItem.name
                              )
                            }
                            className={`flex gap-2 items-center justify-between pl-5 rounded-none cursor-pointer text-foreground hover:!bg-primary-light/30 focus:!bg-primary-light/30 ${pathIndex % 2 !== 0 ? '!bg-background' : '!bg-surface/50'}`}
                          >
                            <Link
                              to="/files"
                              className="flex flex-col gap-2 !text-foreground hover:!text-black focus:!text-black dark:hover:!text-white dark:focus:!text-white"
                            >
                              <div className="flex gap-1 items-center">
                                <RectangleStackIcon className="h-4 w-4" />
                                <Typography className="text-sm font-medium leading-4">
                                  {pathItem.storage}
                                </Typography>
                              </div>

                              <Typography className="text-xs">
                                {pathPreference[0] === 'linux_path'
                                  ? pathItem.linux_path
                                  : pathPreference[0] === 'windows_path'
                                    ? pathItem.windows_path
                                    : pathPreference[0] === 'mac_path'
                                      ? pathItem.mac_path
                                      : pathItem.linux_path}
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
                                onClick={(
                                  e: React.MouseEvent<HTMLButtonElement>
                                ) => {
                                  e.stopPropagation();
                                  handleFavoriteChange(
                                    pathItem,
                                    'fileSharePath'
                                  );
                                }}
                              >
                                {isFavoritePath ? (
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
                </React.Fragment>
              );
            }
          )}
        </List>
      </Collapse>
    </div>
  );
}
