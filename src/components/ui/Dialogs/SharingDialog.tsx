import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  IconButton,
  Typography
} from '@material-tailwind/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import { useZoneBrowserContext } from '@/contexts/ZoneBrowserContext';
import { set } from 'node_modules/zarrita/dist/src/indexing/set';

type SharingDialogProps = {
  isImageShared: boolean;
  setIsImageShared: React.Dispatch<React.SetStateAction<boolean>>;
  filePathWithoutFsp: string;
  showSharingDialog: boolean;
  setShowSharingDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function SharingDialog({
  isImageShared,
  setIsImageShared,
  filePathWithoutFsp,
  showSharingDialog,
  setShowSharingDialog
}: SharingDialogProps): JSX.Element {
  const [showAlert, setShowAlert] = React.useState<boolean>(false);
  const [alertContent, setAlertContent] = React.useState<string>('');
  const { createProxiedPath, deleteProxiedPath } = useProxiedPathContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const displayPath = `${currentFileSharePath?.mount_path}/${filePathWithoutFsp}`;

  return (
    <Dialog open={showSharingDialog}>
      <Dialog.Overlay>
        <Dialog.Content className="bg-surface-light dark:bg-surface">
          <IconButton
            size="sm"
            variant="outline"
            color="secondary"
            className="absolute right-2 top-2 text-secondary hover:text-background"
            isCircular
            onClick={() => {
              setShowSharingDialog(false);
              setShowAlert(false);
            }}
          >
            <XMarkIcon className="icon-default" />
          </IconButton>
          {/* TODO: Move Janelia-specific text elsewhere */}
          {isImageShared ? (
            <Typography className="my-8 text-large text-foreground">
              <p>
                Are you sure you want to unshare{' '}
                <span className="font-semibold break-all">{displayPath}</span>?
              </p>
              <p>
                If you previously shared a link to these data with
                collaborators, the link will no longer work. You can always
                share these data again later.
              </p>
            </Typography>
          ) : (
            <Typography className="my-8 text-large text-foreground">
              <p>
                Are you sure you want to share{' '}
                <span className="font-semibold break-all">{displayPath}</span>?
              </p>
              <p>This will allow anyone at Janelia to view this data.</p>
            </Typography>
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
                      currentFileSharePath?.mount_path || '',
                      filePathWithoutFsp
                    );
                    if (newProxiedPath) {
                      setAlertContent(`Successfully shared ${displayPath}`);
                    } else {
                      setAlertContent(`Error sharing ${displayPath}`);
                    }
                    setIsImageShared(true);
                    setShowSharingDialog(false);
                  } catch (error) {
                    setAlertContent(
                      `Error sharing ${displayPath}: ${
                        error instanceof Error ? error.message : 'Unknown error'
                      }`
                    );
                    setShowAlert(true);
                  }
                }}
              >
                Share image
              </Button>
            ) : null}
            {isImageShared ? (
              <Button
                variant="outline"
                color="error"
                className="!rounded-md flex items-center gap-2"
                onClick={async () => {
                  try {
                    await deleteProxiedPath();
                    setIsImageShared(false);
                    setAlertContent(`Successfully unshared ${displayPath}`);
                    setShowSharingDialog(false);
                  } catch (error) {
                    setAlertContent(
                      `Error unsharing ${displayPath}: ${
                        error instanceof Error ? error.message : 'Unknown error'
                      }`
                    );
                    setShowAlert(true);
                  }
                }}
              >
                Unshare image
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
          {showAlert === true ? (
            <Alert
              className={`flex items-center gap-6 mt-6 border-none ${alertContent.startsWith('Error') ? 'bg-error-light/90' : 'bg-secondary-light/70'}`}
            >
              <Alert.Content>{alertContent}</Alert.Content>
              <XMarkIcon
                className="icon-default cursor-pointer"
                onClick={() => {
                  setShowAlert(false);
                  setShowSharingDialog(false);
                }}
              />
            </Alert>
          ) : null}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
}
