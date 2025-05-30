import React from 'react';
import { Switch, IconButton, Typography } from '@material-tailwind/react';
import { EllipsisHorizontalCircleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router';
import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import useSharingDialog from '@/hooks/useSharingDialog';
import SharingDialog from '@/components/ui/Dialogs/SharingDialog';
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
  const { fetchAndFormatFilesForDisplay } = useFileBrowserContext();

  const handleCopyUrl = (fsp_mount_path: string, path: string) => {
    // Potential solution
    const url = `${window.location.origin}/fg/browse/${fsp_mount_path}?subpath=${path}`;
    navigator.clipboard.writeText(url);
    setMenuOpenId(null);
  };

  const handleOpenBrowse = async (fsp_mount_path: string, path: string) => {
    setMenuOpenId(null);
    // Problem: fsp_mount_path does not use underscores like fsp names
    await fetchAndFormatFilesForDisplay(`${fsp_mount_path}/${path}`);
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
          {/* Context menu */}
          {menuOpenId === item.sharing_key ? (
            <div className="absolute z-10 right-0 top-8 bg-background shadow-lg shadow-surface rounded-md p-2 min-w-[180px] border border-surface">
              <div className="flex flex-col gap-2">
                <Typography
                  as={Link}
                  to="/browse"
                  className="flex items-center gap-2 text-sm p-1 cursor-pointer text-secondary-light hover:bg-secondary-light/30 transition-colors whitespace-nowrap"
                  onClick={() =>
                    handleOpenBrowse(item.fsp_mount_path, item.path)
                  }
                >
                  Open in Browse
                </Typography>
                <Typography
                  className="flex items-center gap-2 text-sm p-1 cursor-pointer text-secondary-light hover:bg-secondary-light/30 transition-colors whitespace-nowrap"
                  onClick={() => handleCopyUrl(item.fsp_mount_path, item.path)}
                >
                  Copy sharing URL
                </Typography>
                <Typography
                  className="flex items-center gap-2 text-sm p-1 cursor-pointer text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                  onClick={() => setShowSharingDialog(true)}
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
        />
      ) : null}
    </>
  );
}
