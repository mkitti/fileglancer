import React from 'react';
import { Link } from 'react-router';
import {
  Card,
  Collapse,
  Typography,
  List,
  IconButton,
  Input
} from '@material-tailwind/react';
import {
  ChevronRightIcon,
  FolderIcon,
  FunnelIcon,
  Squares2X2Icon,
  StarIcon as StarOutline
} from '@heroicons/react/24/outline';
import { StarIcon as StarFilled } from '@heroicons/react/24/solid';

import useZoneFilter from '../../hooks/useZoneFilter';
import { FileSharePaths } from '../../hooks/useFileBrowser';

type FileSidebarProps = {
  fileSharePaths: FileSharePaths;
  zoneFavorites: string[];
  setZoneFavorites: (zones: string[]) => void;
  openZones: Record<string, boolean>;
  toggleZone: (zone: string) => void;
  handlePathClick: (path: string) => void;
  handleFavoriteChange: (item: string, type: string) => void;
};

export default function FileSidebar({
  fileSharePaths,
  zoneFavorites,
  openZones,
  toggleZone,
  handlePathClick,
  handleFavoriteChange
}: FileSidebarProps) {
  const { searchQuery, filteredFileSharePaths, handleSearchChange } =
    useZoneFilter();

  const displayPaths =
    Object.keys(filteredFileSharePaths).length > 0 || searchQuery.length > 0
      ? filteredFileSharePaths
      : fileSharePaths;

  // Sort displayPaths so zones that are favorites are at the top
  const sortedDisplayPaths = Object.keys(displayPaths)
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
      acc[key] = displayPaths[key];
      return acc;
    }, {} as FileSharePaths);

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

      <div className="w-[calc(100%-1.5rem)] mt-3 mx-3 bg-background border border-surface shadow-sm flex flex-col flex-1 max-h-full">
        <List className="bg-surface-light border border-surface py-2">
          <List.Item className="pointer-events-none">
            <List.ItemStart>
              <Squares2X2Icon className="h-5 w-5 text-surface-foreground" />
            </List.ItemStart>
            <Typography className="font-semibold text-surface-foreground">
              Zones
            </Typography>
          </List.Item>
        </List>
        <List className="bg-background overflow-y-auto flex-grow">
          {Object.entries(sortedDisplayPaths).map(
            ([zone, pathItems], index) => {
              const isOpen = openZones[zone] || false;
              const isFavorite = zoneFavorites.includes(zone);
              return (
                <React.Fragment key={zone}>
                  <List.Item
                    onClick={() => toggleZone(zone)}
                    className="cursor-pointer rounded-none py-3 flex-shrink-0 hover:bg-primary-light/30"
                  >
                    <List.ItemStart>
                      <Squares2X2Icon className="h-[18px] w-[18px]" />
                    </List.ItemStart>
                    <div className="flex-1 min-w-0 flex items-center gap-1">
                      <Typography>{zone}</Typography>
                      <div
                        className="flex items-center"
                        onClick={e => e.stopPropagation()}
                      >
                        <IconButton
                          variant="ghost"
                          isCircular
                          onClick={() => handleFavoriteChange(zone, 'zone')}
                        >
                          {isFavorite ? (
                            <StarFilled className="h-[18px] w-[18px] mb-[2px]" />
                          ) : (
                            <StarOutline className="h-[18px] w-[18px] mb-[2px]" />
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
                    <List className="bg-background">
                      {pathItems.map((pathItem, pathIndex) => (
                        <List.Item
                          key={`${zone}-${pathItem.name}`}
                          onClick={() => handlePathClick(pathItem.name)}
                          className={`pl-5 rounded-none cursor-pointer hover:bg-primary-light/30 focus:bg-primary-light/30 hover:!text-foreground focus:!text-foreground ${pathIndex % 2 === 0 ? 'bg-surface/50' : 'bg-background'}`}
                          as={Link}
                          to="/files"
                        >
                          <List.ItemStart>
                            <FolderIcon className="h-[18px] w-[18px]" />
                          </List.ItemStart>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {pathItem.storage}
                            </span>
                            <span className="text-xs text-gray-500">
                              {
                                /* TODO: use the user's preferred address for the path 
                            (mac_path, windows_path, linux_path) */
                                pathItem.linux_path
                              }
                            </span>
                          </div>
                        </List.Item>
                      ))}
                    </List>
                  </Collapse>
                </React.Fragment>
              );
            }
          )}
        </List>
      </div>
    </Card>
  );
}
