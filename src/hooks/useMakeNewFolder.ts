import { useState } from 'react';
import { getAPIPathRoot, sendPostRequest } from '../utils';
import { useFileBrowserContext } from '../contexts/FileBrowserContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';
import { useCookiesContext } from '../contexts/CookiesContext';

export default function useMakeNewFolder() {
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showNewFolderAlert, setShowNewFolderAlert] = useState<boolean>(false);
  const [newFolderAlertContent, setNewFolderAlertContent] =
    useState<string>('');

  const { fetchAndFormatFilesForDisplay, dirArray } = useFileBrowserContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const { cookies } = useCookiesContext();

  function handleNewFolderSubmit() {
    if (currentFileSharePath) {
      addNewFolder(
        currentFileSharePath.name,
        dirArray.slice(1, dirArray.length).join('/')
      );
    }
  }

  async function addNewFolder(path: string, subpath: string) {
    setShowNewFolderAlert(false);
    try {
      await sendPostRequest(
        `${getAPIPathRoot()}api/fileglancer/files/${path}?subpath=${subpath}/${newFolderName}`,
        cookies['_xsrf'],
        { type: 'directory' }
      );
      fetchAndFormatFilesForDisplay(`${path}?subpath=${subpath}`);
      setNewFolderAlertContent(`Successfully created folder: ${newFolderName}`);
      setShowNewFolderAlert(true);
    } catch (error) {
      setNewFolderAlertContent(
        `Error making new folder with path ${path}/${subpath}/${newFolderName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setShowNewFolderAlert(true);
    }
  }
  return {
    handleNewFolderSubmit,
    newFolderName,
    setNewFolderName,
    showNewFolderAlert,
    setShowNewFolderAlert,
    newFolderAlertContent
  };
}
