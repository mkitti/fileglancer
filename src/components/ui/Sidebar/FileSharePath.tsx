import React from 'react';
import { Link } from 'react-router';
import { List, Typography, IconButton } from '@material-tailwind/react';
import {
  RectangleStackIcon,
  StarIcon as StarOutline
} from '@heroicons/react/24/outline';
import { StarIcon as StarFilled } from '@heroicons/react/24/solid';

import type { FileSharePathItem } from '@/shared.types';
import { useZoneBrowserContext } from '@/contexts/ZoneBrowserContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';

export default function FileSharePath({
  pathItem,
  pathIndex
}: {
  pathItem: FileSharePathItem;
  pathIndex: number;
}) {
  const {
    currentFileSharePath,
    setCurrentFileSharePath,
    setCurrentNavigationZone
  } = useZoneBrowserContext();

  const { pathPreference, fileSharePathFavorites, handleFavoriteChange } =
    usePreferencesContext();

  const { fetchAndFormatFilesForDisplay } = useFileBrowserContext();

  const isCurrentPath = currentFileSharePath === pathItem;
  const isFavoritePath = fileSharePathFavorites.includes(pathItem)
    ? true
    : false;

  return (
    <List.Item
      onClick={() => {
        setCurrentNavigationZone(pathItem.zone);
        setCurrentFileSharePath(pathItem);
        fetchAndFormatFilesForDisplay(pathItem.name);
      }}
      className={`x-short:py-0 flex gap-2 items-center justify-between rounded-none cursor-pointer text-foreground hover:!bg-primary-light/30 focus:!bg-primary-light/30 ${isCurrentPath ? '!bg-primary-light/30' : pathIndex % 2 !== 0 ? '!bg-background' : '!bg-surface/50'}`}
    >
      <Link
        to="/browse"
        className="grow flex flex-col gap-2 !text-foreground hover:!text-black focus:!text-black dark:hover:!text-white dark:focus:!text-white"
      >
        <div className="flex gap-1 items-center">
          <RectangleStackIcon className="icon-small x-short:icon-xsmall" />
          <Typography className="text-sm font-medium leading-4 x-short:text-xs">
            {pathItem.storage}
          </Typography>
        </div>

        {pathItem.linux_path ? (
          <Typography className="text-xs">
            {pathPreference[0] === 'linux_path'
              ? pathItem.linux_path
              : pathPreference[0] === 'windows_path'
                ? pathItem.windows_path
                : pathPreference[0] === 'mac_path'
                  ? pathItem.mac_path
                  : pathItem.linux_path}
          </Typography>
        ) : null}
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
            handleFavoriteChange(pathItem, 'fileSharePath');
          }}
        >
          {isFavoritePath ? (
            <StarFilled className="icon-small x-short:icon-xsmall mb-[2px]" />
          ) : (
            <StarOutline className="icon-small x-short:icon-xsmall mb-[2px]" />
          )}
        </IconButton>
      </div>
    </List.Item>
  );
}
