import type { FileOrFolder, Result } from '@/shared.types';
import { getFileBrowsePath, sendFetchRequest } from '@/utils';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import {
  handleError,
  handleBadResponse,
  createSuccess
} from '@/utils/errorHandling';

export default function useDeleteDialog() {
  const { cookies } = useCookiesContext();
  const { fileBrowserState, refreshFiles } = useFileBrowserContext();

  async function handleDelete(targetItem: FileOrFolder): Promise<Result<void>> {
    if (!fileBrowserState.currentFileSharePath) {
      return handleError(
        new Error('Current file share path not set; cannot delete item')
      );
    }

    const fetchPath = getFileBrowsePath(
      fileBrowserState.currentFileSharePath.name,
      targetItem.path
    );

    try {
      const response = await sendFetchRequest(
        fetchPath,
        'DELETE',
        cookies['_xsrf']
      );
      if (!response.ok) {
        return handleBadResponse(response);
      } else {
        await refreshFiles();
        return createSuccess();
      }
    } catch (error) {
      return handleError(error);
    }
  }

  return { handleDelete };
}
