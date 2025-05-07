import { useState } from 'react';
import type { File } from '../shared.types';
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

  async function addNewFolder(path: string, subpath: string) {
    await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/files/${path}?subpath=${subpath}/${newName}`,
      'POST',
      cookies['_xsrf'],
      { type: 'directory' }
    );
    await fetchAndFormatFilesForDisplay(`${path}?subpath=${subpath}`);
  }

  async function renameItem(
    fileSharePathName: string,
    originalPath: string,
    originalPathWithoutFileName: string
  ) {
    const newPath = `${originalPathWithoutFileName}/${newName}`;
    await sendFetchRequest(
      `${getAPIPathRoot()}api/fileglancer/files/${fileSharePathName}?subpath=${originalPath}`,
      'PATCH',
      cookies['_xsrf'],
      { path: newPath }
    );
    await fetchAndFormatFilesForDisplay(
      `${fileSharePathName}?subpath=${originalPathWithoutFileName}`
    );
  }

  async function handleDialogSubmit(targetItem: File) {
    setShowAlert(false);
    if (currentFileSharePath) {
      const fileSharePathName = currentFileSharePath?.name;
      const subpathToFile = targetItem.path;
      const subpathWithoutFileName = removeLastSegmentFromPath(subpathToFile);

      try {
        switch (namingDialogType) {
          case 'newFolder':
            console.log(
              `Creating new folder at path: ${fileSharePathName}/${subpathWithoutFileName}/${newName}`
            );
            await addNewFolder(fileSharePathName, subpathWithoutFileName);
            break;
          case 'renameItem':
            console.log(
              `Renaming item at path: ${fileSharePathName}/${subpathToFile} to ${newName}`
            );
            await renameItem(
              fileSharePathName,
              subpathToFile,
              subpathWithoutFileName
            );
            break;
          default:
            throw new Error('Invalid type provided to handleDialogSubmit');
        }
        const alertContent =
          namingDialogType === 'renameItem'
            ? `Renamed item at path: ${fileSharePathName}/${subpathToFile} to ${newName}`
            : namingDialogType === 'newFolder'
              ? `Created new folder at path: ${fileSharePathName}/${subpathWithoutFileName}/${newName}`
              : '';
        setAlertContent(alertContent);
      } catch (error) {
        const errorContent =
          namingDialogType === 'renameItem'
            ? `Error renaming item at path: ${fileSharePathName}/${subpathToFile} to ${newName}`
            : namingDialogType === 'newFolder'
              ? `Error creating new folder at path: ${fileSharePathName}/${subpathWithoutFileName}/${newName}`
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
