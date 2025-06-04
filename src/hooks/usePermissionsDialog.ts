import React from 'react';
import toast from 'react-hot-toast';

import {
  sendFetchRequest,
  removeLastSegmentFromPath,
  getFileFetchPath
} from '@/utils';
import { useCookiesContext } from '@/contexts/CookiesContext';
import type { FileOrFolder } from '@/shared.types';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

export default function usePermissionsDialog() {
  const [showAlert, setShowAlert] = React.useState<boolean>(false);
  const { cookies } = useCookiesContext();
  const { handleFileBrowserNavigation, currentFileSharePath } =
    useFileBrowserContext();

  async function handleChangePermissions(
    targetItem: FileOrFolder,
    localPermissions: FileOrFolder['permissions']
  ) {
    if (!currentFileSharePath) {
      toast.error('No file share path selected.');
      return;
    }

    const fetchPath = getFileFetchPath(
      currentFileSharePath.name,
      targetItem.path
    );

    try {
      console.log('Change permissions for item:', targetItem);
      await sendFetchRequest(
        `/api/fileglancer/files/${currentFileSharePath?.name}?subpath=${targetItem.path}`,
        'PATCH',
        cookies['_xsrf'],
        {
          permissions: localPermissions
        }
      );
      await fetchAndFormatFilesForDisplay(
        `${currentFileSharePath?.name}?subpath=${removeLastSegmentFromPath(targetItem.path)}`
      );
      toast.success(
        `Successfully updated permissions for ${currentFileSharePath?.name}/${targetItem.path}`
      );
    } catch (error) {
      toast.error(
        `Error updating permissions for ${currentFileSharePath?.name}/${targetItem.path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    setShowAlert(true);
  }

  return { handleChangePermissions, showAlert, setShowAlert };
}
