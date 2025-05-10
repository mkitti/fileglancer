import * as React from 'react';
import {
  IconButton,
  Typography,
  Tabs
} from '@material-tailwind/react';
import {
  DocumentIcon,
  FolderIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import type { File, FileSharePathItem } from '../../../shared.types';
import useCopyPath from '../../../hooks/useCopyPath';
import Overview from './Overview';
import Permissions from './Permissions';
import Convert from './Convert';

export default function PropertiesDrawer({
  propertiesTarget,
  open,
  setShowPropertiesDrawer
}: {
  propertiesTarget: {
    targetFile: File | null;
    fileSharePath: FileSharePathItem | null;
  };
  open: boolean;
  setShowPropertiesDrawer: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    copiedText,
    showCopyAlert,
    setShowCopyAlert,
    copyToClipboard,
    dismissCopyAlert
  } = useCopyPath();

  const fullPath = `${propertiesTarget.fileSharePath?.mount_path}/${propertiesTarget.targetFile?.path}`;

  return (
    <div
      className={`fixed top-[68px] right-0 bottom-0 w-[90%] max-w-[350px] bg-background shadow-lg border-l border-surface shadow-surface transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0 z-50' : 'translate-x-full'}`}
    >
      <div className="flex flex-col h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-4 mb-1">
          <Typography type="h6">Properties</Typography>
          <IconButton
            size="sm"
            variant="ghost"
            color="secondary"
            className="h-8 w-8 rounded-full text-foreground hover:bg-secondary-light/20"
            onClick={() => {
              if (open === true) {
                setShowCopyAlert(false);
              }
              setShowPropertiesDrawer((prev: boolean) => !prev);
            }}
          >
            <XMarkIcon className="h-5 w-5" />
          </IconButton>
        </div>

        {propertiesTarget.targetFile ? (
          <div className="flex items-center gap-2 mt-3 mb-4 max-h-min">
            {propertiesTarget.targetFile.is_dir ? (
              <FolderIcon className="h-5 w-5" />
            ) : (
              <DocumentIcon className="h-5 w-5" />
            )}{' '}
            <Typography className="font-semibold">
              {propertiesTarget.targetFile.name}
            </Typography>
          </div>
        ) : (
          <Typography className="mt-3 mb-4">
            Click on a file or folder to view its properties
          </Typography>
        )}
        {propertiesTarget.targetFile && propertiesTarget.fileSharePath ? (
          <Tabs key="file-properties-tabs" defaultValue="overview">
            <Tabs.List className="w-full rounded-none border-b border-secondary-dark  bg-transparent dark:bg-transparent py-0">
              <Tabs.Trigger
                className="w-full !text-foreground"
                value="overview"
              >
                Overview
              </Tabs.Trigger>

              <Tabs.Trigger
                className="w-full !text-foreground"
                value="permissions"
              >
                Permissions
              </Tabs.Trigger>

              <Tabs.Trigger className="w-full !text-foreground" value="convert">
                Convert
              </Tabs.Trigger>
              <Tabs.TriggerIndicator className="rounded-none border-b-2 border-secondary bg-transparent dark:bg-transparent shadow-none" />
            </Tabs.List>

            <Tabs.Panel value="overview">
              <Overview
                fullPath={fullPath}
                file={propertiesTarget.targetFile}
                copiedText={copiedText}
                showCopyAlert={showCopyAlert}
                copyToClipboard={copyToClipboard}
                dismissCopyAlert={dismissCopyAlert}
              />
            </Tabs.Panel>

            <Tabs.Panel value="permissions">
              <Permissions file={propertiesTarget.targetFile} />
            </Tabs.Panel>

            <Tabs.Panel value="convert">
              <Convert />
            </Tabs.Panel>
          </Tabs>
        ) : null}
      </div>
    </div>
  );
}
