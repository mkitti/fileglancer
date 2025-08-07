import log from 'loglevel';
import toast from 'react-hot-toast';

import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import { copyToClipboard } from '@/utils/copyText';
import { FileSharePath } from '@/shared.types';

export default function useProxiedPathRow({
  setShowDataLinkDialog
}: {
  setShowDataLinkDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { setCurrentFileSharePath } = useFileBrowserContext();

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

  return {
    handleCopyPath,
    handleCopyUrl,
    handleUnshare
  };
}
