import React from 'react';
import { getAPIPathRoot, sendFetchRequest } from '../utils';
import { useCookiesContext } from '../contexts/CookiesContext';
import type { File } from '../shared.types';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';

export default function usePermissionsDialog() {
  const [, setPermissions] = React.useState({});
  const [showAlert, setShowAlert] = React.useState<boolean>(false);
  const [alertContent, setAlertContent] = React.useState<string>('');
  const { cookies } = useCookiesContext();
  const { currentFileSharePath } = useZoneBrowserContext();

  async function handleChangePermissions(
    targetItem: File,
    localPermissions: any
  ) {
    try {
      console.log('Change permissions for item:', targetItem);
      await sendFetchRequest(
        `${getAPIPathRoot()}api/fileglancer/files/${currentFileSharePath?.name}?subpath=${targetItem.path}`,
        'PATCH',
        cookies['_xsrf'],
        {
          permissions: localPermissions
        }
      );
      setPermissions(localPermissions);
      setAlertContent(
        `Successfully updated permissions for ${currentFileSharePath?.name}/${targetItem.path}`
      );
    } catch (error) {
      setAlertContent(
        `Error updating permissions for ${currentFileSharePath?.name}/${targetItem.path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    setShowAlert(true);
  }

  return { handleChangePermissions, showAlert, setShowAlert, alertContent };
}
