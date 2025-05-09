import React from 'react';

import {
  Zone,
  FileSharePath,
  ZonesAndFileSharePathsMap
} from '../shared.types';
import { getAPIPathRoot, sendFetchRequest } from '../utils';
import { useCookiesContext } from '../contexts/CookiesContext';

type ZoneBrowserContextType = {
  zonesAndFileSharePathsMap: ZonesAndFileSharePathsMap;
  currentNavigationZone: string | null;
  setCurrentNavigationZone: React.Dispatch<React.SetStateAction<string | null>>;
  currentFileSharePath: FileSharePath | null;
  setCurrentFileSharePath: React.Dispatch<
    React.SetStateAction<FileSharePath | null>
  >;
  updateZonesAndFileSharePathsMap: () => Promise<void>;
};

const ZoneBrowserContext = React.createContext<ZoneBrowserContextType | null>(
  null
);

export const useZoneBrowserContext = () => {
  const context = React.useContext(ZoneBrowserContext);
  if (!context) {
    throw new Error(
      'useZoneBrowserContext must be used within a ZoneBrowserProvider'
    );
  }
  return context;
};

export const ZoneBrowserContextProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [zonesAndFileSharePathsMap, setZonesAndFileSharePathsMap] =
    React.useState<ZonesAndFileSharePathsMap>({});
  const [currentNavigationZone, setCurrentNavigationZone] = React.useState<
    string | null
  >(null);
  const [currentFileSharePath, setCurrentFileSharePath] =
    React.useState<FileSharePath | null>(null);

  const { cookies } = useCookiesContext();

  async function getZones(): Promise<{ paths: FileSharePath[] }> {
    const url = `${getAPIPathRoot()}api/fileglancer/file-share-paths`;
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
  }

  function createZonesAndFileSharePathsMap(
    newZonesAndFileSharePathsMap: ZonesAndFileSharePathsMap,
    item: FileSharePath
  ) {
    // Zones first
    // If the zone doesn't exist in the map, create it
    if (!newZonesAndFileSharePathsMap[`zone_${item.zone}`]) {
      newZonesAndFileSharePathsMap[`zone_${item.zone}`] = {
        name: item.zone,
        fileSharePaths: []
      } as Zone;
    }
    // If/once zone exists, check if file share path exists in the zone
    // And update zone accordingly
    if (newZonesAndFileSharePathsMap[`zone_${item.zone}`]) {
      const existingZone = newZonesAndFileSharePathsMap[
        `zone_${item.zone}`
      ] as Zone;
      if (
        !existingZone.fileSharePaths.some(
          (existingItem: FileSharePath) => existingItem.name === item.name
        )
      ) {
        existingZone.fileSharePaths.push(item);
        newZonesAndFileSharePathsMap[`zone_${item.zone}`] = existingZone;
      }
    }

    // Then add file share paths to the map
    if (!newZonesAndFileSharePathsMap[`fsp_${item.name}`]) {
      newZonesAndFileSharePathsMap[`fsp_${item.name}`] = item;
    }
  }

  async function updateZonesAndFileSharePathsMap() {
    let rawData: { paths: FileSharePath[] } = { paths: [] };
    try {
      rawData = await getZones();
      const newZonesAndFileSharePathsMap: Record<string, FileSharePath | Zone> =
        {};
      rawData.paths.forEach(item => {
        createZonesAndFileSharePathsMap(newZonesAndFileSharePathsMap, item);
      });
      setZonesAndFileSharePathsMap(newZonesAndFileSharePathsMap);
      console.log(newZonesAndFileSharePathsMap);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred when fetching zones');
      }
    }
  }

  // When app first loads, fetch file share paths
  // and create a map of zones and file share paths
  React.useEffect(() => {
    if (Object.keys(zonesAndFileSharePathsMap).length === 0) {
      updateZonesAndFileSharePathsMap();
    }
  }, []);

  return (
    <ZoneBrowserContext.Provider
      value={{
        zonesAndFileSharePathsMap,
        currentNavigationZone,
        setCurrentNavigationZone,
        currentFileSharePath,
        setCurrentFileSharePath,
        updateZonesAndFileSharePathsMap
      }}
    >
      {children}
    </ZoneBrowserContext.Provider>
  );
};
