import { Tooltip, Typography } from '@material-tailwind/react';

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

  return (
    <>
      {/* Sharing name */}
      <Tooltip>
        <Tooltip.Trigger className="max-w-full truncate">
          <Typography className="text-foreground">
            {item.sharing_name}
          </Typography>
        </Tooltip.Trigger>
        <Tooltip.Content>{item.sharing_name}</Tooltip.Content>
      </Tooltip>
      {/* Mount path */}
      <Tooltip>
        <Tooltip.Trigger className="max-w-full truncate">
          <Typography as={FgStyledLink} to={browseLink} className="truncate">
            {displayPath}
          </Typography>
        </Tooltip.Trigger>
        <Tooltip.Content>{displayPath}</Tooltip.Content>
      </Tooltip>
      {/* Date shared */}
      <Tooltip>
        <Tooltip.Trigger className="max-w-full truncate">
          <Typography className="text-foreground truncate">
            {formatDateString(item.created_at)}
          </Typography>
        </Tooltip.Trigger>
        <Tooltip.Content>{formatDateString(item.created_at)}</Tooltip.Content>
      </Tooltip>
      {/* Actions */}
      <div onClick={e => e.stopPropagation()}>
        <DataLinksActionsMenu<ProxiedPathRowActionProps>
          menuItems={menuItems}
          actionProps={actionProps}
        />
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
