import React from 'react';

import type { FileSharePath, Zone } from '@/shared.types';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { useZoneBrowserContext } from './ZoneBrowserContext';
import { getAPIPathRoot, sendFetchRequest, makeMapKey } from '@/utils';


export type FolderFavorite = {
  folderPath: string;
  fsp: FileSharePath;
};

type PreferencesContextType = {
  pathPreference: ['linux_path'] | ['windows_path'] | ['mac_path'];
  showPathPrefAlert: boolean;
  setShowPathPrefAlert: React.Dispatch<React.SetStateAction<boolean>>;
  handlePathPreferenceSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    localPathPreference: PreferencesContextType['pathPreference']
  ) => void;
  zonePreferenceKeys: string[];
  zoneFavorites: Zone[];
  fileSharePathPreferenceKeys: string[];
  fileSharePathFavorites: FileSharePath[];
  folderPreferenceKeys: string[];
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

  const [zonePreferenceKeys, setZonePreferenceKeys] = React.useState<string[]>(
    []
  );
  const [zoneFavorites, setZoneFavorites] = React.useState<Zone[]>([]);
  const [fileSharePathPreferenceKeys, setFileSharePathPreferenceKeys] =
    React.useState<string[]>([]);
  const [fileSharePathFavorites, setFileSharePathFavorites] = React.useState<
    FileSharePath[]
  >([]);
  const [folderPreferenceKeys, setFolderPreferenceKeys] = React.useState<
    string[]
  >([]);
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

  function updateLocalZonePreferenceStates(updatedKeys: string[]) {
    setZonePreferenceKeys(updatedKeys);
    const updatedZoneFavorites = accessMapItems(updatedKeys);
    updatedZoneFavorites.sort((a, b) => a.name.localeCompare(b.name));
    setZoneFavorites(updatedZoneFavorites as Zone[]);
  }

  function updateLocalFspPreferenceStates(updatedKeys: string[]) {
    setFileSharePathPreferenceKeys(updatedKeys);
    const updatedFspFavorites = accessMapItems(updatedKeys) as FileSharePath[];
    // Sort based on the storage name, which is what is displayed in the UI
    updatedFspFavorites.sort((a, b) => a.storage.localeCompare(b.storage));
    setFileSharePathFavorites(updatedFspFavorites as FileSharePath[]);
  }

  function updateLocalFolderPreferenceStates(updatedKeys: string[]) {
    setFolderPreferenceKeys(updatedKeys);
    const updatedFolderFavorites = updatedKeys.map(key => {
      const [, fspName, folderPath] = key.split('_');
      const fspKey = makeMapKey('fsp', fspName); // FSP key corresponding to the folder
      const fsp = zonesAndFileSharePathsMap[fspKey] as FileSharePath; // Access the corresponding FSP
      return { folderPath, fsp };
    });
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

  function updatePreferenceKeyList(key: string, favoritesList: string[]) {
    const updatedFavorites = [...favoritesList];
    const keyIndex = updatedFavorites.indexOf(key);
    if (keyIndex < 0) {
      updatedFavorites.push(key);
    } else if (keyIndex >= 0) {
      updatedFavorites.splice(keyIndex, 1);
    }
    return updatedFavorites;
  }

  async function handleZoneFavoriteChange(item: Zone) {
    const key = makeMapKey('zone', item.name);
    const updatedZonePreferenceKeys = updatePreferenceKeyList(
      key,
      zonePreferenceKeys
    );

    try {
      await savePreferencesToBackend('zone', updatedZonePreferenceKeys);
      updateLocalZonePreferenceStates(updatedZonePreferenceKeys);
    } catch (error) {
      console.error('Error updating zone favorites:', error);
    }
  }

  async function handleFileSharePathFavoriteChange(item: FileSharePath) {
    const key = makeMapKey('fsp', item.name);
    const updatedFileSharePathKeys = updatePreferenceKeyList(
      key,
      fileSharePathPreferenceKeys
    );

    try {
      await savePreferencesToBackend('fileSharePath', updatedFileSharePathKeys);
      updateLocalFspPreferenceStates(updatedFileSharePathKeys);
    } catch (error) {
      console.error('Error updating file share path favorites:', error);
    }
  }

  async function handleFolderFavoriteChange(item: FolderFavorite) {
    const folderPrefKey = makeMapKey(
      'folder',
      `${item.fsp.name}_${item.folderPath}`
    );
    const updatedFolderKeys = updatePreferenceKeyList(
      folderPrefKey,
      folderPreferenceKeys
    );

    try {
      await savePreferencesToBackend('folder', updatedFolderKeys);
      updateLocalFolderPreferenceStates(updatedFolderKeys);
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
        zonePreferenceKeys,
        zoneFavorites,
        fileSharePathPreferenceKeys,
        fileSharePathFavorites,
        folderPreferenceKeys,
        folderFavorites,
        handleFavoriteChange
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};
