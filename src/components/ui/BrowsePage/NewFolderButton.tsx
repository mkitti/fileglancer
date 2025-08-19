import React from 'react';
import { Button, Typography } from '@material-tailwind/react';
import { HiFolderAdd } from 'react-icons/hi';
import toast from 'react-hot-toast';

import FgTooltip from '@/components/ui/widgets/FgTooltip';
import FgDialog from '@/components/ui/Dialogs/FgDialog';
import useNewFolderDialog from '@/hooks/useNewFolderDialog';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

type NewFolderButtonProps = {
  triggerClasses: string;
};

export default function NewFolderButton({
  triggerClasses
}: NewFolderButtonProps): JSX.Element {
  const [showNewFolderDialog, setShowNewFolderDialog] = React.useState(false);
  const { currentFileSharePath } = useFileBrowserContext();
  const { handleNewFolderSubmit, newName, setNewName } = useNewFolderDialog();

  return (
    <>
      <FgTooltip
        icon={HiFolderAdd}
        label="New folder"
        disabledCondition={!currentFileSharePath}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          setShowNewFolderDialog(true);
          e.currentTarget.blur();
        }}
        triggerClasses={triggerClasses}
      />
      {showNewFolderDialog && (
        <FgDialog
          open={showNewFolderDialog}
          onClose={() => setShowNewFolderDialog(false)}
        >
          <form
            onSubmit={async event => {
              event.preventDefault();
              const result = await handleNewFolderSubmit();
              if (result.success) {
                toast.success('New folder created!');
              } else {
                toast.error(`Error creating folder: ${result.error}`);
              }
              setShowNewFolderDialog(false);
              setNewName('');
            }}
          >
            <div className="mt-8 flex flex-col gap-2">
              <Typography
                as="label"
                htmlFor="new_name"
                className="text-foreground font-semibold"
              >
                New Folder Name
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
          </form>
        </FgDialog>
      )}
    </>
  );
}
