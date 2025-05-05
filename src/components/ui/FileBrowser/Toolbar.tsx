import * as React from 'react';
import {
  Alert,
  Button,
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
  ListBulletIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';

import { useZoneBrowserContext } from '../../../contexts/ZoneBrowserContext';
import { useFileBrowserContext } from '../../../contexts/FileBrowserContext';
import useMakeNewFolder from '../../../hooks/useMakeNewFolder';

export default function Toolbar({
  hideDotFiles,
  setHideDotFiles,
  setShowPropertiesDrawer
}: {
  hideDotFiles: boolean;
  setHideDotFiles: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPropertiesDrawer: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { currentFileSharePath } = useZoneBrowserContext();
  const { dirArray } = useFileBrowserContext();
  const {
    addNewFolder,
    newFolderName,
    setNewFolderName,
    showNewFolderAlert,
    setShowNewFolderAlert,
    newFolderAlertContent
  } = useMakeNewFolder();

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
        <Dialog>
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
          <Dialog.Overlay>
            <Dialog.Content>
              <Dialog.DismissTrigger
                as={IconButton}
                size="sm"
                variant="outline"
                color="secondary"
                className="absolute right-2 top-2"
                isCircular
              >
                <XMarkIcon className="h-4 w-4 text-secondary" />
              </Dialog.DismissTrigger>
              <form
                onSubmit={event => {
                  event.preventDefault();
                  if (currentFileSharePath) {
                    addNewFolder(
                      currentFileSharePath.name,
                      dirArray.slice(1, dirArray.length).join('/')
                    );
                  }
                }}
              >
                <div className="mt-8 flex flex-col gap-2">
                  <Typography
                    as="label"
                    htmlFor="new_folder_name"
                    className="text-foreground"
                  >
                    New folder name:
                  </Typography>
                  <input
                    type="text"
                    id="new_folder_name"
                    autoFocus
                    value={newFolderName}
                    placeholder="Enter folder name"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setNewFolderName(event.target.value);
                    }}
                    className="mb-4 p-2 text-foreground text-lg border border-primary-light rounded-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <Button className="!rounded-md" type="submit">
                  Submit
                </Button>
                {showNewFolderAlert === true ? (
                  <Alert
                    className={`flex items-center gap-6 mt-6 border-none ${newFolderAlertContent.startsWith('Error') ? 'bg-error-light/90' : 'bg-secondary-light/70'}`}
                  >
                    <Alert.Content>{newFolderAlertContent}</Alert.Content>
                    <XMarkIcon
                      className="h-5 w-5 cursor-pointer"
                      onClick={() => setShowNewFolderAlert(false)}
                    />
                  </Alert>
                ) : null}
              </form>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog>
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
