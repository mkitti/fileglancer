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
export type ZonePreference = { type: 'zone'; name: string };
export type FileSharePathPreference = { type: 'fsp'; name: string };
export type FolderPreference = {
  type: 'folder';
  folderPath: string;
  fspName: string;
};

type PreferencesContextType = {
  pathPreference: ['linux_path'] | ['windows_path'] | ['mac_path'];
  showPathPrefAlert: boolean;
  setShowPathPrefAlert: React.Dispatch<React.SetStateAction<boolean>>;
  handlePathPreferenceSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    localPathPreference: PreferencesContextType['pathPreference']
  ) => void;
  zonePreferenceMap: Record<string, ZonePreference>;
  zoneFavorites: Zone[];
  fileSharePathPreferenceMap: Record<string, FileSharePathPreference>;
  fileSharePathFavorites: FileSharePath[];
  folderPreferenceMap: Record<string, FolderPreference>;
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

  const [zonePreferenceMap, setZonePreferenceMap] = React.useState<
    Record<string, ZonePreference>
  >({});
  const [zoneFavorites, setZoneFavorites] = React.useState<Zone[]>([]);
  const [fileSharePathPreferenceMap, setFileSharePathPreferenceMap] =
    React.useState<Record<string, FileSharePathPreference>>({});
  const [fileSharePathFavorites, setFileSharePathFavorites] = React.useState<
    FileSharePath[]
  >([]);
  const [folderPreferenceMap, setFolderPreferenceMap] = React.useState<
    Record<string, FolderPreference>
  >({});
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

  function updateLocalZonePreferenceStates(
    updatedMap: Record<string, ZonePreference>
  ) {
    setZonePreferenceMap(updatedMap);
    const updatedZoneFavorites = accessMapItems(
      Object.keys(updatedMap)
    ) as Zone[];
    updatedZoneFavorites.sort((a, b) => a.name.localeCompare(b.name));
    setZoneFavorites(updatedZoneFavorites as Zone[]);
  }

  function updateLocalFspPreferenceStates(
    updatedMap: Record<string, FileSharePathPreference>
  ) {
    setFileSharePathPreferenceMap(updatedMap);
    const updatedFspFavorites = accessMapItems(
      Object.keys(updatedMap)
    ) as FileSharePath[];
    // Sort based on the storage name, which is what is displayed in the UI
    updatedFspFavorites.sort((a, b) => a.storage.localeCompare(b.storage));
    setFileSharePathFavorites(updatedFspFavorites as FileSharePath[]);
  }

  function updateLocalFolderPreferenceStates(
    updatedMap: Record<string, FolderPreference>
  ) {
    setFolderPreferenceMap(updatedMap);
    const updatedFolderFavorites = Object.entries(updatedMap).map(
      ([_, value]) => {
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
      const backendPrefs = await fetchPreferences('zone');
      const zoneArray = backendPrefs.map((pref: ZonePreference) => {
        const key = makeMapKey(pref.type, pref.name);
        return { [key]: pref };
      });
      const zoneMap = Object.assign({}, ...zoneArray);
      if (zoneMap) {
        updateLocalZonePreferenceStates(zoneMap);
      }
    })();
  }, [isZonesMapReady]);

  React.useEffect(() => {
    if (!isZonesMapReady) {
      return;
    }

    (async function () {
      const backendPrefs = await fetchPreferences('fileSharePath');
      const fspArray = backendPrefs.map((pref: FileSharePathPreference) => {
        const key = makeMapKey(pref.type, pref.name);
        return { [key]: pref };
      });
      const fspMap = Object.assign({}, ...fspArray);
      if (fspMap) {
        updateLocalFspPreferenceStates(fspMap);
      }
    })();
  }, [isZonesMapReady]);

  React.useEffect(() => {
    if (!isZonesMapReady) {
      return;
    }

    (async function () {
      const backendPrefs = await fetchPreferences('folder');
      const folderArray = backendPrefs.map((pref: FolderPreference) => {
        const key = makeMapKey(pref.type, `${pref.fspName}_${pref.folderPath}`);
        return { [key]: pref };
      });
      const folderMap = Object.assign({}, ...folderArray);
      if (folderMap) {
        updateLocalFolderPreferenceStates(folderMap);
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
    ) as Record<string, ZonePreference>;

    try {
      await savePreferencesToBackend(
        'zone',
        Object.values(updatedZonePreferenceMap)
      );
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
    ) as Record<string, FileSharePathPreference>;

    try {
      await savePreferencesToBackend(
        'fileSharePath',
        Object.values(updatedFileSharePathMap)
      );
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
    ) as Record<string, FolderPreference>;

    try {
      await savePreferencesToBackend('folder', Object.values(updatedFolderMap));
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
