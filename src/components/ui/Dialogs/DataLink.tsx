import React from 'react';
import { Button, Typography } from '@material-tailwind/react';

import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import { useZoneAndFspMapContext } from '@/contexts/ZonesAndFspMapContext';
import { getPreferredPathForDisplay, makeMapKey } from '@/utils';
import type { FileSharePath } from '@/shared.types';
import type { PendingToolKey } from '@/hooks/useZarrMetadata';
import FgDialog from './FgDialog';
import TextWithFilePath from './TextWithFilePath';
import AutomaticLinksToggle from '@/components/ui/PreferencesPage/AutomaticLinksToggle';

interface CommonDataLinkDialogProps {
  getDisplayPath?: () => string;
  showDataLinkDialog: boolean;
  setShowDataLinkDialog: React.Dispatch<React.SetStateAction<boolean>>;
}

interface CreateLinkDialog extends CommonDataLinkDialogProps {
  action: 'create';
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  setPendingToolKey: React.Dispatch<React.SetStateAction<PendingToolKey>>;
}

interface DeleteLinkDialog extends CommonDataLinkDialogProps {
  action: 'delete';
  proxiedPath: ProxiedPath;
  handleDeleteDataLink: (proxiedPath: ProxiedPath) => Promise<void>;
}

type DataLinkDialogProps = CreateLinkDialog | DeleteLinkDialog;

function CreateLinkBtn({
  onConfirm
}: {
  onConfirm: () => Promise<void>;
}): JSX.Element {
  return (
    <Button
      variant="outline"
      color="error"
      className="!rounded-md flex items-center gap-2"
      onClick={async () => {
        await onConfirm();
      }}
    >
      Create Data Link
    </Button>
  );
}

function DeleteLinkBtn({
  proxiedPath,
  setShowDataLinkDialog,
  handleDeleteDataLink
}: {
  proxiedPath: ProxiedPath;
  setShowDataLinkDialog: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteDataLink: (proxiedPath: ProxiedPath) => Promise<void>;
}): JSX.Element {
  return (
    <Button
      variant="outline"
      color="error"
      className="!rounded-md flex items-center gap-2 hover:text-background focus:text-background"
      onClick={async () => {
        await handleDeleteDataLink(proxiedPath);
        setShowDataLinkDialog(false);
      }}
    >
      Delete Data Link
    </Button>
  );
}

function CancelBtn({
  setPendingToolKey,
  setShowDataLinkDialog,
  onCancel
}: {
  setPendingToolKey?: React.Dispatch<React.SetStateAction<PendingToolKey>>;
  setShowDataLinkDialog?: React.Dispatch<React.SetStateAction<boolean>>;
  onCancel?: () => void;
}): JSX.Element {
  return (
    <Button
      variant="outline"
      className="!rounded-md flex items-center gap-2"
      onClick={() => {
        if (onCancel) {
          onCancel();
        } else {
          if (setPendingToolKey) {
            setPendingToolKey(null);
          }
          if (setShowDataLinkDialog) {
            setShowDataLinkDialog(false);
          }
        }
      }}
    >
      Cancel
    </Button>
  );
}

function BtnContainer({
  children
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <div className="flex gap-4">{children}</div>;
}

export default function DataLinkDialog(
  props: DataLinkDialogProps
): JSX.Element {
  const { fileBrowserState } = useFileBrowserContext();
  const { pathPreference, areDataLinksAutomatic } = usePreferencesContext();
  const { zonesAndFileSharePathsMap } = useZoneAndFspMapContext();
  const [localAreDataLinksAutomatic] = React.useState(areDataLinksAutomatic);

  function getDisplayPath(): string {
    const fspKey =
      props.action === 'delete'
        ? makeMapKey('fsp', props.proxiedPath.fsp_name)
        : fileBrowserState.currentFileSharePath
          ? makeMapKey('fsp', fileBrowserState.currentFileSharePath.name)
          : '';

    const pathFsp = fspKey
      ? (zonesAndFileSharePathsMap[fspKey] as FileSharePath)
      : null;
    const targetPath =
      props.action === 'delete'
        ? props.proxiedPath.path
        : fileBrowserState.currentFileOrFolder
          ? fileBrowserState.currentFileOrFolder.path
          : '';

    return pathFsp && targetPath
      ? getPreferredPathForDisplay(pathPreference, pathFsp, targetPath)
      : '';
  }
  const displayPath = getDisplayPath();

  return (
    <FgDialog
      open={props.showDataLinkDialog}
      onClose={() => {
        if (props.action === 'create') {
          props.setPendingToolKey(null);
        }
        props.setShowDataLinkDialog(false);
      }}
    >
      <div className="flex flex-col gap-4 my-4">
        {props.action === 'create' && localAreDataLinksAutomatic ? (
          <> </>
        ) : props.action === 'create' && !localAreDataLinksAutomatic ? (
          <>
            <TextWithFilePath
              text="Are you sure you want to create a data link for this path?"
              path={displayPath}
            />
            <Typography className="text-foreground">
              If you share the data link with internal collaborators, they will
              be able to view this data.
            </Typography>
            <div className="flex flex-col gap-2">
              <Typography className="font-semibold text-foreground">
                Don't ask me this again:
              </Typography>
              <AutomaticLinksToggle />
            </div>
            <BtnContainer>
              <CreateLinkBtn onConfirm={props.onConfirm} />
              <CancelBtn onCancel={props.onCancel} />
            </BtnContainer>
          </>
        ) : null}
        {props.action === 'delete' && localAreDataLinksAutomatic ? (
          <>
            <TextWithFilePath
              text="Are you sure you want to delete the data link for this path?"
              path={displayPath}
            />
            <Typography className="text-foreground">
              <span className="font-semibold">Warning:</span> The existing data
              link to this data will be deleted. Collaborators who previously
              received the link will no longer be able to access it.
            </Typography>
            <BtnContainer>
              <DeleteLinkBtn
                proxiedPath={props.proxiedPath}
                setShowDataLinkDialog={props.setShowDataLinkDialog}
                handleDeleteDataLink={props.handleDeleteDataLink}
              />
              <CancelBtn setShowDataLinkDialog={props.setShowDataLinkDialog} />
            </BtnContainer>
            <Typography className="text-foreground">
              <span className="font-semibold">Note:</span> Automatic data links
              are currently enabled. To disable this feature, click the checkbox
              below before deleting this data link.
            </Typography>
            <AutomaticLinksToggle />
          </>
        ) : props.action === 'delete' && !localAreDataLinksAutomatic ? (
          <>
            <TextWithFilePath
              text="Are you sure you want to delete the data link for this path?"
              path={displayPath}
            />
            <Typography className="text-foreground">
              <span className="font-semibold">Warning:</span> The existing data
              link to this data will be deleted. Collaborators who previously
              received the link will no longer be able to access it. You can
              create a new data link at any time by navigating to the file path
              and clicking on one of the data viewers.
            </Typography>
            <BtnContainer>
              <DeleteLinkBtn
                proxiedPath={props.proxiedPath}
                setShowDataLinkDialog={props.setShowDataLinkDialog}
                handleDeleteDataLink={props.handleDeleteDataLink}
              />
              <CancelBtn setShowDataLinkDialog={props.setShowDataLinkDialog} />
            </BtnContainer>
          </>
        ) : null}
      </div>
    </FgDialog>
  );
}
