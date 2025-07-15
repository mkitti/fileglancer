import React from 'react';
import { default as log } from '@/logger';
import { useErrorBoundary } from 'react-error-boundary';

import type { FileOrFolder, FileSharePath } from '@/shared.types';
import {
  getFileBrowsePath,
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

// TODO: In the future we could use this unified state in the clients of this context, instead of the 
// individual local states. This would ensure future consistency and would be easier to reason about. 
export interface FileState {
  isFileBrowserReady: boolean;
  currentFileSharePath: FileSharePath | null;
  currentFolder: FileOrFolder | null;
  files: FileOrFolder[];
  fetchErrorMsg: string | null;
}

type FileBrowserContextType = {
  fileState: FileState;
  isFileBrowserReady: boolean;
  fspName: string | undefined;
  filePath: string | undefined;
  files: FileOrFolder[];
  currentFolder: FileOrFolder | null;
  currentFileSharePath: FileSharePath | null;
  fetchErrorMsg: string | null;
  fetchAndSetFiles: (fspName: string, path?: string) => Promise<void>;
  propertiesTarget: FileOrFolder | null;
  setPropertiesTarget: React.Dispatch<
    React.SetStateAction<FileOrFolder | null>
  >;
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
  // Local states for individual parts
  const [isFileBrowserReady, setIsFileBrowserReady] = React.useState(false);
  const [currentFileSharePath, setCurrentFileSharePath] = React.useState<FileSharePath | null>(null);
  const [currentFolder, setCurrentFolder] = React.useState<FileOrFolder | null>(null);
  const [files, setFiles] = React.useState<FileOrFolder[]>([]);
  const [fetchErrorMsg, setFetchErrorMsg] = React.useState<string | null>(null);

  // Unified state that keeps a consistent view of the file browser
  const [fileState, setFileState] = React.useState<FileState>({
    isFileBrowserReady: false,
    currentFileSharePath: null,
    currentFolder: null,
    files: [],
    fetchErrorMsg: null
  });

  const [propertiesTarget, setPropertiesTarget] =
    React.useState<FileOrFolder | null>(null);

  // Function to update fileState with complete, consistent data
  const updateFileState = React.useCallback((newState: Partial<FileState>) => {
    setFileState(prev => ({
      ...prev,
      ...newState
    }));
  }, []);

  // Function to update all states consistently
  const updateAllStates = React.useCallback((
    ready: boolean,
    sharePath: FileSharePath | null,
    folder: FileOrFolder | null,
    fileList: FileOrFolder[],
    errorMsg: string | null
  ) => {
    setIsFileBrowserReady(ready);
    setCurrentFileSharePath(sharePath);
    setCurrentFolder(folder);
    setFiles(fileList);
    setFetchErrorMsg(errorMsg);
    
    // Update fileState with complete, consistent data
    updateFileState({
      isFileBrowserReady: ready,
      currentFileSharePath: sharePath,
      currentFolder: folder,
      files: fileList,
      fetchErrorMsg: errorMsg
    });
  }, [updateFileState]);

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

        if (!response.ok) {
          if (response.status === 403) {
            // Don't set error state here - let the calling function handle it
            log.warn('Permission denied for folder:', path);
          } else if (response.status === 404) {
            showBoundary(new Error('Folder not found'));
          }
        }

        if (data && data['info']) {
          return data['info'] as FileOrFolder;
        }
      } catch (error) {
        log.error(error);
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
      let errorMsg: string | null = null;

      try {
        const response = await sendFetchRequest(url, 'GET', cookies['_xsrf']);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 403) {
            if (data.info && data.info.owner) {
              errorMsg = `You do not have permission to list this folder. Contact the owner (${data.info.owner}) for access.`;
            } else {
              errorMsg = 'You do not have permission to list this folder. Contact the owner for access.';
            }
          } else if (response.status === 404) {
            showBoundary(new Error('Folder not found'));
          }
        }

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
        log.error(error);
        showBoundary(error);
      }
      
      // Update all states consistently
      updateAllStates(true, currentFileSharePath, currentFolder, files, errorMsg);
    },
    [cookies, showBoundary, currentFileSharePath, currentFolder, updateAllStates]
  );

  // Effect to update currentFolder and propertiesTarget when currentFileSharePath or filePath URL param changes
  React.useEffect(() => {
    let cancelled = false;
    const updateCurrentFileSharePathAndFolder = async () => {
      if (!isZonesMapReady || !zonesAndFileSharePathsMap || !fspName) {
        updateAllStates(false, null, null, [], null);
        return;
      }

      const fspKey = makeMapKey('fsp', fspName);
      const urlFsp = zonesAndFileSharePathsMap[fspKey] as FileSharePath;

      if (!urlFsp) {
        log.error(`File share path not found for fspName: ${fspName}`);
        updateAllStates(false, null, null, [], null);
        return;
      }

      // Fetch file/folder info based on URL parameters
      let urlParamFolder = (await fetchFileOrFolderInfo(
        urlFsp.name,
        filePath
      )) as FileOrFolder;

      // If urlParamFolder is actually a file, remove the last segment from the path
      // until reaching a directory, then fetch that directory's info
      while (urlParamFolder && !urlParamFolder.is_dir) {
        urlParamFolder = (await fetchFileOrFolderInfo(
          urlFsp.name,
          removeLastSegmentFromPath(urlParamFolder.path)
        )) as FileOrFolder;
        log.debug('Updated urlParamFolder:', urlParamFolder);
      }

      if (!cancelled) {
        setPropertiesTarget(urlParamFolder);
        // Update all states consistently - files will be fetched in the next effect
        updateAllStates(false, urlFsp, urlParamFolder, [], null);
      }
    };
    updateCurrentFileSharePathAndFolder();
    return () => {
      // Cleanup function to prevent state updates if a dependency changes
      // in an asynchronous operation
      cancelled = true;
    };
  }, [
    isZonesMapReady,
    zonesAndFileSharePathsMap,
    fspName,
    filePath,
    fetchFileOrFolderInfo,
    updateAllStates
  ]);

  // Effect to fetch files when currentFolder changes
  React.useEffect(() => {
    let cancelled = false;
    const updateFiles = async () => {
      if (!currentFileSharePath || !currentFolder) {
        updateAllStates(true, currentFileSharePath, currentFolder, [], null);
        return;
      }
      await fetchAndSetFiles(currentFileSharePath.name, currentFolder.path);
    };
    if (currentFolder && currentFileSharePath) {
      updateFiles();
    } else {
      updateAllStates(true, currentFileSharePath, currentFolder, [], null);
    }
    return () => {
      // Cleanup function to prevent state updates if a dependency changes
      // in an asynchronous operation
      cancelled = true;
    };
  }, [currentFolder, currentFileSharePath, fetchAndSetFiles, updateAllStates]);

  return (
    <FileBrowserContext.Provider
      value={{
        fileState,
        isFileBrowserReady,
        fspName,
        filePath,
        files,
        currentFolder,
        currentFileSharePath,
        fetchErrorMsg,
        fetchAndSetFiles,
        propertiesTarget,
        setPropertiesTarget
      }}
    >
      {children}
    </FileBrowserContext.Provider>
  );
};
