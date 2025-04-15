import React from 'react';
import { Link } from 'react-router-dom';
import { Collapse, Typography, List } from '@material-tailwind/react';
import {
  ChevronRightIcon,
  FolderIcon,
  RectangleStackIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { StarIcon as StarFilled } from '@heroicons/react/24/solid';

import {
  DirectoryFavorite,
  usePreferencesContext
} from '../../contexts/PreferencesContext';
import useToggleOpenFavorites from '../../hooks/useOpenFavorites';
import useHandleFileSharePathClick from '../../hooks/useHandleFileSharePathClick';
import { FileSharePathItem } from '../../shared.types';

export default function SidebarFavorites({
  searchQuery,
  setOpenZones,
  filteredZoneFavorites,
  filteredFileSharePathFavorites,
  filteredDirectoryFavorites
}: {
  searchQuery: string;
  setOpenZones: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  filteredZoneFavorites: string[];
  filteredFileSharePathFavorites: FileSharePathItem[];
  filteredDirectoryFavorites: DirectoryFavorite[];
}) {
  const { openFavorites, toggleOpenFavorites } = useToggleOpenFavorites();
  const { handleFileSharePathClick } = useHandleFileSharePathClick();
  const {
    zoneFavorites,
    fileSharePathFavorites,
    directoryFavorites,
    pathPreference
  } = usePreferencesContext();

  const displayZones =
    filteredZoneFavorites.length > 0 || searchQuery.length > 0
      ? filteredZoneFavorites
      : zoneFavorites;

  const displayFileSharePaths =
    filteredFileSharePathFavorites.length > 0 || searchQuery.length > 0
      ? filteredFileSharePathFavorites
      : fileSharePathFavorites;

  const displayDirectories =
    filteredDirectoryFavorites.length > 0 || searchQuery.length > 0
      ? filteredDirectoryFavorites
      : directoryFavorites;

  console.log('displayDirectories', displayDirectories);

  return (
    <div className="w-[calc(100%-1.5rem)] mt-3 mx-3 flex flex-col max-h-full h-fit">
      <List className="bg-surface-light py-2">
        <List.Item
          onClick={() => toggleOpenFavorites('all')}
          className="cursor-pointer rounded-none py-3 "
        >
          <List.ItemStart>
            <StarFilled className="h-5 w-5 text-surface-foreground" />
          </List.ItemStart>
          <Typography className="font-semibold text-surface-foreground">
            Favorites
          </Typography>
          <List.ItemEnd>
            <ChevronRightIcon
              className={`h-4 w-4 ${openFavorites['all'] ? 'rotate-90' : ''}`}
            />
          </List.ItemEnd>
        </List.Item>
      </List>
      <Collapse
        open={openFavorites['all'] ? true : false}
        className="!overflow-y-auto max-h-[calc(100vh-250px)]"
      >
        <List className="bg-background">
          <List.Item
            onClick={() => toggleOpenFavorites('zones')}
            className="cursor-pointer rounded-none "
          >
            <List.ItemStart>
              <Squares2X2Icon className="h-4 w-4 text-surface-foreground" />
            </List.ItemStart>
            <Typography className="text-sm text-surface-foreground">
              Zones
            </Typography>
            <List.ItemEnd>
              <ChevronRightIcon
                className={`h-4 w-4 ${openFavorites['zones'] ? 'rotate-90' : ''}`}
              />
            </List.ItemEnd>
          </List.Item>
          <Collapse open={openFavorites['zones'] ? true : false}>
            <List className="bg-surface-light max-h-[calc(40vh)] overflow-y-auto !py-0">
              {displayZones.map((zone, index) => {
                return (
                  <List.Item
                    key={`favorite-zone-${zone}`}
                    onClick={() => {
                      setOpenZones({ all: true, [zone]: true });
                    }}
                    className="flex gap-2 items-center justify-between pl-5 rounded-none cursor-pointer text-foreground hover:bg-primary-light/30 focus:bg-primary-light/30 !bg-background"
                  >
                    <div className="flex gap-1 items-center">
                      {/* <FolderIcon className="h-4 w-4" /> */}
                      <Typography className="text-sm font-medium leading-4">
                        {zone}
                      </Typography>
                    </div>
                  </List.Item>
                );
              })}
            </List>
          </Collapse>
        </List>
      </Collapse>
      <Collapse
        open={openFavorites['all'] ? true : false}
        className="!overflow-y-auto max-h-[calc(100vh-250px)]"
      >
        <List className="bg-background">
          <List.Item
            onClick={() => toggleOpenFavorites('fileSharePaths')}
            className="cursor-pointer rounded-none"
          >
            <List.ItemStart>
              <RectangleStackIcon className="h-4 w-4 text-surface-foreground" />
            </List.ItemStart>
            <Typography className="text-sm text-surface-foreground">
              File Share Paths
            </Typography>
            <List.ItemEnd>
              <ChevronRightIcon
                className={`h-4 w-4 ${openFavorites['fileSharePaths'] ? 'rotate-90' : ''}`}
              />
            </List.ItemEnd>
          </List.Item>
          <Collapse open={openFavorites['fileSharePaths'] ? true : false}>
            <List className="bg-surface-light max-h-[calc(40vh)] overflow-y-auto !py-0">
              {displayFileSharePaths.map((path, index) => {
                return (
                  <List.Item
                    key={`favorite-fileSharePath-${path}`}
                    onClick={() => {
                      setOpenZones({ all: true, [path.zone]: true });
                      handleFileSharePathClick(path.zone, path.name);
                    }}
                    className="flex gap-2 items-center justify-between pl-5 rounded-none cursor-pointer text-foreground hover:bg-primary-light/30 focus:bg-primary-light/30 !bg-background"
                  >
                    <Link
                      to="/files"
                      className="flex flex-col gap-2 !text-foreground hover:!text-black focus:!text-black"
                    >
                      <div className="flex gap-1 items-center">
                        {/* <FolderIcon className="h-4 w-4" /> */}
                        <Typography className="text-sm font-medium leading-4">
                          {path.storage}
                        </Typography>
                      </div>
                      <Typography className="text-xs">
                        {pathPreference[0] === 'linux_path'
                          ? path.linux_path
                          : pathPreference[0] === 'windows_path'
                            ? path.windows_path
                            : pathPreference[0] === 'mac_path'
                              ? path.mac_path
                              : path.linux_path}
                      </Typography>
                    </Link>
                  </List.Item>
                );
              })}
            </List>
          </Collapse>
        </List>
      </Collapse>
      <Collapse
        open={openFavorites['all'] ? true : false}
        className="!overflow-y-auto max-h-[calc(100vh-250px)]"
      >
        <List className="bg-background">
          <List.Item
            onClick={() => toggleOpenFavorites('directories')}
            className="cursor-pointer rounded-none"
          >
            <List.ItemStart>
              <FolderIcon className="h-4 w-4 text-surface-foreground" />
            </List.ItemStart>
            <Typography className="text-sm text-surface-foreground">
              Directories
            </Typography>
            <List.ItemEnd>
              <ChevronRightIcon
                className={`h-4 w-4 ${openFavorites['directories'] ? 'rotate-90' : ''}`}
              />
            </List.ItemEnd>
          </List.Item>
          <Collapse open={openFavorites['directories'] ? true : false}>
            <List className="bg-surface-light max-h-[calc(40vh)] overflow-y-auto !py-0">
              {displayDirectories.map((directoryItem, index) => {
                console.log(
                  'directory item navigation zone:',
                  directoryItem.navigationZone
                );

                return (
                  <List.Item
                    key={`favorite-directory-${directoryItem.name}`}
                    onClick={() => {
                      setOpenZones({
                        all: true,
                        [directoryItem.navigationZone]: true
                      });
                      handleFileSharePathClick(
                        directoryItem.navigationZone,
                        `${directoryItem.navigationPath}?subpath=${directoryItem.path}`
                      );
                    }}
                    className="flex gap-2 items-center justify-between pl-5 rounded-none cursor-pointer text-foreground hover:bg-primary-light/30 focus:bg-primary-light/30 !bg-background"
                  >
                    <Link
                      to="/files"
                      className="flex flex-col gap-2 !text-foreground hover:!text-black focus:!text-black"
                    >
                      <div className="flex gap-1 items-center">
                        {/* <FolderIcon className="h-4 w-4" /> */}
                        <Typography className="text-sm font-medium leading-4">
                          {directoryItem.name}
                        </Typography>
                      </div>
                      <Typography className="text-xs">
                        {directoryItem.navigationPath}
                      </Typography>
                    </Link>
                  </List.Item>
                );
              })}
            </List>
          </Collapse>
        </List>
      </Collapse>
    </div>
  );
}
