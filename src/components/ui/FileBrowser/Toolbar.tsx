import * as React from 'react';
import {
  ButtonGroup,
  IconButton,
  Tooltip,
  Typography
} from '@material-tailwind/react';
import {
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  FolderPlusIcon,
  ListBulletIcon
} from '@heroicons/react/24/solid';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

type ToolbarProps = {
  hideDotFiles: boolean;
  setHideDotFiles: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPropertiesDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNewFolderDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Toolbar({
  hideDotFiles,
  setHideDotFiles,
  setShowPropertiesDrawer,
  setShowNewFolderDialog
}: ToolbarProps): JSX.Element {
  const { fetchAndFormatFilesForDisplay, currentNavigationPath } =
    useFileBrowserContext();
  return (
    <div className="flex flex-col min-w-full p-2 border-b border-surface">
      <div className="flex justify-between items-center">
        <ButtonGroup className="gap-1">
          {/* Refresh browser contents */}
          <Tooltip placement="top">
            <Tooltip.Trigger
              as={IconButton}
              variant="outline"
              onClick={() =>
                fetchAndFormatFilesForDisplay(currentNavigationPath)
              }
            >
              <ArrowPathIcon className="icon-default" />
              <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
                <Typography type="small" className="opacity-90">
                  Refresh file browser
                </Typography>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Trigger>
          </Tooltip>

          {/* Make new folder */}
          <Tooltip placement="top">
            <Tooltip.Trigger
              as={IconButton}
              variant="outline"
              onClick={() => {
                setShowNewFolderDialog(true);
              }}
            >
              <FolderPlusIcon className="icon-default" />
            </Tooltip.Trigger>
            <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
              <Typography type="small" className="opacity-90">
                New folder
              </Typography>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip>

          {/* Show/hide dot files and folders */}
          <Tooltip placement="top">
            <Tooltip.Trigger
              as={IconButton}
              variant="outline"
              onClick={() => setHideDotFiles((prev: boolean) => !prev)}
            >
              {hideDotFiles ? (
                <EyeSlashIcon className="icon-default" />
              ) : (
                <EyeIcon className="icon-default" />
              )}
              <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
                <Typography type="small" className="opacity-90">
                  {hideDotFiles ? 'Show dot files' : 'Hide dot files'}
                </Typography>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Trigger>
          </Tooltip>
        </ButtonGroup>

        {/* Show/hide properties drawer */}
        <Tooltip placement="top">
          <Tooltip.Trigger
            as={IconButton}
            variant="outline"
            onClick={() => setShowPropertiesDrawer((prev: boolean) => !prev)}
          >
            <ListBulletIcon className="icon-default" />
            <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
              <Typography type="small" className="opacity-90">
                View file properties
              </Typography>
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Trigger>
        </Tooltip>
      </div>
    </div>
  );
}
