import React from 'react';
import { File } from '../shared.types';
import { getAPIPathRoot, sendFetchRequest } from '../utils';
import { useCookiesContext } from './CookiesContext';

type FileBrowserContextType = {
  files: File[];
  currentNavigationPath: File['path'];
  dirArray: string[];
  currentDir: string;
  getFileFetchPath: (path: File['path']) => string;
  setCurrentNavigationPath: React.Dispatch<React.SetStateAction<File['path']>>;
  fetchAndFormatFilesForDisplay: (path: File['path']) => Promise<void>;
};

const FileBrowserContext = React.createContext<FileBrowserContextType | null>(
  null
);

export const useFileBrowserContext = () => {
  const context = React.useContext(FileBrowserContext);
  if (!context) {
    throw new Error('useFileBrowserContext must be used within a FileBrowserContextProvider');
  }
  return context;
};

export const FileBrowserContextProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [currentNavigationPath, setCurrentNavigationPath] =
    React.useState<File['path']>('');
  const [dirArray, setDirArray] = React.useState<string[]>([]);
  const [currentDir, setCurrentDir] = React.useState<string>('');

  const { cookies } = useCookiesContext();

  React.useEffect(() => {
    if (currentNavigationPath) {
      const dirArray = makeDirArray(currentNavigationPath);
      setDirArray(dirArray);
    }
  }, [currentNavigationPath]);

  React.useEffect(() => {
    if (dirArray.length > 1) {
      setCurrentDir(dirArray[dirArray.length - 1]);
    } else {
      setCurrentDir(dirArray[0]);
    }
  }, [dirArray]);

  function makeDirArray(path: string) {
    if (currentNavigationPath.includes('?subpath=')) {
      const firstSegment = currentNavigationPath.split('?subpath=')[0];
      const subpathSegment = currentNavigationPath.split('?subpath=')[1];
      const subpathArray = subpathSegment
        .split('/')
        .filter(item => item !== '');
      return [firstSegment, ...subpathArray];
    } else {
      return [path];
    }
  }

  function getCleanPath(path: File['path']): File['path'] {
    if (path && path.trim() !== '') {
      // Remove leading slash from path if present to avoid double slashes
      return path.trim().startsWith('/')
        ? path.trim().substring(1)
        : path.trim();
    }
    return path;
  }

  function getFileFetchPath(path: File['path']): string {
    return `${getAPIPathRoot()}api/fileglancer/files/${getCleanPath(path)}`;
  }

  async function fetchAndFormatFilesForDisplay(
    path: File['path']
  ): Promise<void> {
    const url = getFileFetchPath(path);

    let data = [];
    try {
      const response = await sendFetchRequest(url, 'GET', cookies['_xsrf']);

      data = await response.json();
      if (data) {
        setCurrentNavigationPath(path);
      }
      if (data.files) {
        // display directories first, then files
        // within a type (directories or files), display alphabetically
        data.files = data.files.sort((a: File, b: File) => {
          if (a.is_dir === b.is_dir) {
            return a.name.localeCompare(b.name);
          }
          return a.is_dir ? -1 : 1;
        });
        setFiles(data.files as File[]);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred');
      }
    }
  }

  return (
    <FileBrowserContext.Provider
      value={{
        files,
        currentNavigationPath,
        dirArray,
        currentDir,
        getFileFetchPath,
        setCurrentNavigationPath,
        fetchAndFormatFilesForDisplay
      }}
    >
      {children}
    </FileBrowserContext.Provider>
  );
};
