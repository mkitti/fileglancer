import React from 'react';
import {
  Zone,
  FileOrFolder,
  FileSharePath,
  ZonesAndFileSharePathsMap
} from '@/shared.types';
import { getFileFetchPath, sendFetchRequest, makeMapKey } from '@/utils';
import { useCookiesContext } from './CookiesContext';

type FileBrowserContextType = {
  isZonesMapReady: boolean;
  zonesAndFileSharePathsMap: ZonesAndFileSharePathsMap;
  files: FileOrFolder[];
  currentFileOrFolder: FileOrFolder | null;
  currentFileSharePath: FileSharePath | null;
  setCurrentFileSharePath: React.Dispatch<
    React.SetStateAction<FileSharePath | null>
  >;
  setCurrentFileOrFolder: React.Dispatch<
    React.SetStateAction<FileOrFolder | null>
  >;
  updateCurrentFileOrFolder: (args: {
    fspName: string;
    path?: string;
  }) => Promise<void>;
  handleFileBrowserNavigation: (args: {
    fspName?: string;
    path?: string;
  }) => Promise<void>;
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

export const FileBrowserContextProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [isZonesMapReady, setIsZonesMapReady] = React.useState(false);
  const [zonesAndFileSharePathsMap, setZonesAndFileSharePathsMap] =
    React.useState<ZonesAndFileSharePathsMap>({});
  const [files, setFiles] = React.useState<FileOrFolder[]>([]);
  const [currentFileOrFolder, setCurrentFileOrFolder] =
    React.useState<FileOrFolder | null>(null);
  const [currentFileSharePath, setCurrentFileSharePath] =
    React.useState<FileSharePath | null>(null);

  const { cookies } = useCookiesContext();

  const getZones = React.useCallback(async () => {
    const url = '/api/fileglancer/file-share-paths';
    let rawData: { paths: FileSharePath[] } = { paths: [] };
    try {
      const response = await sendFetchRequest(url, 'GET', cookies['_xsrf']);
      rawData = await response.json();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred');
      }
    }
    return rawData;
  }, [cookies]);

  function createZonesAndFileSharePathsMap(rawData: {
    paths: FileSharePath[];
  }) {
    const newZonesAndFileSharePathsMap: ZonesAndFileSharePathsMap = {};
    rawData.paths.forEach(item => {
      // Zones first
      // If the zone doesn't exist in the map, create it
      const zoneKey = makeMapKey('zone', item.zone);
      if (!newZonesAndFileSharePathsMap[zoneKey]) {
        newZonesAndFileSharePathsMap[zoneKey] = {
          name: item.zone,
          fileSharePaths: []
        } as Zone;
      }
      // If/once zone exists, add file share paths to it
      const existingZone = newZonesAndFileSharePathsMap[zoneKey] as Zone;
      existingZone.fileSharePaths.push(item);

      // Then add file share paths to the map
      const fspKey = makeMapKey('fsp', item.name);
      if (!newZonesAndFileSharePathsMap[fspKey]) {
        newZonesAndFileSharePathsMap[fspKey] = item;
      }
    });
    return newZonesAndFileSharePathsMap;
  }

  function alphabetizeZonesAndFsps(map: ZonesAndFileSharePathsMap) {
    const sortedMap: ZonesAndFileSharePathsMap = {};

    const zoneKeys = Object.keys(map)
      .filter(key => key.startsWith('zone'))
      .sort((a, b) => map[a].name.localeCompare(map[b].name));

    // Add sorted zones to the new map
    zoneKeys.forEach(zoneKey => {
      const zone = map[zoneKey] as Zone;

      // Sort file share paths within the zone
      const sortedFileSharePaths = [...zone.fileSharePaths].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      sortedMap[zoneKey] = {
        ...zone,
        fileSharePaths: sortedFileSharePaths
      };
    });

    // Add the remaining keys (e.g., FSPs) without sorting
    Object.keys(map)
      .filter(key => key.startsWith('fsp'))
      .forEach(fspKey => {
        sortedMap[fspKey] = map[fspKey];
      });

    return sortedMap;
  }

  const updateZonesAndFileSharePathsMap = React.useCallback(async () => {
    let rawData: { paths: FileSharePath[] } = { paths: [] };
    try {
      rawData = await getZones();
      const newZonesAndFileSharePathsMap =
        createZonesAndFileSharePathsMap(rawData);
      const sortedMap = alphabetizeZonesAndFsps(newZonesAndFileSharePathsMap);
      setZonesAndFileSharePathsMap(sortedMap);
      setIsZonesMapReady(true);
      console.log('zones and fsp map in ZoneBrowserContext:', sortedMap);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred when fetching zones');
      }
    }
  }, [getZones]);

  const updateCurrentFileOrFolder = React.useCallback(
    async ({ fspName, path }: { fspName: string; path?: string }) => {
      const url = getFileFetchPath(fspName, path, true);
      try {
        const response = await sendFetchRequest(url, 'GET', cookies['_xsrf']);
        const data = await response.json();
        if (data) {
          setCurrentFileOrFolder(data as FileOrFolder);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error('An unknown error occurred');
        }
      }
    },
    [cookies]
  );

  const fetchAndFormatFilesForDisplay = React.useCallback(
    async ({ fspName, path }: { fspName: string; path?: string }) => {
      const url = path
        ? getFileFetchPath(fspName, path)
        : getFileFetchPath(fspName);

      let data = [];
      try {
        const response = await sendFetchRequest(url, 'GET', cookies['_xsrf']);
        data = await response.json();

        if (data.files) {
          // display directories first, then files
          // within a type (directories or files), display alphabetically
          data.files = data.files.sort((a: FileOrFolder, b: FileOrFolder) => {
            if (a.is_dir === b.is_dir) {
              return a.name.localeCompare(b.name);
            }
            return a.is_dir ? -1 : 1;
          });
          setFiles(data.files as FileOrFolder[]);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error('An unknown error occurred');
        }
      }
    },
    [cookies]
  );

  const handleFileBrowserNavigation = React.useCallback(
    async ({ fspName, path }: { fspName?: string; path?: string }) => {
      const fetchPathFsp = fspName || currentFileSharePath?.name;
      if (!fetchPathFsp) {
        throw new Error('No current file share path set');
      }
      try {
        await fetchAndFormatFilesForDisplay({
          fspName: fetchPathFsp,
          ...(path && { path })
        });
        if (!currentFileOrFolder || currentFileOrFolder.path !== path) {
          await updateCurrentFileOrFolder({
            fspName: fetchPathFsp,
            ...(path && { path })
          });
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(`Failed to navigate: ${error.message}`);
        } else {
          console.error('An unknown error occurred while navigating');
        }
      }
    },
    [
      currentFileSharePath,
      fetchAndFormatFilesForDisplay,
      updateCurrentFileOrFolder,
      currentFileOrFolder
    ]
  );

  // When app first loads, fetch file share paths
  // and create a map of zones and file share paths
  React.useEffect(() => {
    const fetchAndSetInitialFspsAndZones = async () => {
      await updateZonesAndFileSharePathsMap();
    };
    fetchAndSetInitialFspsAndZones();
  }, [updateZonesAndFileSharePathsMap]);

  React.useEffect(() => {
    const setInitialFSP = async () => {
      // If no current file share path is set,
      // set the first file share path from the first zone
      if (isZonesMapReady && !currentFileSharePath) {
        const zones = Object.values(zonesAndFileSharePathsMap).filter(
          (item): item is Zone => (item as Zone).fileSharePaths !== undefined
        );
        const firstFsp =
          zones.length > 0 && zones[0].fileSharePaths.length > 0
            ? zones[0].fileSharePaths[0]
            : null;
        setCurrentFileSharePath(() => firstFsp);
      }
    };
    setInitialFSP();
  }, [isZonesMapReady, zonesAndFileSharePathsMap, currentFileSharePath]);

  React.useEffect(() => {
    const setInitialFiles = async () => {
      if (currentFileSharePath && !currentFileOrFolder) {
        await handleFileBrowserNavigation({
          fspName: currentFileSharePath.name
        });
      }
    };
    setInitialFiles();
  }, [currentFileSharePath, currentFileOrFolder, handleFileBrowserNavigation]);

  return (
    <FileBrowserContext.Provider
      value={{
        isZonesMapReady,
        zonesAndFileSharePathsMap,
        files,
        currentFileOrFolder,
        currentFileSharePath,
        setCurrentFileSharePath,
        setCurrentFileOrFolder,
        updateCurrentFileOrFolder,
        handleFileBrowserNavigation
      }}
    >
      {children}
    </FileBrowserContext.Provider>
  );
};
