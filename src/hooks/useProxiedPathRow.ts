import log from 'loglevel';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';

import useCopyPath from '@/hooks/useCopyPath';
import useCopyPath from '@/hooks/useCopyPath';
import { makeBrowseLink } from '@/utils';

export default function useProxiedPathRow() {
  const { setCurrentFileSharePath } = useFileBrowserContext();
  const { copyToClipboard } = useCopyPath();
  const navigate = useNavigate();

  // Create navigation link for the file browser
  const browseLink = makeBrowseLink(item.fsp_name, item.path);

  const handleCopyPath = async displayPath => {
    try {
      await copyToClipboard(displayPath);
      toast.success('Path copied to clipboard');
    } catch (error) {
      log.error('Failed to copy path:', error);
      toast.error('Failed to copy path');
    }
  };

  const handleCopyUrl = async item => {
    try {
      await copyToClipboard(item.url);
      toast.success('URL copied to clipboard');
    } catch (error) {
      log.error('Failed to copy sharing URL:', error);
      toast.error('Failed to copy URL');
    }
  };

  const handleUnshare = item => {
    setCurrentFileSharePath(item.fsp_name);
    setShowSharingDialog(true);
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
