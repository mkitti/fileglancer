import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import type { Result } from '@/shared.types';
import { createSuccess, handleError } from '@/utils/errorHandling';

export default function useToolbar() {
  const { fileBrowserState } = useFileBrowserContext();
  const { handleFavoriteChange } = usePreferencesContext();

  async function handleFavoriteClick(): Promise<Result<boolean>> {
    if (
      !fileBrowserState.currentFileSharePath ||
      !fileBrowserState.currentFolder
    ) {
      return handleError(
        new Error('A file share path must be set to favorite an item')
      );
    }
    try {
      if (
        !fileBrowserState.currentFolder ||
        fileBrowserState.currentFolder.path === '.'
      ) {
        const isFavoriteAdded = await handleFavoriteChange(
          fileBrowserState.currentFileSharePath,
          'fileSharePath'
        );
        return createSuccess(isFavoriteAdded)
      } else {
        const isFavoriteAdded = await handleFavoriteChange(
          {
            type: 'folder',
            folderPath: fileBrowserState.currentFolder.path,
            fsp: fileBrowserState.currentFileSharePath
          },
          'folder'
        );
      return createSuccess(isFavoriteAdded)
      }
    } catch (error) {
      return handleError(error);
    }
  }

  return { handleFavoriteClick };
}
