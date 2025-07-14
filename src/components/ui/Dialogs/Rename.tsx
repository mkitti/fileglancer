import React from 'react';
import { Alert, Button, Typography } from '@material-tailwind/react';
import { HiX } from 'react-icons/hi';

import useRenameDialog from '@/hooks/useRenameDialog';
import FgDialog from './FgDialog';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

type ItemNamingDialogProps = {
  showRenameDialog: boolean;
  setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function RenameDialog({
  showRenameDialog,
  setShowRenameDialog
}: ItemNamingDialogProps): JSX.Element {
  const { propertiesTarget } = useFileBrowserContext();
  const {
    handleRenameSubmit,
    newName,
    setNewName,
    showAlert,
    setShowAlert,
    alertContent
  } = useRenameDialog();

  return (
    <FgDialog
      open={showRenameDialog}
      onClose={() => setShowRenameDialog(false)}
    >
      <form
        onSubmit={async event => {
          event.preventDefault();
          setShowAlert(false);

          const success = await handleRenameSubmit(`${propertiesTarget?.path}`);
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
            <HiX
              className="icon-default cursor-pointer"
              onClick={() => setShowAlert(false)}
            />
          </Alert>
        ) : null}
      </form>
    </FgDialog>
  );
}
