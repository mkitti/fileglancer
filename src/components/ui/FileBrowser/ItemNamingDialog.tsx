import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  IconButton,
  Typography
} from '@material-tailwind/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { File } from '../../../shared.types';

type ItemNamingDialogProps = {
  selectedFiles: File[];
  showNamingDialog: boolean;
  setShowNamingDialog: React.Dispatch<React.SetStateAction<boolean>>;
  handleDialogSubmit: (targetItem: File) => Promise<void>;
  newName: string;
  setNewName: React.Dispatch<React.SetStateAction<string>>;
  showAlert: boolean;
  setShowAlert: React.Dispatch<React.SetStateAction<boolean>>;
  alertContent: string;
  namingDialogType: 'newFolder' | 'renameItem';
};

export default function ItemNamingDialog({
  selectedFiles,
  showNamingDialog,
  setShowNamingDialog,
  handleDialogSubmit,
  newName,
  setNewName,
  showAlert,
  setShowAlert,
  alertContent,
  namingDialogType
}: ItemNamingDialogProps): JSX.Element {
  return (
    <Dialog open={showNamingDialog}>
      <Dialog.Overlay>
        <Dialog.Content>
          <IconButton
            size="sm"
            variant="outline"
            color="secondary"
            className="absolute right-2 top-2 text-secondary hover:text-background"
            isCircular
            onClick={() => {
              setShowNamingDialog(false);
              setNewName('');
              setShowAlert(false);
            }}
          >
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
          <form
            onSubmit={event => {
              event.preventDefault();
              handleDialogSubmit(selectedFiles[0]);
            }}
          >
            <div className="mt-8 flex flex-col gap-2">
              <Typography
                as="label"
                htmlFor="new_name"
                className="text-foreground"
              >
                {namingDialogType === 'newFolder'
                  ? 'New Folder Name'
                  : namingDialogType === 'renameItem'
                    ? 'Rename Item'
                    : ''}
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
                className="mb-4 p-2 text-foreground text-lg border border-primary-light rounded-sm focus:outline-none focus:border-primary"
              />
            </div>
            <Button className="!rounded-md" type="submit">
              Submit
            </Button>
            {showAlert === true ? (
              <Alert
                className={`flex items-center gap-6 mt-6 border-none ${alertContent.startsWith('Error') ? 'bg-error-light/90' : 'bg-secondary-light/70'}`}
              >
                <Alert.Content>{alertContent}</Alert.Content>
                <XMarkIcon
                  className="h-5 w-5 cursor-pointer"
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
