import React from 'react';

import { ZonesAndFileSharePaths, FileSharePathItem } from '../shared.types';
import { getAPIPathRoot, sendGetRequest } from '../utils';
import { useCookiesContext } from '../contexts/CookiesContext';

type ZoneBrowserContextType = {
  zonesAndFileSharePaths: ZonesAndFileSharePaths;
  currentNavigationZone: string | null;
  setCurrentNavigationZone: React.Dispatch<React.SetStateAction<string | null>>;
  currentFileSharePath: string | null;
  setCurrentFileSharePath: React.Dispatch<React.SetStateAction<string | null>>;
  getZonesAndFileSharePaths: () => Promise<void>;
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
  const [zonesAndFileSharePaths, setZonesAndFileSharePaths] =
    React.useState<ZonesAndFileSharePaths>({});
  const [currentNavigationZone, setCurrentNavigationZone] = React.useState<
    string | null
  >(null);
  const [currentFileSharePath, setCurrentFileSharePath] = React.useState<
    string | null
  >(null);

  const { cookies } = useCookiesContext();

  React.useEffect(() => {
    if (Object.keys(zonesAndFileSharePaths).length === 0) {
      getZonesAndFileSharePaths();
    }
  }, [zonesAndFileSharePaths, getZonesAndFileSharePaths]);

  async function getZonesAndFileSharePaths() {
    const url = `${getAPIPathRoot()}api/fileglancer/file-share-paths`;

    try {
      const response = await sendGetRequest(url, cookies['_xsrf']);

      const rawData: { paths: FileSharePathItem[] } = await response.json();
      const unsortedPaths: ZonesAndFileSharePaths = {};

      rawData.paths.forEach(item => {
        if (!unsortedPaths[item.zone]) {
          unsortedPaths[item.zone] = [];
        }

        // Store the entire FileSharePathItem object instead of just a string path
        if (
          !unsortedPaths[item.zone].some(
            existingItem => existingItem.name === item.name
          )
        ) {
          unsortedPaths[item.zone].push(item);
        }
      });

      // Sort the items within each zone alphabetically by name
      Object.keys(unsortedPaths).forEach(zone => {
        unsortedPaths[zone].sort((a, b) => a.name.localeCompare(b.name));
      });

      // Create a new object with alphabetically sorted zone keys
      const sortedPaths: ZonesAndFileSharePaths = {};
      Object.keys(unsortedPaths)
        .sort()
        .forEach(zone => {
          sortedPaths[zone] = unsortedPaths[zone];
        });

      setZonesAndFileSharePaths(sortedPaths);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred');
      }
    }
  }
  return (
    <ZoneBrowserContext.Provider
      value={{
        zonesAndFileSharePaths,
        currentNavigationZone,
        setCurrentNavigationZone,
        currentFileSharePath,
        setCurrentFileSharePath,
        getZonesAndFileSharePaths
      }}
    >
      {children}
    </ZoneBrowserContext.Provider>
  );
};
