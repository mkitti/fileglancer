import { useState } from 'react';
import toast from 'react-hot-toast';

import { sendFetchRequest } from '../utils';
import { useFileBrowserContext } from '../contexts/FileBrowserContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';
import { useCookiesContext } from '../contexts/CookiesContext';

export default function useNewFolderDialog() {
  const [newName, setNewName] = useState<string>('');
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertContent, setAlertContent] = useState<string>('');

  const { fetchAndFormatFilesForDisplay } = useFileBrowserContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const { cookies } = useCookiesContext();

  async function addNewFolder(subpath: string) {
    await sendFetchRequest(
      `/api/fileglancer/files/${currentFileSharePath?.name}?subpath=${subpath}${newName}`,
      'POST',
      cookies['_xsrf'],
      { type: 'directory' }
    );
    await fetchAndFormatFilesForDisplay(
      `${currentFileSharePath?.name}?subpath=${subpath}`
    );
  }

  async function handleNewFolderSubmit(subpath: string) {
    setShowAlert(false);
    if (currentFileSharePath) {
      try {
        await addNewFolder(subpath);
        const alertContent = `Created new folder at path: ${currentFileSharePath.name}/${subpath}${newName}`;
        toast.success(alertContent);
        return true;
      } catch (error) {
        const errorContent = `Error creating new folder at path: ${currentFileSharePath.name}/${subpath}${newName}`;
        setAlertContent(
          `${errorContent}. Error details: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return false;
      }
    } else if (!currentFileSharePath) {
      setAlertContent('No file share path selected.');
      setShowAlert(true);
      return false;
    }
  }

  return {
    handleNewFolderSubmit,
    newName,
    setNewName,
    showAlert,
    setShowAlert,
    alertContent
  };
}
