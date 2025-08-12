import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import { copyToClipboard } from '@/utils/copyText';
import { createSuccess, handleError } from '@/utils/errorHandling';
import { FileSharePath, Result } from '@/shared.types';

export default function useProxiedPathRow({
  setShowDataLinkDialog
}: {
  setShowDataLinkDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { setCurrentFileSharePath } = useFileBrowserContext();

  const handleCopyPath = async (displayPath: string): Promise<Result<void>> => {
    try {
      await copyToClipboard(displayPath);
    } catch (error) {
      return handleError(error);
    }
    return createSuccess(undefined);
  };

  const handleCopyUrl = async (item: ProxiedPath): Promise<Result<void>> => {
    try {
      await copyToClipboard(item.url);
    } catch (error) {
      return handleError(error);
    }
    return createSuccess(undefined);
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
