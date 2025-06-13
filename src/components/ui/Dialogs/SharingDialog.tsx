import React from 'react';
import {
  Button,
  Dialog,
  IconButton,
  Typography
} from '@material-tailwind/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import {
  ProxiedPath,
  useProxiedPathContext
} from '@/contexts/ProxiedPathContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import { getPreferredPathForDisplay } from '@/utils';

type SharingDialogProps = {
  isImageShared: boolean;
  setIsImageShared?: React.Dispatch<React.SetStateAction<boolean>>;
  filePathWithoutFsp: string;
  showSharingDialog: boolean;
  setShowSharingDialog: React.Dispatch<React.SetStateAction<boolean>>;
  proxiedPath: ProxiedPath | null;
};

export default function SharingDialog({
  isImageShared,
  setIsImageShared,
  filePathWithoutFsp,
  showSharingDialog,
  setShowSharingDialog,
  proxiedPath
}: SharingDialogProps): JSX.Element {
  const { createProxiedPath, deleteProxiedPath } = useProxiedPathContext();
  const { currentFileSharePath } = useFileBrowserContext();
  const { pathPreference } = usePreferencesContext();

  if (!currentFileSharePath) {
    return <>{toast.error('No file share path selected')}</>; // No file share path available
  }
  const displayPath = getPreferredPathForDisplay(
    pathPreference,
    currentFileSharePath,
    filePathWithoutFsp
  );

  return (
    <Dialog open={showSharingDialog}>
      <Dialog.Overlay>
        <Dialog.Content className="bg-surface-light dark:bg-surface">
          <IconButton
            size="sm"
            variant="outline"
            color="secondary"
            className="absolute right-2 top-2 text-secondary hover:text-background rounded-full"
            onClick={() => {
              setShowSharingDialog(false);
            }}
          >
            <XMarkIcon className="icon-default" />
          </IconButton>
          {/* TODO: Move Janelia-specific text elsewhere */}
          {isImageShared ? (
            <div className="my-8 text-large text-foreground">
              <Typography>
                Are you sure you want to unshare{' '}
                <span className="font-semibold break-all">{displayPath}</span>?
              </Typography>
              <Typography className="mt-4">
                Warning: The existing sharing link to this data will be disabled. 
                Collaborators who previously received the link will no longer be able to access it.
                You can create a new sharing link at any time if needed.
              </Typography>
            </div>
          ) : (
            <div className="my-8 text-large text-foreground">
              <Typography>
                Are you sure you want to share{' '}
                <span className="font-semibold break-all">{displayPath}</span>?
              </Typography>
              <Typography className="mt-4">
                This will allow anyone at Janelia to view this data.
              </Typography>
            </div>
          )}

          <div className="flex gap-2">
            {!isImageShared ? (
              <Button
                variant="outline"
                color="error"
                className="!rounded-md flex items-center gap-2"
                onClick={async () => {
                  try {
                    const newProxiedPath = await createProxiedPath(
                      currentFileSharePath.name,
                      filePathWithoutFsp
                    );
                    if (newProxiedPath) {
                      toast.success(`Successfully shared ${displayPath}`);
                    } else {
                      toast.error(`Error sharing ${displayPath}`);
                    }
                    setShowSharingDialog(false);
                    if (setIsImageShared) {
                      setIsImageShared(true);
                    }
                  } catch (error) {
                    toast.error(
                      `Error sharing ${displayPath}: ${
                        error instanceof Error ? error.message : 'Unknown error'
                      }`
                    );
                  }
                }}
              >
                Share path
              </Button>
            ) : null}
            {isImageShared ? (
              <Button
                variant="outline"
                color="error"
                className="!rounded-md flex items-center gap-2"
                onClick={async () => {
                  try {
                    if (proxiedPath) {
                      await deleteProxiedPath(proxiedPath);
                    } else {
                      toast.error('Proxied path not found');
                    }
                    toast.success(`Successfully unshared ${displayPath}`);
                    setShowSharingDialog(false);
                    if (setIsImageShared) {
                      setIsImageShared(false);
                    }
                  } catch (error) {
                    toast.error(
                      `Error unsharing ${displayPath}: ${
                        error instanceof Error ? error.message : 'Unknown error'
                      }`
                    );
                  }
                }}
              >
                Unshare path
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="!rounded-md flex items-center gap-2"
              onClick={() => {
                setShowSharingDialog(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
}
