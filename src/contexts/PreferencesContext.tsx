import React from 'react';

import type { FileSharePath, Zone } from '@/shared.types';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { useZoneBrowserContext } from './ZoneBrowserContext';
import { getAPIPathRoot, sendFetchRequest, makeMapKey } from '@/utils';

export type FolderFavorite = {
  type: 'folder';
  folderPath: string;
  fsp: FileSharePath;
};

// Types for the zone, fsp, and folder information stored to the backend "preferences"
type ZonePreference = Record<string, { type: 'zone'; name: string }>;
type FileSharePathPreference = Record<string, { type: 'fsp'; name: string }>;
export type FolderPreference = Record<
  string,
  { type: 'folder'; folderPath: string; fspName: string }
>;

type PreferencesContextType = {
  pathPreference: ['linux_path'] | ['windows_path'] | ['mac_path'];
  showPathPrefAlert: boolean;
  setShowPathPrefAlert: React.Dispatch<React.SetStateAction<boolean>>;
  handlePathPreferenceSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    localPathPreference: PreferencesContextType['pathPreference']
  ) => void;
  zonePreferenceMap: ZonePreference;
  zoneFavorites: Zone[];
  fileSharePathPreferenceMap: FileSharePathPreference;
  fileSharePathFavorites: FileSharePath[];
  folderPreferenceMap: FolderPreference;
  folderFavorites: FolderFavorite[];
  handleFavoriteChange: (
    item: Zone | FileSharePath | FolderFavorite,
    type: string
  ) => Promise<void>;
};

const PreferencesContext = React.createContext<PreferencesContextType | null>(
  null
);

export const usePreferencesContext = () => {
  const context = React.useContext(PreferencesContext);
  if (!context) {
    throw new Error(
      'usePreferencesContext must be used within a PreferencesProvider'
    );
  }
  return context;
};

export const PreferencesProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [pathPreference, setPathPreference] = React.useState<
    ['linux_path'] | ['windows_path'] | ['mac_path']
  >(['linux_path']);
  const [showPathPrefAlert, setShowPathPrefAlert] = React.useState(false);

  const [zonePreferenceMap, setZonePreferenceMap] =
    React.useState<ZonePreference>({});
  const [zoneFavorites, setZoneFavorites] = React.useState<Zone[]>([]);
  const [fileSharePathPreferenceMap, setFileSharePathPreferenceMap] =
    React.useState<FileSharePathPreference>({});
  const [fileSharePathFavorites, setFileSharePathFavorites] = React.useState<
    FileSharePath[]
  >([]);
  const [folderPreferenceMap, setFolderPreferenceMap] =
    React.useState<FolderPreference>({});
  const [folderFavorites, setFolderFavorites] = React.useState<
    FolderFavorite[]
  >([]);

  const { cookies } = useCookiesContext();
  const { isZonesMapReady, zonesAndFileSharePathsMap } =
    useZoneBrowserContext();

  async function fetchPreferences(key: string) {
    try {
      const data = await sendFetchRequest(
        `${getAPIPathRoot()}api/fileglancer/preference?key=${key}`,
        'GET',
        cookies['_xsrf']
      ).then(response => response.json());
      return data?.value;
    } catch (error) {
      console.log(
        `Potential error fetching preferences, or preference with key ${key} is not set:`,
        error
      );
    }
  }

  function accessMapItems(keys: string[]) {
    const itemsArray = keys.map(key => {
      return zonesAndFileSharePathsMap[key];
    });
    // To help with debugging edge cases
    console.log(
      'length of preference keys list: ',
      keys.length,
      '\n',
      'length of accessed items list: ',
      itemsArray.length
    );
    return itemsArray;
  }

  function updateLocalZonePreferenceStates(updatedMap: ZonePreference) {
    setZonePreferenceMap(updatedMap);
    const updatedZoneFavorites = accessMapItems(
      Object.keys(updatedMap)
    ) as Zone[];
    updatedZoneFavorites.sort((a, b) => a.name.localeCompare(b.name));
    setZoneFavorites(updatedZoneFavorites as Zone[]);
  }

  function updateLocalFspPreferenceStates(updatedMap: FileSharePathPreference) {
    setFileSharePathPreferenceMap(updatedMap);
    const updatedFspFavorites = accessMapItems(
      Object.keys(updatedMap)
    ) as FileSharePath[];
    // Sort based on the storage name, which is what is displayed in the UI
    updatedFspFavorites.sort((a, b) => a.storage.localeCompare(b.storage));
    setFileSharePathFavorites(updatedFspFavorites as FileSharePath[]);
  }

  function updateLocalFolderPreferenceStates(updatedMap: FolderPreference) {
    setFolderPreferenceMap(updatedMap);
    const updatedFolderFavorites = Object.entries(updatedMap).map(
      ([, value]) => {
        const fspKey = makeMapKey('fsp', value.fspName);
        const fsp = zonesAndFileSharePathsMap[fspKey];
        return { type: 'folder', folderPath: value.folderPath, fsp: fsp };
      }
    );
    // Sort by the last segment of folderPath, which is the folder name
    updatedFolderFavorites.sort((a, b) => {
      const aLastSegment = a.folderPath.split('/').pop() || '';
      const bLastSegment = b.folderPath.split('/').pop() || '';
      return aLastSegment.localeCompare(bLastSegment);
    });
    setFolderFavorites(updatedFolderFavorites as FolderFavorite[]);
  }

  React.useEffect(() => {
    (async function () {
      const rawPathPreference = await fetchPreferences('path');
      if (rawPathPreference) {
        console.log('setting initial path preference:', rawPathPreference);
        setPathPreference(rawPathPreference);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (!isZonesMapReady) {
      return;
    }

    (async function () {
      const backendKeys = await fetchPreferences('zone');
      if (backendKeys) {
        updateLocalZonePreferenceStates(backendKeys);
      }
    })();
  }, [isZonesMapReady]);

  React.useEffect(() => {
    if (!isZonesMapReady) {
      return;
    }

    (async function () {
      const backendKeys = await fetchPreferences('fileSharePath');
      if (backendKeys) {
        updateLocalFspPreferenceStates(backendKeys);
      }
    })();
  }, [isZonesMapReady]);

  React.useEffect(() => {
    if (!isZonesMapReady) {
      return;
    }

    (async function () {
      const backendKeys = await fetchPreferences('folder');
      if (backendKeys) {
        updateLocalFolderPreferenceStates(backendKeys);
      }
    })();
  }, [isZonesMapReady]);

  async function savePreferencesToBackend<T>(key: string, value: T) {
    try {
      await sendFetchRequest(
        `${getAPIPathRoot()}api/fileglancer/preference?key=${key}`,
        'PUT',
        cookies['_xsrf'],
        { value: value }
      );
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
    }
  }

  function handlePathPreferenceSubmit(
    event: React.FormEvent<HTMLFormElement>,
    localPathPreference: ['linux_path'] | ['windows_path'] | ['mac_path']
  ) {
    event.preventDefault();
    try {
      savePreferencesToBackend('path', localPathPreference);
      setPathPreference(localPathPreference);
      setShowPathPrefAlert(true);
    } catch (error) {
      console.error('Error updating path preference:', error);
      setShowPathPrefAlert(false);
    }
  }

  function updatePreferenceList<T>(
    key: string,
    itemToUpdate: T,
    favoritesList: Record<string, T>
  ) {
    const updatedFavorites = { ...favoritesList };
    const match = updatedFavorites[key];
    if (match) {
      delete updatedFavorites[key];
    } else if (!match) {
      updatedFavorites[key] = itemToUpdate;
    }
    return updatedFavorites;
  }

  async function handleZoneFavoriteChange(item: Zone) {
    const key = makeMapKey('zone', item.name);
    const updatedZonePreferenceMap = updatePreferenceList(
      key,
      { type: 'zone', name: item.name },
      zonePreferenceMap
    ) as ZonePreference;

    try {
      await savePreferencesToBackend('zone', updatedZonePreferenceMap);
      updateLocalZonePreferenceStates(updatedZonePreferenceMap);
    } catch (error) {
      console.error('Error updating zone favorites:', error);
    }
  }

  async function handleFileSharePathFavoriteChange(item: FileSharePath) {
    const key = makeMapKey('fsp', item.name);
    const updatedFileSharePathMap = updatePreferenceList(
      key,
      { type: 'fsp', name: item.name },
      fileSharePathPreferenceMap
    ) as FileSharePathPreference;

    try {
      await savePreferencesToBackend('fileSharePath', updatedFileSharePathMap);
      updateLocalFspPreferenceStates(updatedFileSharePathMap);
    } catch (error) {
      console.error('Error updating file share path favorites:', error);
    }
  }

  async function handleFolderFavoriteChange(item: FolderFavorite) {
    const folderPrefKey = makeMapKey(
      'folder',
      `${item.fsp.name}_${item.folderPath}`
    );
    const updatedFolderMap = updatePreferenceList(
      folderPrefKey,
      { type: 'folder', folderPath: item.folderPath, fspName: item.fsp.name },
      folderPreferenceMap
    ) as FolderPreference;

    try {
      await savePreferencesToBackend('folder', updatedFolderMap);
      updateLocalFolderPreferenceStates(updatedFolderMap);
    } catch (error) {
      console.error('Error updating folder favorites:', error);
    }
  }

  async function handleFavoriteChange(
    item: Zone | FileSharePath | FolderFavorite,
    type: string
  ) {
    switch (type) {
      case 'zone':
        try {
          await handleZoneFavoriteChange(item as Zone);
        } catch (error) {
          console.log(error);
        }
        break;
      case 'fileSharePath':
        try {
          await handleFileSharePathFavoriteChange(item as FileSharePath);
        } catch (error) {
          console.log(error);
        }
        break;
      case 'folder':
        try {
          await handleFolderFavoriteChange(item as FolderFavorite);
        } catch (error) {
          console.log(error);
        }
        break;
      default:
        console.error('Invalid type provided for handleFavoriteChange:', type);
        break;
    }
  }

  return (
    <PreferencesContext.Provider
      value={{
        pathPreference,
        showPathPrefAlert,
        setShowPathPrefAlert,
        handlePathPreferenceSubmit,
        zonePreferenceMap,
        zoneFavorites,
        fileSharePathPreferenceMap,
        fileSharePathFavorites,
        folderPreferenceMap,
        folderFavorites,
        handleFavoriteChange
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};
