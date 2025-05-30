import React from 'react';
import {
  Switch,
  IconButton,
  Typography,
  Button
} from '@material-tailwind/react';
import {
  EllipsisHorizontalCircleIcon,
  LinkIcon,
  TrashIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline';
import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import useSharingDialog from '@/hooks/useSharingDialog';
import SharingDialog from '@/components/ui/Dialogs/SharingDialog';

type ProxiedPathRowProps = {
  item: ProxiedPath;
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

export default function ProxiedPathRow({ item }: ProxiedPathRowProps) {
  const { showSharingDialog, setShowSharingDialog } = useSharingDialog();
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  const handleCopyUrl = (sharing_key: string) => {
    const url = `${window.location.origin}/shared/${sharing_key}`;
    navigator.clipboard.writeText(url);
    setMenuOpenId(null);
  };

  const handleOpenBrowse = (fsp_mount_path: string, path: string) => {
    window.open(
      `/fg/browse?subpath=${encodeURIComponent(fsp_mount_path + '/' + path)}`,
      '_blank'
    );
    setMenuOpenId(null);
  };

  return (
    <>
      <div
        key={item.sharing_key}
        className="grid grid-cols-[0.8fr_2fr_2fr_1.5fr_0.5fr] gap-4 items-center px-4 py-3 border-b last:border-b-0 border-surface hover:bg-primary-light/20 relative"
      >
        {/* Sharing switch */}
        <div className="flex items-center gap-2">
          <label
            htmlFor={`share-switch-${item.sharing_key}`}
            className="flex flex-col items-center gap-1"
          >
            <Typography
              as="label"
              htmlFor={`share-switch-${item.sharing_key}`}
              className="cursor-pointer text-foreground text-xs"
            >
              Unshare
            </Typography>
          </label>
          <Switch
            id={`share-switch-${item.sharing_key}`}
            className="bg-secondary-light border-secondary-light hover:!bg-secondary-light/80 hover:!border-secondary-light/80"
            onClick={() => {
              setShowSharingDialog(true);
            }}
            checked
          />
        </div>
        {/* Sharing name */}
        <Typography variant="small" className="font-medium text-foreground">
          {item.sharing_name}
        </Typography>
        {/* Mount path */}
        <Typography variant="small" className="text-foreground">
          {item.fsp_mount_path}/{item.path}
        </Typography>
        {/* Date shared */}
        <Typography variant="small" className="text-foreground">
          {formatDateString(item.created_at)}
        </Typography>
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
          {menuOpenId === item.sharing_key && (
            <div className="absolute z-10 right-0 top-8 bg-background border border-surface rounded shadow min-w-[180px]">
              <Button
                variant="ghost"
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-foreground hover:bg-primary-light/30"
                onClick={() => handleOpenBrowse(item.fsp_mount_path, item.path)}
              >
                <FolderOpenIcon className="w-5 h-5" />
                Open in Browse
              </Button>
              <Button
                variant="ghost"
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-foreground hover:bg-primary-light/30"
                onClick={() => handleCopyUrl(item.sharing_key)}
              >
                <LinkIcon className="w-5 h-5" />
                Copy sharing URL
              </Button>
              <Button
                variant="ghost"
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                onClick={() => setShowSharingDialog(true)}
              >
                <TrashIcon className="w-5 h-5" />
                Unshare
              </Button>
            </div>
          )}
        </div>
      </div>
      {showSharingDialog ? (
        <SharingDialog
          isImageShared={true}
          filePathWithoutFsp={item.path}
          showSharingDialog={showSharingDialog}
          setShowSharingDialog={setShowSharingDialog}
        />
      ) : null}
    </>
  );
}
