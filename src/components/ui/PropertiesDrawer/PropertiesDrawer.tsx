import * as React from 'react';
import {
  Button,
  Card,
  IconButton,
  Typography,
  Tabs
} from '@material-tailwind/react';
import toast from 'react-hot-toast';
import { HiOutlineDocument, HiOutlineDuplicate, HiX } from 'react-icons/hi';
import { HiOutlineFolder } from 'react-icons/hi2';

import PermissionsTable from './PermissionsTable';
import OverviewTable from './OverviewTable';
import TicketDetails from './TicketDetails';
import { getPreferredPathForDisplay } from '@/utils';
import { copyToClipboard } from '@/utils/copyText';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import { useTicketContext } from '@/contexts/TicketsContext';
import FgTooltip from '../widgets/FgTooltip';

type PropertiesDrawerProps = {
  togglePropertiesDrawer: () => void;
  setShowPermissionsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConvertFileDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function PropertiesDrawer({
  togglePropertiesDrawer,
  setShowPermissionsDialog,
  setShowConvertFileDialog
}: PropertiesDrawerProps): JSX.Element {
  const { currentFileSharePath, propertiesTarget } = useFileBrowserContext();
  const { pathPreference } = usePreferencesContext();
  const { ticket } = useTicketContext();

  const fullPath = getPreferredPathForDisplay(
    pathPreference,
    currentFileSharePath,
    propertiesTarget?.path
  );

  const tooltipTriggerClasses = 'max-w-[calc(100%-2rem)] truncate';

  return (
    <Card className="w-fit max-w-fit h-full max-h-full overflow-auto p-3 rounded-none shadow-lg flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-1 min-w-full">
        <Typography type="h6">Properties</Typography>
        <IconButton
          size="sm"
          variant="ghost"
          color="secondary"
          className="h-8 w-8 rounded-full text-foreground hover:bg-secondary-light/20"
          onClick={() => {
            togglePropertiesDrawer();
          }}
        >
          <HiX className="icon-default" />
        </IconButton>
      </div>

      {propertiesTarget ? (
        <div className="shrink-0 flex items-center gap-2 mt-3 mb-4 max-h-min min-w-full">
          {propertiesTarget.is_dir ? (
            <HiOutlineFolder className="icon-default" />
          ) : (
            <HiOutlineDocument className="icon-default" />
          )}
          <FgTooltip
            label={propertiesTarget.name}
            triggerClasses={tooltipTriggerClasses}
          >
            <Typography className="font-semibold truncate max-w-full">
              {propertiesTarget?.name}
            </Typography>
          </FgTooltip>
        </div>
      ) : (
        <Typography className="mt-3 mb-4">
          Click on a file or folder to view its properties
        </Typography>
      )}
      {propertiesTarget ? (
        <Tabs
          key="file-properties-tabs"
          defaultValue="overview"
          className="min-w-full"
        >
          <Tabs.List className="min-w-full rounded-none border-b border-secondary-dark  bg-transparent dark:bg-transparent py-0">
            <Tabs.Trigger className="w-full !text-foreground" value="overview">
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

          <Tabs.Panel value="overview" className="min-w-full">
            <div className="group flex justify-between items-center overflow-x-hidden">
              <FgTooltip
                label={fullPath}
                triggerClasses={tooltipTriggerClasses}
              >
                <Typography className="text-foreground font-medium text-sm truncate max-w-full">
                  <span className="!font-bold">Path: </span>
                  {fullPath}
                </Typography>
              </FgTooltip>

              <IconButton
                variant="ghost"
                isCircular
                className="text-transparent group-hover:text-foreground"
                onClick={() => {
                  if (propertiesTarget) {
                    try {
                      copyToClipboard(fullPath);
                      toast.success('Path copied to clipboard!');
                    } catch (error) {
                      toast.error(`Failed to copy path. Error: ${error}`);
                    }
                  }
                }}
              >
                <HiOutlineDuplicate className="icon-small" />
              </IconButton>
            </div>

            <OverviewTable file={propertiesTarget} />
          </Tabs.Panel>

          <Tabs.Panel
            value="permissions"
            className="flex flex-col gap-2 min-w-full"
          >
            <PermissionsTable file={propertiesTarget} />
            <Button
              variant="outline"
              onClick={() => {
                setShowPermissionsDialog(true);
              }}
              className="!rounded-md"
            >
              Change Permissions
            </Button>
          </Tabs.Panel>

          <Tabs.Panel
            value="convert"
            className="flex flex-col gap-2 min-w-full"
          >
            {ticket ? (
              <TicketDetails />
            ) : (
              <>
                <Typography variant="small" className="font-medium">
                  Scientific Computing can help you convert images to OME-Zarr
                  format, suitable for viewing in external viewers like
                  Neuroglancer.
                </Typography>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConvertFileDialog(true);
                  }}
                >
                  Open conversion request
                </Button>
              </>
            )}
          </Tabs.Panel>
        </Tabs>
      ) : null}
    </Card>
  );
}
