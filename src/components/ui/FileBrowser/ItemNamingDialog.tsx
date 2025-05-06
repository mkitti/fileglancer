import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  IconButton,
  Typography
} from '@material-tailwind/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import useNamingDialog from '../../../hooks/useNamingDialog';

type ItemNamingDialogProps = {
  children: React.ReactNode;
  type: 'newFolder' | 'renameItem';
  labelText: string;
};

export default function ItemNamingDialog({
  children,
  type,
  labelText
}: ItemNamingDialogProps): JSX.Element {
  const {
    handleDialogSubmit,
    newName,
    setNewName,
    showAlert,
    setShowAlert,
    alertContent
  } = useNamingDialog();

  return (
    <Dialog>
      {children}
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
              handleDialogSubmit(type);
            }}
          >
            <div className="mt-8 flex flex-col gap-2">
              <Typography
                as="label"
                htmlFor="new_name"
                className="text-foreground"
              >
                {labelText}
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
