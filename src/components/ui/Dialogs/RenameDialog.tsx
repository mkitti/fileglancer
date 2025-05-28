import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  IconButton,
  Typography
} from '@material-tailwind/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import type { FileOrFolder } from '@/shared.types';
import useRenameDialog from '@/hooks/useRenameDialog';

type ItemNamingDialogProps = {
  propertiesTarget: FileOrFolder | null;
  showRenameDialog: boolean;
  setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function RenameDialog({
  propertiesTarget,
  showRenameDialog,
  setShowRenameDialog
}: ItemNamingDialogProps): JSX.Element {
  const {
    handleRenameSubmit,
    newName,
    setNewName,
    showAlert,
    setShowAlert,
    alertContent
  } = useRenameDialog();

  return (
    <Dialog open={showRenameDialog}>
      <Dialog.Overlay>
        <Dialog.Content className="bg-surface-light dark:bg-surface">
          <IconButton
            size="sm"
            variant="outline"
            color="secondary"
            className="absolute right-2 top-2 text-secondary hover:text-background"
            isCircular
            onClick={() => {
              setShowRenameDialog(false);
              setNewName('');
              setShowAlert(false);
            }}
          >
            <XMarkIcon className="icon-default" />
          </IconButton>
          <form
            onSubmit={async event => {
              event.preventDefault();
              setShowAlert(false);

              const success = await handleRenameSubmit(
                `${propertiesTarget?.path}`
              );
              if (success) {
                setShowRenameDialog(false);
                setNewName('');
              }
            }}
          >
            <div className="mt-8 flex flex-col gap-2">
              <Typography
                as="label"
                htmlFor="new_name"
                className="text-foreground font-semibold"
              >
                Rename Item
              </Typography>
              <input
                type="text"
                id="new_name"
                autoFocus
                value={newName}
                placeholder="Enter name"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setNewName(event.target.value);
                }}
                className="mb-4 p-2 text-foreground text-lg border border-primary-light rounded-sm focus:outline-none focus:border-primary bg-background"
              />
            </div>
            <Button className="!rounded-md" type="submit">
              Submit
            </Button>
            {showAlert === true ? (
              <Alert className="flex items-center gap-6 mt-6 border-none bg-error-light/90">
                <Alert.Content>{alertContent}</Alert.Content>
                <XMarkIcon
                  className="icon-default cursor-pointer"
                  onClick={() => setShowAlert(false)}
                />
              </Alert>
            ) : null}
          </form>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
}
