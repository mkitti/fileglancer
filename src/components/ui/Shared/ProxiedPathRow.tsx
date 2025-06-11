import { Switch, IconButton, Tooltip, Typography } from '@material-tailwind/react';
import { EllipsisHorizontalCircleIcon } from '@heroicons/react/24/outline';
import {TbShareOff} from 'react-icons/tb';
import log from 'loglevel';
import toast from 'react-hot-toast';

import SharingDialog from '@/components/ui/Dialogs/SharingDialog';
import type { FileSharePath } from '@/shared.types';
import { getPreferredPathForDisplay, makeMapKey, makeProxiedPathUrl } from '@/utils';
import useSharingDialog from '@/hooks/useSharingDialog';
import useCopyPath from '@/hooks/useCopyPath';
import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import { useZoneAndFspMapContext } from '@/contexts/ZonesAndFspMapContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

type ProxiedPathRowProps = {
  item: ProxiedPath;
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
};

function formatDateString(dateStr: string) {
  // If dateStr does not end with 'Z' or contain a timezone offset, treat as UTC
  let normalized = dateStr;
  if (!/Z$|[+-]\d{2}:\d{2}$/.test(dateStr)) {
    normalized = dateStr + 'Z';
  }
  const date = new Date(normalized);
  return date.toLocaleString();
}

export default function ProxiedPathRow({
  item,
  menuOpenId,
  setMenuOpenId
}: ProxiedPathRowProps) {
  const { showSharingDialog, setShowSharingDialog } = useSharingDialog();
  const { copyToClipboard } = useCopyPath();
  const {pathPreference} = usePreferencesContext();
  const {zonesAndFileSharePathsMap} = useZoneAndFspMapContext();
  const {setCurrentFileSharePath} = useFileBrowserContext();

  const pathFsp = zonesAndFileSharePathsMap[makeMapKey('fsp', item.fsp_name)] as FileSharePath;
  const displayPath = getPreferredPathForDisplay(pathPreference, pathFsp, item.path);
  const proxiedPathUrl = makeProxiedPathUrl(item);

  const handleCopyUrl = async() => {
    try{
      await copyToClipboard(proxiedPathUrl);
      toast.success('URL copied to clipboard');
    } catch (error) {
      log.error('Failed to copy sharing URL:', error);
      toast.error('Failed to copy URL');
  };
}

  return (
    <>
      <div
        key={item.sharing_key}
        className="grid grid-cols-[0.5fr_1.5fr_2.5fr_1.5fr_0.5fr] gap-4 items-center px-4 py-3 border-b last:border-b-0 border-surface hover:bg-primary-light/20 relative"
      >
        {/* Unshare button */}
        <IconButton
            variant='ghost'
            className="p-1 self-start max-w-fit"
            onClick={() => {
              setCurrentFileSharePath(pathFsp);
              setShowSharingDialog(true);
            }}
          >
          <TbShareOff className="w-6 h-6 p-1 text-foreground rounded-full border border-foreground" />
        </IconButton>
        {/* Sharing name */}
        <Tooltip>
          <Tooltip.Trigger className="max-w-full truncate">
            <Typography variant="small" className="text-left text-foreground truncate">
              {item.sharing_name}
            </Typography>
          </Tooltip.Trigger>
          <Tooltip.Content>{item.sharing_name}</Tooltip.Content>
        </Tooltip>
        {/* Mount path */}
        <Tooltip>
            <Tooltip.Trigger className="max-w-full truncate">
            <Typography variant="small" className="text-left text-foreground truncate">
              {displayPath}
            </Typography>
          </Tooltip.Trigger>
          <Tooltip.Content>{displayPath}</Tooltip.Content>
        </Tooltip>
        {/* Date shared */}
        <Tooltip>
          <Tooltip.Trigger className="max-w-full truncate">
            <Typography variant="small" className="text-left text-foreground truncate">
              {formatDateString(item.created_at)}
            </Typography>
          </Tooltip.Trigger>
          <Tooltip.Content>{formatDateString(item.created_at)}</Tooltip.Content>
        </Tooltip>
        {/* Actions */}
        <div className="flex justify-center relative">
          <IconButton
            variant="ghost"
            onClick={() =>
              setMenuOpenId(
                menuOpenId === item.sharing_key ? null : item.sharing_key
              )
            }
            className="p-1"
          >
            <EllipsisHorizontalCircleIcon className="w-6 h-6 text-foreground" />
          </IconButton>
          {/* Context menu */}
          {menuOpenId === item.sharing_key ? (
            <div className="absolute z-10 right-0 top-8 bg-background shadow-lg shadow-surface rounded-md p-2 min-w-[180px] border border-surface">
              <div className="flex flex-col gap-2">
                <Typography
                  className="flex items-center gap-2 text-sm p-1 cursor-pointer text-secondary-light hover:bg-secondary-light/30 transition-colors whitespace-nowrap"
                  onClick={handleCopyUrl}
                >
                  Copy sharing URL
                </Typography>
                <Typography
                  className="flex items-center gap-2 text-sm p-1 cursor-pointer text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                  onClick={() => {setCurrentFileSharePath(pathFsp)
                    setShowSharingDialog(true)}}
                >
                  Unshare
                </Typography>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {/* Sharing dialog */}
      {showSharingDialog ? (
        <SharingDialog
          isImageShared={true}
          filePathWithoutFsp={item.path}
          showSharingDialog={showSharingDialog}
          setShowSharingDialog={setShowSharingDialog}
          proxiedPath={item}
        />
      ) : null}
    </>
  );
}
