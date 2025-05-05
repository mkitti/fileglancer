import { useState } from 'react';
import { getAPIPathRoot, sendPostRequest } from '../utils';
import { useFileBrowserContext } from '../contexts/FileBrowserContext';
import { useCookiesContext } from '../contexts/CookiesContext';

export default function useMakeNewFolder() {
  const [newFolderName, setNewFolderName] = useState<string>('');
  const { fetchAndFormatFilesForDisplay } = useFileBrowserContext();
  const { cookies } = useCookiesContext();

  async function makeNewFolder(path: string, subpath: string) {
    try {
      await sendPostRequest(
        `${getAPIPathRoot()}api/fileglancer/files/${path}?subpath=${subpath}/${newFolderName}`,
        cookies['_xsrf'],
        { type: 'directory' }
      );
      fetchAndFormatFilesForDisplay(`${path}?subpath=${subpath}`);
    } catch (error) {
      console.error(
        `Error making new folder with path ${path}/${subpath}/${newFolderName}:`,
        error
      );
    }
  }
  return { makeNewFolder, newFolderName, setNewFolderName };
}
