import toast from 'react-hot-toast';
import {
  getAPIPathRoot,
  sendFetchRequest,
  removeLastSegmentFromPath
} from '@/utils/index';
import { useCookiesContext } from '../contexts/CookiesContext';
import type { FileOrFolder } from '../shared.types';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';
import { useFileBrowserContext } from '../contexts/FileBrowserContext';

export default function useDeleteDialog() {
  const { cookies } = useCookiesContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const { fetchAndFormatFilesForDisplay } = useFileBrowserContext();

  async function handleDelete(targetItem: FileOrFolder) {
    try {
      await sendFetchRequest(
        `${getAPIPathRoot()}api/fileglancer/files/${currentFileSharePath?.name}?subpath=${targetItem.path}`,
        'DELETE',
        cookies['_xsrf']
      );
      await fetchAndFormatFilesForDisplay(
        `${currentFileSharePath?.name}?subpath=${removeLastSegmentFromPath(targetItem.path)}`
      );
      toast.success(
        `Successfully deleted ${currentFileSharePath?.name}/${targetItem.path}`
      );
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
