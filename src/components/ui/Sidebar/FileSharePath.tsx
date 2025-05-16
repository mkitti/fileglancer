import React from 'react';
import { Link } from 'react-router';
import { List, Typography, IconButton } from '@material-tailwind/react';
import {
  RectangleStackIcon,
  StarIcon as StarOutline
} from '@heroicons/react/24/outline';
import { StarIcon as StarFilled } from '@heroicons/react/24/solid';

import type { FileSharePath } from '../../../shared.types';
import { useZoneBrowserContext } from '../../../contexts/ZoneBrowserContext';
import { useFileBrowserContext } from '../../../contexts/FileBrowserContext';
import { usePreferencesContext } from '../../../contexts/PreferencesContext';
import { makeMapKey } from '../../../utils';

type FileSharePathComponentProps = {
  fsp: FileSharePath;
  index: number;
};

export default function FileSharePathComponent({
  fsp,
  index
}: FileSharePathComponentProps) {
  const {
    currentFileSharePath,
    setCurrentFileSharePath,
    setCurrentNavigationZone
  } = useZoneBrowserContext();

  const { pathPreference, fileSharePathPreferenceKeys, handleFavoriteChange } =
    usePreferencesContext();

  const { fetchAndFormatFilesForDisplay } = useFileBrowserContext();

  const isCurrentPath = currentFileSharePath?.name === fsp.name;
  const isFavoritePath = fileSharePathPreferenceKeys.includes(
    makeMapKey('fsp', fsp.name)
  )
    ? true
    : false;

  return (
    <List.Item
      onClick={() => {
        setCurrentNavigationZone(fsp.zone);
        setCurrentFileSharePath(fsp);
        fetchAndFormatFilesForDisplay(fsp.name);
      }}
      className={`flex gap-2 items-center justify-between rounded-none cursor-pointer text-foreground hover:!bg-primary-light/30 focus:!bg-primary-light/30 ${isCurrentPath ? '!bg-primary-light/30' : index % 2 !== 0 ? '!bg-background' : '!bg-surface/50'}`}
    >
      <Link
        to="/files"
        className="grow flex flex-col gap-2 !text-foreground hover:!text-black focus:!text-black dark:hover:!text-white dark:focus:!text-white"
      >
        <div className="flex gap-1 items-center">
          <RectangleStackIcon className="h-4 w-4" />
          <Typography className="text-sm font-medium leading-4">
            {fsp.storage}
          </Typography>
        </div>

        {fsp.linux_path ? (
          <Typography className="text-xs">
            {pathPreference[0] === 'linux_path'
              ? fsp.linux_path
              : pathPreference[0] === 'windows_path'
                ? fsp.windows_path
                : pathPreference[0] === 'mac_path'
                  ? fsp.mac_path
                  : fsp.linux_path}
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
            handleFavoriteChange(fsp, 'fileSharePath');
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
}
