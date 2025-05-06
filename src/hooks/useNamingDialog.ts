import { useState } from 'react';
import { getAPIPathRoot, sendFetchRequest } from '../utils';
import { useFileBrowserContext } from '../contexts/FileBrowserContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';
import { useCookiesContext } from '../contexts/CookiesContext';

export default function useNamingDialog() {
  const [newName, setNewName] = useState<string>('');
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertContent, setAlertContent] = useState<string>('');

  const { fetchAndFormatFilesForDisplay, dirArray } = useFileBrowserContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const { cookies } = useCookiesContext();

  async function addNewFolder(path: string, subpath: string) {
    await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/files/${path}?subpath=${subpath}/${newName}`,
      'POST',
      cookies['_xsrf'],
      { type: 'directory' }
    );
  }

  async function renameItem(path: string, subpath: string) {
    await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/files/${path}?subpath=${subpath}`,
      'PATCH',
      cookies['_xsrf'],
      { path: newName }
    );
  }

  function handleDialogSubmit(type: 'newFolder' | 'renameItem') {
    setShowAlert(false);
    if (currentFileSharePath) {
      const path = currentFileSharePath?.name;
      const subpath = dirArray.slice(1, dirArray.length).join('/');
      try {
        switch (type) {
          case 'newFolder':
            addNewFolder(path, subpath);
            break;
          case 'renameItem':
            renameItem(path, subpath);
            break;
          default:
            throw new Error('Invalid type provided to handleDialogSubmit');
        }
        fetchAndFormatFilesForDisplay(`${path}?subpath=${subpath}`);
        setAlertContent(`Successfully created folder: ${newName}`);
      } catch (error) {
        setAlertContent(
          `Error making new folder with path ${path}/${subpath}/${newName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } else if (!currentFileSharePath) {
      setAlertContent('No file share path selected.');
    }
    setShowAlert(true);
  }

  return {
    handleDialogSubmit,
    newName,
    setNewName,
    showAlert,
    setShowAlert,
    alertContent
  };
}
