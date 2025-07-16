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

type FileBrowserResponse = {
  info: FileOrFolder;
  files: FileOrFolder[];
};

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
  refreshFiles: () => Promise<void>;
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
    log.debug('Updating fileState:', newState);
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

    // Update fileState with complete, consistent data
    updateFileState({
      isFileBrowserReady: ready,
      currentFileSharePath: sharePath,
      currentFolder: folder,
      files: fileList,
      fetchErrorMsg: errorMsg
    });
    
    // Update local states for individual parts
    if (ready) {
      log.debug('Ready state is true, updating local states');
      setIsFileBrowserReady(true);
      setCurrentFileSharePath(sharePath);
      setCurrentFolder(folder);
      setFiles(fileList);
      setFetchErrorMsg(errorMsg);
    }
    else {
      log.debug('Ready state is false, updating local states');
      setIsFileBrowserReady(false);
      setCurrentFileSharePath(null);
      setCurrentFolder(null);
      setFiles([]);
      setFetchErrorMsg(errorMsg);
    }

  }, [updateFileState]);

  const { showBoundary } = useErrorBoundary();
  const { cookies } = useCookiesContext();
  const { zonesAndFileSharePathsMap, isZonesMapReady } =
    useZoneAndFspMapContext();

  // Function to fetch files for the current FSP and current folder
  const fetchFileInfo = React.useCallback(
    async (fspName: string, folderName: string): Promise<FileBrowserResponse> => {
      const url = getFileBrowsePath(fspName, folderName);

      const response = await sendFetchRequest(url, 'GET', cookies['_xsrf']);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          if (data.info && data.info.owner) {
            throw new Error(`You do not have permission to list this folder. Contact the owner (${data.info.owner}) for access.`);
          } else {
            throw new Error('You do not have permission to list this folder. Contact the owner for access.');
          }
        } else if (response.status === 404) {
          throw new Error('Folder not found');
        }
      }

      return data as FileBrowserResponse;
    },
    [cookies]
  );

  // Fetch files for the given FSP and folder, and update the fileState
  const fetchAndUpdateFileState = React.useCallback(
    async (fsp: FileSharePath, folder: FileOrFolder): Promise<void> => {

      try {
        const response = await fetchFileInfo(fsp.name, folder.path);
        // Sort: directories first, then files; alphabetically within each type
        const files = response.files.sort((a: FileOrFolder, b: FileOrFolder) => {
          if (a.is_dir === b.is_dir) {
            return a.name.localeCompare(b.name);
          }
          return a.is_dir ? -1 : 1;
        }) as FileOrFolder[];

        // Update all states consistently
        log.info('Files loaded. Updating all states!');
        updateAllStates(true, fsp, folder, files, null);
      
      } catch (error) {
        log.error(error);
        showBoundary(error);
        if (error instanceof Error) {
          updateAllStates(true, fsp, folder, [], error.message);
        }
        else {
          updateAllStates(true, fsp, folder, [], 'An unknown error occurred');
        }
      }
    },
    [cookies, showBoundary, updateAllStates, fetchFileInfo]
  );

  // Function to refresh files for the current FSP and current folder
  const refreshFiles = React.useCallback(
    async (): Promise<void> => {
      if (!fileState.currentFileSharePath || !fileState.currentFolder) {
        return;
      }
      log.debug('Refreshing file list');
      await fetchAndUpdateFileState(fileState.currentFileSharePath, fileState.currentFolder);
    },
    [fileState.currentFileSharePath, fileState.currentFolder, fetchAndUpdateFileState]
  );

  // Effect to update currentFolder and propertiesTarget when URL params change
  React.useEffect(() => {
    log.debug('URL likely changed, updating currentFolder and propertiesTarget');
    let cancelled = false;
    const updateCurrentFileSharePathAndFolder = async () => {
      if (!isZonesMapReady || !zonesAndFileSharePathsMap || !fspName || !filePath) {
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
      let urlParamFolder = (await fetchFileInfo(
        urlFsp.name,
        filePath
      )).info as FileOrFolder;

      if (cancelled) return;

      // If urlParamFolder is actually a file, remove the last segment from the path
      // until reaching a directory, then fetch that directory's info
      while (urlParamFolder && !urlParamFolder.is_dir) {
        urlParamFolder = (await fetchFileInfo(
          urlFsp.name,
          removeLastSegmentFromPath(urlParamFolder.path)
        )).info as FileOrFolder;
        if (cancelled) return;
        log.debug('Updated urlParamFolder:', urlParamFolder);
      }

      await fetchAndUpdateFileState(urlFsp, urlParamFolder);
      if (cancelled) return;
      setPropertiesTarget(urlParamFolder);
    
    };
    updateCurrentFileSharePathAndFolder();
    return () => {
      log.debug('Cancelling updateCurrentFileSharePathAndFolder');
      // Cleanup function to prevent state updates if a dependency changes
      // in an asynchronous operation
      cancelled = true;
    };
  }, [
    isZonesMapReady,
    zonesAndFileSharePathsMap,
    fspName,
    filePath,
    updateAllStates,
    fetchAndUpdateFileState
  ]);

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
        refreshFiles,
        propertiesTarget,
        setPropertiesTarget
      }}
    >
      {children}
    </FileBrowserContext.Provider>
  );
};
