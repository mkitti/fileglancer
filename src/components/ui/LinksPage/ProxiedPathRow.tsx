import { Typography } from '@material-tailwind/react';

import DataLinkDialog from '@/components/ui/Dialogs/DataLink';
import DataLinksActionsMenu from '@/components/ui/Menus/DataLinksActions';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import { useZoneAndFspMapContext } from '@/contexts/ZonesAndFspMapContext';
import useProxiedPathRow from '@/hooks/useProxiedPathRow';
import {
  formatDateString,
  getPreferredPathForDisplay,
  makeMapKey
} from '@/utils';
import useDataLinkDialog from '@/hooks/useDataLinkDialog';
import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import type { FileSharePath } from '@/shared.types';
import type { MenuItem } from '@/components/ui/Menus/FgMenuItems';
import FgTooltip from '../widgets/FgTooltip';

type ProxiedPathRowProps = {
  item: ProxiedPath;
};

type ProxiedPathRowActionProps = {
  handleCopyPath: (path: string) => void;
  handleCopyUrl: (item: ProxiedPath) => void;
  handleUnshare: (pathFsp: FileSharePath) => void;
  item: ProxiedPath;
  displayPath: string;
  pathFsp: FileSharePath | undefined;
};

export default function ProxiedPathRow({ item }: ProxiedPathRowProps) {
  const { showDataLinkDialog, setShowDataLinkDialog } = useDataLinkDialog();
  const { pathPreference } = usePreferencesContext();
  const { zonesAndFileSharePathsMap } = useZoneAndFspMapContext();

  const {
    handleCopyPath,
    handleCopyUrl,
    handleUnshare,
    handleRowClick,
    handleNameClick
  } = useProxiedPathRow({ item, setShowDataLinkDialog });

  const pathFsp = zonesAndFileSharePathsMap[
    makeMapKey('fsp', item.fsp_name)
  ] as FileSharePath;

  const displayPath = getPreferredPathForDisplay(
    pathPreference,
    pathFsp,
    item.path
  );

  const menuItems: MenuItem<ProxiedPathRowActionProps>[] = [
    {
      name: 'Copy path',
      action: (props: ProxiedPathRowActionProps) =>
        props.handleCopyPath(props.displayPath)
    },
    {
      name: 'Copy sharing link (S3-compatible URL)',
      action: (props: ProxiedPathRowActionProps) =>
        props.handleCopyUrl(props.item)
    },
    {
      name: 'Unshare',
      action: (props: ProxiedPathRowActionProps) =>
        props.handleUnshare(props.pathFsp as FileSharePath),
      color: 'text-red-600'
    }
  ];

  const actionProps = {
    handleCopyPath,
    handleCopyUrl,
    handleUnshare,
    item,
    displayPath,
    pathFsp
  };

  const tooltipTriggerClasses = 'max-w-full truncate';

  return (
    <>
      <div
        key={item.sharing_key}
        className="grid grid-cols-[1.5fr_2.5fr_1.5fr_1fr] gap-4 items-center px-4 py-3 border-b last:border-b-0 border-surface hover:bg-primary-light/20 relative cursor-pointer hover:bg-surface-light"
        onClick={handleRowClick}
      >
        {/* Sharing name */}
        <FgTooltip
          label={item.sharing_name}
          triggerClasses={tooltipTriggerClasses}
        >
          <Typography
            variant="small"
            className="text-left text-primary-light truncate hover:underline"
            onClick={handleNameClick}
          >
            {item.sharing_name}
          </Typography>
        </FgTooltip>

        {/* Mount path */}
        <FgTooltip label={displayPath} triggerClasses={tooltipTriggerClasses}>
          <Typography
            variant="small"
            className="text-left text-foreground truncate"
          >
            {displayPath}
          </Typography>
        </FgTooltip>

        {/* Date shared */}
        <FgTooltip
          label={formatDateString(item.created_at)}
          triggerClasses={tooltipTriggerClasses}
        >
          <Typography
            variant="small"
            className="text-left text-foreground truncate"
          >
            {formatDateString(item.created_at)}
          </Typography>
        </FgTooltip>

        {/* Actions */}
        <div onClick={e => e.stopPropagation()}>
          <DataLinksActionsMenu<ProxiedPathRowActionProps>
            menuItems={menuItems}
            actionProps={actionProps}
          />
        </div>
      </div>
      {/* Sharing dialog */}
      {showDataLinkDialog ? (
        <DataLinkDialog
          isImageShared={true}
          filePathWithoutFsp={item.path}
          showDataLinkDialog={showDataLinkDialog}
          setShowDataLinkDialog={setShowDataLinkDialog}
          proxiedPath={item}
        />
      ) : null}
    </>
  );
}
