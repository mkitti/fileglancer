import React from 'react';
import {
  List,
  Collapse,
  Typography,
  IconButton
} from '@material-tailwind/react';
import {
  ChevronRightIcon,
  Squares2X2Icon,
  StarIcon as StarOutline
} from '@heroicons/react/24/outline';
import { StarIcon as StarFilled } from '@heroicons/react/24/solid';

import FileSharePath from './FileSharePath';
import type { FileSharePathItem } from '../../../shared.types';
import { usePreferencesContext } from '../../../contexts/PreferencesContext';

export default function Zone({
  zoneName,
  fileSharePaths,
  openZones,
  toggleOpenZones
}: {
  zoneName: string;
  fileSharePaths: FileSharePathItem[];
  openZones: Record<string, boolean>;
  toggleOpenZones: (zone: string) => void;
}) {
  const { zoneFavorites, handleFavoriteChange } = usePreferencesContext();

  const isOpen = openZones[zoneName] || false;
  const isFavoriteZone = zoneFavorites.some(
    favorite => Object.keys(favorite)[0] === zoneName
  )
    ? true
    : false;
  console.log('zone:', zoneName, 'isFavoriteZone:', isFavoriteZone);

  return (
    <React.Fragment>
      <List.Item
        onClick={() => toggleOpenZones(zoneName)}
        className="cursor-pointer rounded-none py-1 flex-shrink-0 hover:!bg-primary-light/30 focus:!bg-primary-light/30  !bg-background"
      >
        <List.ItemStart>
          <Squares2X2Icon className="h-4 w-4" />
        </List.ItemStart>
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <Typography className="text-sm">{zoneName}</Typography>
          <div className="flex items-center" onClick={e => e.stopPropagation()}>
            <IconButton
              variant="ghost"
              isCircular
              onClick={() =>
                handleFavoriteChange({ [zoneName]: fileSharePaths }, 'zone')
              }
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
          {fileSharePaths.map((pathItem, pathIndex) => {
            return <FileSharePath pathItem={pathItem} pathIndex={pathIndex} />;
          })}
        </List>
      </Collapse>
    </React.Fragment>
  );
}
