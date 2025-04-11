import React from 'react';
import { Link } from 'react-router-dom';
import { Collapse, Typography, List } from '@material-tailwind/react';
import {
  ChevronRightIcon,
  FolderIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { StarIcon as StarFilled } from '@heroicons/react/24/solid';

import { usePreferencesContext } from '../../contexts/PreferencesContext';
import useToggleOpenFavorites from '../../hooks/useOpenFavorites';
import useHandlePathClick from '../../hooks/useHandlePathClick';

export default function SidebarFavorites({
  searchQuery,
  setOpenZones
}: {
  searchQuery: string;
  setOpenZones: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const { openFavorites, toggleOpenFavorites } = useToggleOpenFavorites();
  const { handlePathClick } = useHandlePathClick();
  const { zoneFavorites, fileSharePathFavorites, pathPreference } =
    usePreferencesContext();

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
              {zoneFavorites.map((zone, index) => {
                return (
                  <List.Item
                    key={`favorite-zone-${zone}`}
                    onClick={() => {
                      setOpenZones({ all: true, [zone]: true });
                    }}
                    className="flex gap-2 items-center justify-between pl-5 rounded-none cursor-pointer text-foreground hover:bg-primary-light/30 focus:bg-primary-light/30 !bg-background"
                  >
                    <div className="flex gap-1 items-center">
                      <FolderIcon className="h-4 w-4" />
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
              <FolderIcon className="h-4 w-4 text-surface-foreground" />
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
              {fileSharePathFavorites.map((path, index) => {
                return (
                  <List.Item
                    key={`favorite-fileSharePath-${path}`}
                    onClick={() => {
                      setOpenZones({ all: true, [path.zone]: true });
                      handlePathClick(path.name);
                    }}
                    className="flex gap-2 items-center justify-between pl-5 rounded-none cursor-pointer text-foreground hover:bg-primary-light/30 focus:bg-primary-light/30 !bg-background"
                  >
                    <Link
                      to="/files"
                      className="flex flex-col gap-2 !text-foreground hover:!text-black focus:!text-black"
                    >
                      <div className="flex gap-1 items-center">
                        <FolderIcon className="h-4 w-4" />
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
    </div>
  );
}
