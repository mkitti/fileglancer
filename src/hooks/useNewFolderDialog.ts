import React from 'react';

import { getFileBrowsePath, sendFetchRequest, joinPaths } from '@/utils';
import { handleError } from '@/utils/errorHandling';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { useCookiesContext } from '@/contexts/CookiesContext';
import type { Result } from '@/shared.types';

export default function useNewFolderDialog() {
  const [newName, setNewName] = React.useState<string>('');

  const { currentFolder, refreshFiles } = useFileBrowserContext();
  const { currentFileSharePath } = useFileBrowserContext();
  const { cookies } = useCookiesContext();

  async function handleNewFolderSubmit(): Promise<Result<void>> {
    if (!currentFileSharePath) {
      return await handleError(new Error('No file share path selected.'));
    }
    if (!currentFolder) {
      return await handleError(new Error('No current file or folder selected.'));
    }
    try {
      const response = await sendFetchRequest(
        getFileBrowsePath(
          currentFileSharePath.name,
          joinPaths(currentFolder.path, newName)
        ),
        'POST',
        cookies['_xsrf'],
        {
          type: 'directory'
        }
      );
      if (response.ok) {
        return await refreshFiles();
      } else {
        return await handleError(response);
      }
    } catch (error) {
      return await handleError(error);
    }
  }

  return {
    handleNewFolderSubmit,
    newName,
    setNewName
  };
}
