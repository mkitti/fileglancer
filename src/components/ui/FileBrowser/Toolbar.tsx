import * as React from 'react';
import {
  IconButton,
  ButtonGroup,
  Tooltip,
  Typography
} from '@material-tailwind/react';
import {
  EyeIcon,
  EyeSlashIcon,
  FolderPlusIcon,
  ListBulletIcon
} from '@heroicons/react/24/solid';

import useMakeNewFolder from '../../../hooks/useMakeNewFolder';
import { useZoneBrowserContext } from '../../../contexts/ZoneBrowserContext';
import { useFileBrowserContext } from '../../../contexts/FileBrowserContext';

export default function Toolbar({
  hideDotFiles,
  setHideDotFiles,
  setShowPropertiesDrawer
}: {
  hideDotFiles: boolean;
  setHideDotFiles: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPropertiesDrawer: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { makeNewFolder } = useMakeNewFolder();
  const { currentFileSharePath } = useZoneBrowserContext();
  const { dirArray } = useFileBrowserContext();

  return (
    <div className="flex flex-col min-w-full p-2 border-b border-surface">
      <ButtonGroup className="self-start">
        <Tooltip placement="top">
          <Tooltip.Trigger
            as={IconButton}
            variant="outline"
            onClick={() => setHideDotFiles((prev: boolean) => !prev)}
          >
            {hideDotFiles ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
            <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
              <Typography type="small" className="opacity-90">
                {hideDotFiles ? 'Show dot files' : 'Hide dot files'}
              </Typography>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Trigger>
        </Tooltip>
        <Tooltip placement="top">
          <Tooltip.Trigger
            as={IconButton}
            variant="outline"
            onClick={() => {
              if (currentFileSharePath) {
                makeNewFolder(
                  currentFileSharePath.name,
                  dirArray.slice(1, dirArray.length).join('/')
                );
              }
            }}
          >
            <FolderPlusIcon className="h-5 w-5" />
            <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
              <Typography type="small" className="opacity-90">
                New folder
              </Typography>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Trigger>
        </Tooltip>
        <Tooltip placement="top">
          <Tooltip.Trigger
            as={IconButton}
            variant="outline"
            onClick={() => setShowPropertiesDrawer((prev: boolean) => !prev)}
          >
            <ListBulletIcon className="h-5 w-5" />
            <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
              <Typography type="small" className="opacity-90">
                View file properties
              </Typography>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Trigger>
        </Tooltip>
      </ButtonGroup>
    </div>
  );
}
