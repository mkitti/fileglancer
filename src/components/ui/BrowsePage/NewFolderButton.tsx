import React from 'react';
import { HiFolderAdd } from 'react-icons/hi';

import FgTooltip from '@/components/ui/widgets/FgTooltip';
import NewFolderDialog from '@/components/ui/Dialogs/NewFolder';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

type NewFolderButtonProps = {
  triggerClasses: string;
};

export default function NewFolderButton({
  triggerClasses
}: NewFolderButtonProps): JSX.Element {
  const [showNewFolderDialog, setShowNewFolderDialog] = React.useState(false);
  const { currentFileSharePath } = useFileBrowserContext();

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
        <NewFolderDialog
          showNewFolderDialog={showNewFolderDialog}
          setShowNewFolderDialog={setShowNewFolderDialog}
        />
      )}
    </>
  );
}
