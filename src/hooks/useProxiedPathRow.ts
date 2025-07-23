import log from 'loglevel';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';

import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import { makeBrowseLink } from '@/utils';
import { copyToClipboard } from '@/utils/copyText';
import { FileSharePath } from '@/shared.types';

export default function useProxiedPathRow({
  item,
  setShowDataLinkDialog
}: {
  item: ProxiedPath;
  setShowDataLinkDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { setCurrentFileSharePath } = useFileBrowserContext();
  const navigate = useNavigate();

  // Create navigation link for the file browser
  const browseLink = makeBrowseLink(item.fsp_name, item.path);

  const handleCopyPath = async (displayPath: string) => {
    try {
      await copyToClipboard(displayPath);
      toast.success('Path copied to clipboard');
    } catch (error) {
      log.error('Failed to copy path:', error);
      toast.error('Failed to copy path');
    }
  };

  const handleCopyUrl = async (item: ProxiedPath) => {
    try {
      await copyToClipboard(item.url);
      toast.success('URL copied to clipboard');
    } catch (error) {
      log.error('Failed to copy sharing URL:', error);
      toast.error('Failed to copy URL');
    }
  };

  const handleUnshare = (pathFsp: FileSharePath) => {
    setCurrentFileSharePath(pathFsp);
    setShowDataLinkDialog(true);
  };

  const handleRowClick = () => {
    navigate(browseLink);
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(browseLink);
  };

  return {
    handleCopyPath,
    handleCopyUrl,
    handleUnshare,
    handleRowClick,
    handleNameClick
  };
}
