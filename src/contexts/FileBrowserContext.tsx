import React from 'react';
import { default as log } from '@/logger';
import { FileOrFolder, FileSharePath } from '@/shared.types';
import {
  getFileBrowsePath,
  removeLastSegmentFromPath,
  sendFetchRequest
} from '@/utils';
import { useCookiesContext } from './CookiesContext';
import { useZoneAndFspMapContext } from './ZonesAndFspMapContext';
import { url } from 'inspector';

type FileBrowserContextProviderProps = {
  children: React.ReactNode;
  fspName: string | undefined;
  filePath: string | undefined;
};

type FileBrowserContextType = {
  fspName: string | undefined;
  filePath: string | undefined;
  files: FileOrFolder[];
  currentFolder: FileOrFolder | null;
  currentFileSharePath: FileSharePath | null;
  fetchFiles: (fspName: string, path?: string) => Promise<FileOrFolder[]>;
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
  const [files, setFiles] = React.useState<FileOrFolder[]>([]);
  const [currentFolder, setCurrentFolder] = React.useState<FileOrFolder | null>(
    null
  );
  const [currentFileSharePath, setCurrentFileSharePath] =
    React.useState<FileSharePath | null>(null);

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
      } catch (error: unknown) {
        if (error instanceof Error) {
          log.error(`Failed to fetch file/folder info: ${error.message}`);
        } else {
          log.error(
            'An unknown error occurred while fetching file/folder info'
          );
        }
      }
      return null;
    },
    [cookies]
  );

  // Function to fetch files for a directory
  const fetchFiles = React.useCallback(
    async (fspName: string, path?: string): Promise<FileOrFolder[]> => {
      const url = path
        ? getFileBrowsePath(fspName, path)
        : getFileBrowsePath(fspName);

      try {
        const response = await sendFetchRequest(url, 'GET', cookies['_xsrf']);
        const data = await response.json();

        if (data.files) {
          // Sort: directories first, then files; alphabetically within each type
          return data.files.sort((a: FileOrFolder, b: FileOrFolder) => {
            if (a.is_dir === b.is_dir) {
              return a.name.localeCompare(b.name);
            }
            return a.is_dir ? -1 : 1;
          }) as FileOrFolder[];
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          log.error(`Failed to fetch files: ${error.message}`);
        } else {
          log.error('An unknown error occurred while fetching files');
        }
      }
      return [];
    },
    [cookies]
  );

  // Effect to update context based on URL parameters
  React.useEffect(() => {
    const updateFromUrlParams = async () => {
      // If we don't have an fspName, reset state
      if (!fspName) {
        setCurrentFolder(null);
        setFiles([]);
        return;
      }

      // Find matching FileSharePath from available ones
      if (isZonesMapReady && zonesAndFileSharePathsMap) {
        const allFsps = Object.values(zonesAndFileSharePathsMap).flat();
        const matchingFsp = allFsps.find(
          fsp => fsp.name === fspName
        ) as FileSharePath;

        // Update currentFileSharePath if it's different
        if (
          matchingFsp &&
          (!currentFileSharePath || currentFileSharePath.name !== fspName)
        ) {
          setCurrentFileSharePath(matchingFsp);
        }

        // Fetch file/folder info based on URL parameters
        let urlParamFolder = (await fetchFileOrFolderInfo(
          fspName,
          filePath
        )) as FileOrFolder;

        // If urlParamFolder is actually a file, remove the last segment from the path
        // until reaching a directory, then fetch that directory's info
        while (urlParamFolder && !urlParamFolder.is_dir) {
          urlParamFolder = (await fetchFileOrFolderInfo(
            fspName,
            removeLastSegmentFromPath(urlParamFolder.path)
          )) as FileOrFolder;
        }

        if (
          urlParamFolder &&
          urlParamFolder.is_dir &&
          (!currentFolder ||
            currentFolder.path !== urlParamFolder.path ||
            currentFolder.name !== urlParamFolder.name)
        ) {
          setCurrentFolder(urlParamFolder);
          const fetchedFiles = await fetchFiles(fspName, filePath);
          setFiles(fetchedFiles);
        }
      }
    };

    updateFromUrlParams();
  }, [
    fspName,
    filePath,
    isZonesMapReady,
    zonesAndFileSharePathsMap,
    currentFileSharePath,
    currentFolder,
    fetchFileOrFolderInfo,
    fetchFiles
  ]);

  return (
    <FileBrowserContext.Provider
      value={{
        fspName,
        filePath,
        files,
        currentFolder,
        currentFileSharePath,
        fetchFiles
      }}
    >
      {children}
    </FileBrowserContext.Provider>
  );
};
