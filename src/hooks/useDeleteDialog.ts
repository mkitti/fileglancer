import type { ApiFailure, FileOrFolder, Result } from '@/shared.types';
import { getFileBrowsePath, sendFetchRequest } from '@/utils';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { handleError, createSuccess, handleBadResponse } from '@/utils/errorHandling';

export default function useDeleteDialog() {
  const { cookies } = useCookiesContext();
  const { currentFileSharePath, refreshFiles } = useFileBrowserContext();

  async function handleDelete(targetItem: FileOrFolder): Promise<Result<void>> {
    if (!currentFileSharePath) {
      return handleError(new Error('Current file share path not set; cannot delete item'))
    }

    const fetchPath = getFileBrowsePath(
      currentFileSharePath.name,
      targetItem.path
    );

    try {
      const response = await sendFetchRequest(fetchPath, 'DELETE', cookies['_xsrf']);
      if (!response.ok){
        return handleBadResponse(response)
      }
      await refreshFiles();
    } catch (error) {
      return handleError(error)
    }
    return createSuccess()
  }

  return { handleDelete };
}
