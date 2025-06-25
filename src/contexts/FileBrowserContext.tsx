import React from 'react';
import { default as log } from '@/logger';
import { useErrorBoundary } from 'react-error-boundary';

import { FileOrFolder, FileSharePath } from '@/shared.types';
import {
  getFileBrowsePath,
  HTTPError,
  makeMapKey,
  removeLastSegmentFromPath,
  sendFetchRequest
} from '@/utils';
import { useCookiesContext } from './CookiesContext';
import { useZoneAndFspMapContext } from './ZonesAndFspMapContext';

type FileBrowserContextProviderProps = {
  children: React.ReactNode;
  fspName: string | undefined;
  filePath: string | undefined;
};

type FileBrowserContextType = {
  isFileBrowserReady: boolean;
  fspName: string | undefined;
  filePath: string | undefined;
  files: FileOrFolder[];
  currentFolder: FileOrFolder | null;
  currentFileSharePath: FileSharePath | null;
  fetchAndSetFiles: (fspName: string, path?: string) => Promise<void>;
};

const FileBrowserContext = React.createContext<FileBrowserContextType | null>(
  null
);

export const useFileBrowserContext = () => {
  const context = React.useContext(FileBrowserContext);
  if (!context) {
    throw new Error(
      'useFileBrowserContext must be used within a FileBrowserContextProvider'
    );
  }
  return context;
};

// fspName and filePath come from URL parameters, accessed in MainLayout
export const FileBrowserContextProvider = ({
  children,
  fspName,
  filePath
}: FileBrowserContextProviderProps) => {
  const [isFileBrowserReady, setIsFileBrowserReady] = React.useState(true);
  const [files, setFiles] = React.useState<FileOrFolder[]>([]);
  const [currentFolder, setCurrentFolder] = React.useState<FileOrFolder | null>(
    null
  );
  const [currentFileSharePath, setCurrentFileSharePath] =
    React.useState<FileSharePath | null>(null);

  const { showBoundary } = useErrorBoundary();
  const { cookies } = useCookiesContext();
  const { zonesAndFileSharePathsMap, isZonesMapReady } =
    useZoneAndFspMapContext();

  // Function to fetch file/folder information
  const fetchFileOrFolderInfo = React.useCallback(
    async (fspName: string, path?: string): Promise<FileOrFolder | null> => {
      const url = getFileBrowsePath(fspName, path);
      try {
        const response = await sendFetchRequest(url, 'GET', cookies['_xsrf']);
        const data = await response.json();
        if (data && data['info']) {
          return data['info'] as FileOrFolder;
        }
      } catch (error) {
        if (error instanceof HTTPError && error.responseCode === 404) {
          showBoundary(error);
        } else {
          log.error(error);
        }
      }
      return null;
    },
    [cookies, showBoundary]
  );

  // Function to fetch files for the current FSP and current folder
  const fetchAndSetFiles = React.useCallback(
    async (fspName: string, path?: string): Promise<void> => {
      const url = path
        ? getFileBrowsePath(fspName, path)
        : getFileBrowsePath(fspName);

      let files: FileOrFolder[] = [];

      try {
        const response = await sendFetchRequest(url, 'GET', cookies['_xsrf']);
        const data = await response.json();

        if (data.files) {
          // Sort: directories first, then files; alphabetically within each type
          files = data.files.sort((a: FileOrFolder, b: FileOrFolder) => {
            if (a.is_dir === b.is_dir) {
              return a.name.localeCompare(b.name);
            }
            return a.is_dir ? -1 : 1;
          }) as FileOrFolder[];
        }
      } catch (error) {
        if (error instanceof HTTPError && error.responseCode === 404) {
          showBoundary(error);
        } else {
          log.error(error);
        }
      }
      setFiles(files);
    },
    [cookies, showBoundary]
  );

  // Update currentFileSharePath when fspName URL param or zonesAndFileSharePathsMap changes
  React.useEffect(() => {
    // Reset currentFSP state if no zonesAndFileSharePathsMap or if fspName is not provided
    if (!isZonesMapReady || !zonesAndFileSharePathsMap || !fspName) {
      setCurrentFileSharePath(null);
      setCurrentFolder(null);
      return;
    }

    const fspKey = makeMapKey('fsp', fspName);
    const urlFsp = zonesAndFileSharePathsMap[fspKey] as FileSharePath;
    setCurrentFileSharePath(urlFsp || null);
    setCurrentFolder(null);
  }, [fspName, isZonesMapReady, zonesAndFileSharePathsMap]);

  // Effect to update currentFolder when currentFileSharePath or filePath URL param changes
  React.useEffect(() => {
    let cancelled = false;
    const updateCurrentFolder = async () => {
      // Reset folder state if no currentFileSharePath
      if (!currentFileSharePath) {
        setCurrentFolder(null);
        return;
      }

      // Fetch file/folder info based on URL parameters
      let urlParamFolder = (await fetchFileOrFolderInfo(
        currentFileSharePath.name,
        filePath
      )) as FileOrFolder;

      // If urlParamFolder is actually a file, remove the last segment from the path
      // until reaching a directory, then fetch that directory's info
      while (urlParamFolder && !urlParamFolder.is_dir) {
        urlParamFolder = (await fetchFileOrFolderInfo(
          currentFileSharePath.name,
          removeLastSegmentFromPath(urlParamFolder.path)
        )) as FileOrFolder;
        log.debug('Updated urlParamFolder:', urlParamFolder);
      }

      if (!cancelled) {
        setCurrentFolder(urlParamFolder);
      }
    };
    updateCurrentFolder();
    return () => {
      // Cleanup function to prevent state updates if a dependency changes
      // in an asynchronous operation
      cancelled = true;
    };
  }, [filePath, currentFileSharePath, fetchFileOrFolderInfo]);

  // Effect to fetch files when currentFolder changes
  React.useEffect(() => {
    let cancelled = false;
    const updateFiles = async () => {
      setIsFileBrowserReady(false);
      if (!currentFileSharePath || !currentFolder) {
        setFiles([]);
        setIsFileBrowserReady(true);
        return;
      }
      await fetchAndSetFiles(currentFileSharePath.name, currentFolder.path);
      if (!cancelled) {
        setIsFileBrowserReady(true);
      }
    };
    if (currentFolder && currentFileSharePath) {
      updateFiles();
    } else {
      setFiles([]);
      setIsFileBrowserReady(true);
    }
    return () => {
      // Cleanup function to prevent state updates if a dependency changes
      // in an asynchronous operation
      cancelled = true;
    };
  }, [currentFolder, currentFileSharePath, fetchAndSetFiles]);

  return (
    <FileBrowserContext.Provider
      value={{
        isFileBrowserReady,
        fspName,
        filePath,
        files,
        currentFolder,
        currentFileSharePath,
        fetchAndSetFiles
      }}
    >
      {children}
    </FileBrowserContext.Provider>
  );
};
