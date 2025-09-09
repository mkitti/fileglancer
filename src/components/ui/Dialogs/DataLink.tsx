import React from 'react';
import { Button, Typography } from '@material-tailwind/react';
import toast from 'react-hot-toast';

import {
  ProxiedPath,
  useProxiedPathContext
} from '@/contexts/ProxiedPathContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import { useZoneAndFspMapContext } from '@/contexts/ZonesAndFspMapContext';
import { getPreferredPathForDisplay, makeMapKey } from '@/utils';
import type { FileSharePath } from '@/shared.types';
import FgDialog from './FgDialog';
import TextWithFilePath from './TextWithFilePath';
import AutomaticLinksToggle from '@/components/ui/PreferencesPage/AutomaticLinksToggle';

type DataLinkDialogProps = {
  action: 'create' | 'delete';
  showDataLinkDialog: boolean;
  setShowDataLinkDialog: React.Dispatch<React.SetStateAction<boolean>>;
  proxiedPath: ProxiedPath | null;
  pendingNavigationUrl?: string | null;
  setPendingNavigationUrl?: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function DataLinkDialog({
  action,
  showDataLinkDialog,
  setShowDataLinkDialog,
  proxiedPath,
  pendingNavigationUrl,
  setPendingNavigationUrl
}: DataLinkDialogProps): JSX.Element {
  const { createProxiedPath, deleteProxiedPath, refreshProxiedPaths } =
    useProxiedPathContext();
  const { fileBrowserState } = useFileBrowserContext();
  const { pathPreference, automaticDataLinks } = usePreferencesContext();
  const { zonesAndFileSharePathsMap } = useZoneAndFspMapContext();

  const fspKey = proxiedPath
    ? makeMapKey('fsp', proxiedPath.fsp_name)
    : fileBrowserState.currentFileSharePath
      ? makeMapKey('fsp', fileBrowserState.currentFileSharePath.name)
      : '';

  if (fspKey === '') {
    return <>{toast.error('Valid file share path or proxied path required')}</>;
  }

  const pathFsp = zonesAndFileSharePathsMap[fspKey] as FileSharePath;
  const targetPath = proxiedPath
    ? proxiedPath.path
    : fileBrowserState.currentFileOrFolder
      ? fileBrowserState.currentFileOrFolder.path
      : '';

  if (!targetPath) {
    return <>{toast.error('Valid current folder or proxied path required')}</>;
  }

  const displayPath = getPreferredPathForDisplay(
    pathPreference,
    pathFsp,
    targetPath
  );

  return (
    <FgDialog
      open={showDataLinkDialog}
      onClose={() => {
        if (setPendingNavigationUrl) {
          setPendingNavigationUrl(null);
        }
        setShowDataLinkDialog(false);
      }}
    >
      {/* TODO: Move Janelia-specific text elsewhere */}
      {action === 'delete' ? (
        <div className="my-8 text-foreground">
          <TextWithFilePath
            text="Are you sure you want to delete the data link for this path?"
            path={displayPath}
          />
          {automaticDataLinks ? (
            <div className="flex flex-col gap-4 mt-4">
              <Typography className="mt-4">
                <span className="font-semibold">Warning:</span> The existing
                data link to this data will be deleted. Collaborators who
                previously received the link will no longer be able to access
                it.
              </Typography>
              <Typography>
                However, you currently have automatic data links enabled, so a
                new data link will be created automatically the next time you
                navigate to this file path in Fileglancer.
              </Typography>
              <Typography>
                <span className="font-semibold">
                  If you do NOT want new data links to be created automatically
                </span>
                , disable this feature below, and then delete the link.
              </Typography>
              <AutomaticLinksToggle />
            </div>
          ) : (
            <Typography className="mt-4">
              <span className="font-semibold">Warning:</span> The existing data
              link to this data will be deleted. Collaborators who previously
              received the link will no longer be able to access it. You can
              create a new data link at any time by navigating to the file path
              and clicking on one of the data viewers.
            </Typography>
          )}
        </div>
      ) : (
        <div className="my-8 text-foreground">
          <TextWithFilePath
            text="Are you sure you want to create a data link for this path?"
            path={displayPath}
          />
          <Typography className="mt-4">
            If you share the data link with internal collaborators, they will be
            able to view this data.
          </Typography>
        </div>
      )}
      {!proxiedPath && action === 'create' ? (
        <div className="mb-8">
          <Typography className="mb-2 font-semibold text-foreground">
            Don't ask me this again:
          </Typography>
          <AutomaticLinksToggle />
        </div>
      ) : null}

      <div className="flex gap-2">
        {!proxiedPath && action === 'create' ? (
          <Button
            variant="outline"
            color="error"
            className="!rounded-md flex items-center gap-2"
            onClick={async () => {
              const createProxiedPathResult = await createProxiedPath();
              if (createProxiedPathResult.success) {
                toast.success(
                  `Successfully created data link for ${displayPath}`
                );
                const refreshResult = await refreshProxiedPaths();
                if (!refreshResult.success) {
                  toast.error(
                    `Error refreshing proxied paths: ${refreshResult.error}`
                  );
                  return;
                }

                if (pendingNavigationUrl) {
                  window.open(
                    pendingNavigationUrl,
                    '_blank',
                    'noopener,noreferrer'
                  );
                  if (setPendingNavigationUrl) {
                    setPendingNavigationUrl(null);
                  }
                }
              } else {
                toast.error(
                  `Error creating data link: ${createProxiedPathResult.error}`
                );
              }
              setShowDataLinkDialog(false);
            }}
          >
            Create Data Link
          </Button>
        ) : null}
        {action === 'delete' ? (
          <Button
            variant="outline"
            color="error"
            className="!rounded-md flex items-center gap-2 hover:text-background focus:text-background"
            onClick={async () => {
              if (!proxiedPath) {
                toast.error('Proxied path not found');
                return;
              }

              const deleteResult = await deleteProxiedPath(proxiedPath);
              if (!deleteResult.success) {
                toast.error(`Error deleting data link: ${deleteResult.error}`);
                return;
              } else {
                toast.success(
                  `Successfully deleted data link for ${displayPath}`
                );

                const refreshResult = await refreshProxiedPaths();
                if (!refreshResult.success) {
                  toast.error(
                    `Error refreshing proxied paths: ${refreshResult.error}`
                  );
                  return;
                }
              }

              setShowDataLinkDialog(false);
            }}
          >
            Delete Data Link
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="!rounded-md flex items-center gap-2"
          onClick={() => {
            if (setPendingNavigationUrl) {
              setPendingNavigationUrl(null);
            }
            setShowDataLinkDialog(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </FgDialog>
  );
}
