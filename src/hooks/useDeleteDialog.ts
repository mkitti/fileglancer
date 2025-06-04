import toast from 'react-hot-toast';

import type { FileOrFolder } from '@/shared.types';
import {
  getFileFetchPath,
  sendFetchRequest,
  removeLastSegmentFromPath
} from '@/utils';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

export default function useDeleteDialog() {
  const { cookies } = useCookiesContext();
  const { handleFileBrowserNavigation, currentFileSharePath } =
    useFileBrowserContext();

  async function handleDelete(targetItem: FileOrFolder) {
    try {
      await sendFetchRequest(fetchPath, 'DELETE', cookies['_xsrf']);
      await handleFileBrowserNavigation({
        fspName: currentFileSharePath.name,
        path: removeLastSegmentFromPath(targetItem.path)
      });
      toast.success(`Successfully deleted ${targetItem.path}`);
      return true;
    } catch (error) {
      toast.error(
        `Error deleting ${currentFileSharePath?.name}/${targetItem.path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      return false;
    }
  }

  return { handleDelete };
}
