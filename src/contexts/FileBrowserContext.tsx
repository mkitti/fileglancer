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
import { url } from 'happy-dom/lib/PropertySymbol.js';
import { set } from 'node_modules/zarrita/dist/src/indexing/set';

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

  // Function to fetch files for a directory
  const fetchAndSetFiles = React.useCallback(
    async (): Promise<void> => {
      if (!currentFileSharePath) {
        log.error('No current file share path set');
        return;
      } else if (!currentFolder) {
        log.error('No current folder set');
        return;
      }

      const url = currentFolder.path
        ? getFileBrowsePath(currentFileSharePath.name, currentFolder.path)
        : getFileBrowsePath(currentFileSharePath.name);

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

  // Update currentFileSharePath based on URL param
   React.useEffect(() => {
    (function () {
      if (!isZonesMapReady || !zonesAndFileSharePathsMap || !fspName ) {
        return;
      }

      // Reset state before updating
      setIsFileBrowserReady(false);
      setCurrentFileSharePath(null);

      const fspKey = makeMapKey('fsp', fspName);
      const urlFsp = zonesAndFileSharePathsMap[fspKey] as FileSharePath;

      if (urlFsp) {
        setCurrentFileSharePath(urlFsp);
        
    }})();

  }, [
    fspName,
    isZonesMapReady,
    setIsFileBrowserReady,
    zonesAndFileSharePathsMap,
    currentFileSharePath,
    setCurrentFileSharePath,
    makeMapKey
  ]);

  // Effect to update currentFolder based on URL parameters
  React.useEffect(() => {
    const updateFolderAndFilesFromUrlParams = async () => {
      if (!currentFileSharePath || (currentFileSharePath.name === fspName && filePath === currentFolder?.path)) {
        return;
      }

      // Reset state before updating
      setCurrentFolder(null);

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

        if (
          urlParamFolder &&
          urlParamFolder.is_dir &&
          (!currentFolder ||
            currentFolder.path !== urlParamFolder.path || (currentFolder.path === urlParamFolder.path && fspName !== currentFileSharePath.name))
        ) {
          setCurrentFolder(urlParamFolder);
        } else if (!urlParamFolder) {
          setCurrentFolder(null);
          setFiles([]);
        }

      }

    updateFolderAndFilesFromUrlParams();
  }, [
    filePath,
    currentFileSharePath,
    currentFolder,
    setCurrentFolder,
    setFiles,
    fetchFileOrFolderInfo,
    fetchAndSetFiles,
  ]);

  // Effect to fetch files when currentFolder changes
  React.useEffect(() => {
    const updateFiles = async ()=>{
    if (!currentFolder) {
      return;
    }
    await fetchAndSetFiles();
    setIsFileBrowserReady(true);
  }
  updateFiles();

  }, [currentFolder, fetchAndSetFiles, setIsFileBrowserReady]);

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
