import { useState } from 'react';
import {
  getAPIPathRoot,
  sendFetchRequest,
  removeLastSegmentFromPath
} from '../utils';
import { useFileBrowserContext } from '../contexts/FileBrowserContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';
import { useCookiesContext } from '../contexts/CookiesContext';

export default function useNamingDialog() {
  const [showNamingDialog, setShowNamingDialog] = useState<boolean>(false);
  const [namingDialogType, setNamingDialogType] = useState<
    'newFolder' | 'renameItem'
  >('newFolder');
  const [newName, setNewName] = useState<string>('');
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertContent, setAlertContent] = useState<string>('');

  const { fetchAndFormatFilesForDisplay } = useFileBrowserContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const { cookies } = useCookiesContext();

  async function addNewFolder(subpath: string) {
    await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/files/${currentFileSharePath?.name}?subpath=${subpath}/${newName}`,
      'POST',
      cookies['_xsrf'],
      { type: 'directory' }
    );
    await fetchAndFormatFilesForDisplay(`${currentFileSharePath?.name}?subpath=${subpath}`);
  }

  async function renameItem(
    originalPath: string,
    originalPathWithoutFileName: string
  ) {
    const newPath = `${originalPathWithoutFileName}/${newName}`;
    await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/files/${currentFileSharePath?.name}?subpath=${originalPath}`,
      'PATCH',
      cookies['_xsrf'],
      { path: newPath }
    );
    await fetchAndFormatFilesForDisplay(
      `${currentFileSharePath?.name}?subpath=${originalPathWithoutFileName}`
    );
  }

  async function handleDialogSubmit(subpath: string) {
    console.log('handleDialogSubmit called with subpath:', subpath);
    setShowAlert(false);
    if (currentFileSharePath) {
      const originalPathWithoutFileName = removeLastSegmentFromPath(subpath);

      try {
        switch (namingDialogType) {
          case 'newFolder':
            console.log(
              `Creating new folder at path: ${currentFileSharePath.name}/${originalPathWithoutFileName}/${newName}`
            );
            await addNewFolder(subpath);
            break;
          case 'renameItem':
            console.log(
              `Renaming item at path: ${currentFileSharePath.name}/${subpath} to ${newName}`
            );
            await renameItem(
              subpath,
              originalPathWithoutFileName
            );
            break;
          default:
            throw new Error('Invalid type provided to handleDialogSubmit');
        }
        const alertContent =
          namingDialogType === 'renameItem'
            ? `Renamed item at path: ${currentFileSharePath.name}/${subpath} to ${newName}`
            : namingDialogType === 'newFolder'
              ? `Created new folder at path: ${currentFileSharePath.name}/${subpath}/${newName}`
              : '';
        setAlertContent(alertContent);
      } catch (error) {
        const errorContent =
          namingDialogType === 'renameItem'
            ? `Error renaming item at path: ${currentFileSharePath.name}/${subpath} to ${newName}`
            : namingDialogType === 'newFolder'
              ? `Error creating new folder at path: ${currentFileSharePath.name}}/${subpath}/${newName}`
              : '';
        setAlertContent(
          `${errorContent}. Error details: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } else if (!currentFileSharePath) {
      setAlertContent('No file share path selected.');
    }
    setShowAlert(true);
  }
  console.log('show dialog:', showNamingDialog);
  return {
    showNamingDialog,
    setShowNamingDialog,
    handleDialogSubmit,
    namingDialogType,
    setNamingDialogType,
    newName,
    setNewName,
    showAlert,
    setShowAlert,
    alertContent
  };
}
