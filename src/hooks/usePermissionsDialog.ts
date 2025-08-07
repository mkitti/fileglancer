import React from 'react';

import { sendFetchRequest, getFileBrowsePath } from '@/utils';
import { useCookiesContext } from '@/contexts/CookiesContext';
import type {  Result } from '@/shared.types';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import {  handleError } from '@/utils/errorHandling';

export default function usePermissionsDialog() {
  const { cookies } = useCookiesContext();
  const { fileBrowserState, refreshFiles } = useFileBrowserContext();

  const [localPermissions, setLocalPermissions] = React.useState(
    fileBrowserState.propertiesTarget
      ? fileBrowserState.propertiesTarget.permissions
      : null
  );

  const [isLoading, setIsLoading] = React.useState(false)

  function handleLocalPermissionChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!localPermissions) {
      return;
    }

    const { name, checked } = event.target;
    const [value, position] = name.split('_');

    setLocalPermissions(prev => {
      if (!prev) {
        return prev; // Ensure the type remains consistent
      }
      const splitPermissions = prev.split('');
      if (checked) {
        splitPermissions.splice(parseInt(position), 1, value);
      } else {
        splitPermissions.splice(parseInt(position), 1, '-');
      }
      const newPermissions = splitPermissions.join('');
      return newPermissions;
    });
  }

  async function handleChangePermissions(): Promise<Result<void>> {
    setIsLoading(true)

    if (!fileBrowserState.currentFileSharePath) {
      return await handleError(
        new Error('Cannot change permissions; no file share path selected')
      );
    }
    if (!fileBrowserState.propertiesTarget) {
      return await handleError(
        new Error('Cannot change permissions; no properties target set')
      );
    }

    const fetchPath = getFileBrowsePath(
      fileBrowserState.currentFileSharePath.name,
      fileBrowserState.propertiesTarget.path
    );

    try {
      const response = await sendFetchRequest(
        fetchPath,
        'PATCH',
        cookies['_xsrf'],
        {
          permissions: localPermissions
        }
      );
      if (response.ok) {
        return await refreshFiles();
      } else {
        return await handleError(response);
      }
    } catch (error) {
      return await handleError(error);
    } finally {
      setIsLoading(false)
    }
  }

  return {
    handleLocalPermissionChange,
    localPermissions,
    handleChangePermissions,
    isLoading
  };
}
