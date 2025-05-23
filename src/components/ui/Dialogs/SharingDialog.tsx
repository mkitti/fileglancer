import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  IconButton,
  Typography
} from '@material-tailwind/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { useSharedPathsContext } from '@/contexts/SharedPathsContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { useZoneBrowserContext } from '@/contexts/ZoneBrowserContext';

type SharingDialogProps = {
  fileFetchPath: string;
  showSharingDialog: boolean;
  setShowSharingDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function SharingDialog({
  fileFetchPath,
  showSharingDialog,
  setShowSharingDialog
}: SharingDialogProps): JSX.Element {
  const [showAlert, setShowAlert] = React.useState<boolean>(false);
  const [alertContent, setAlertContent] = React.useState<string>('');
  const { createSharedPath, fetchSharedPaths } = useSharedPathsContext();
  const { currentNavigationPath } = useFileBrowserContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  console.log('currentFSP mount_path', currentFileSharePath?.mount_path);

  return (
    <Dialog open={showSharingDialog}>
      <Dialog.Overlay>
        <Dialog.Content>
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
          <Typography className="my-8 text-large">
            Are you sure you want to share the image at path{' '}
            {currentNavigationPath.replace('?subpath=', '/')}?
          </Typography>
          <div className="flex gap-2">
            <Button
              variant="outline"
              color="error"
              className="!rounded-md flex items-center gap-2"
              onClick={() => {
                try {
                  createSharedPath(
                    `${currentFileSharePath?.mount_path}/${currentNavigationPath}`
                  );
                  setAlertContent(
                    `Successfully shared image at path ${currentNavigationPath.replace('?subpath=', '/')}`
                  );
                  fetchSharedPaths();
                } catch (error) {
                  setAlertContent(
                    `Error sharing image at path ${currentNavigationPath.replace('?subpath=', '/')}: ${
                      error instanceof Error ? error.message : 'Unknown error'
                    }`
                  );
                  setShowAlert(true);
                }
              }}
            >
              Share image
            </Button>
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
