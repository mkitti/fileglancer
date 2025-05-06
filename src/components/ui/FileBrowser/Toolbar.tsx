import * as React from 'react';
import {
  ButtonGroup,
  Dialog,
  IconButton,
  Tooltip,
  Typography
} from '@material-tailwind/react';
import {
  EyeIcon,
  EyeSlashIcon,
  FolderPlusIcon,
  ListBulletIcon
} from '@heroicons/react/24/solid';

import ItemNamingDialog from './ItemNamingDialog';

export default function Toolbar({
  hideDotFiles,
  setHideDotFiles,
  setShowPropertiesDrawer
}: {
  hideDotFiles: boolean;
  setHideDotFiles: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPropertiesDrawer: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className="flex flex-col min-w-full p-2 border-b border-surface">
      <ButtonGroup className="self-start">
        {/* Show/hide dot files and folders */}
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

        {/* Make new folder */}
        <ItemNamingDialog type="newFolder" labelText="New folder name:">
          <Tooltip placement="top">
            <Tooltip.Trigger>
              <Dialog.Trigger as={IconButton} variant="outline">
                <FolderPlusIcon className="h-5 w-5" />
              </Dialog.Trigger>
            </Tooltip.Trigger>
            <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
              <Typography type="small" className="opacity-90">
                New folder
              </Typography>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip>
        </ItemNamingDialog>

        {/* Show/hide properties drawer */}
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
