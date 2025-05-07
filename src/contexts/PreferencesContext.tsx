import React from 'react';
import type {
  FileSharePathItem,
  ZonesAndFileSharePaths
} from '../shared.types';
import { useCookiesContext } from '../contexts/CookiesContext';
import { getAPIPathRoot, sendGetRequest, sendPutRequest } from '../utils';

export type DirectoryFavorite = {
  fileSharePath: FileSharePathItem;
  name: string;
  path: string;
};

type PreferencesContextType = {
  pathPreference: ['linux_path'] | ['windows_path'] | ['mac_path'];
  showPathPrefAlert: boolean;
  setShowPathPrefAlert: React.Dispatch<React.SetStateAction<boolean>>;
  handlePathPreferenceSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    localPathPreference: PreferencesContextType['pathPreference']
  ) => void;
  zoneFavorites: ZonesAndFileSharePaths[];
  setZoneFavorites: React.Dispatch<
    React.SetStateAction<ZonesAndFileSharePaths[]>
  >;
  fileSharePathFavorites: FileSharePathItem[];
  setFileSharePathFavorites: React.Dispatch<
    React.SetStateAction<FileSharePathItem[]>
  >;
  directoryFavorites: DirectoryFavorite[];
  setDirectoryFavorites: React.Dispatch<
    React.SetStateAction<DirectoryFavorite[]>
  >;
  handleFavoriteChange: (
    item:
      | ZonesAndFileSharePaths
      | FileSharePathItem
      | DirectoryFavorite
      | DirectoryFavorite[],
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

  const [zoneFavorites, setZoneFavorites] = React.useState<
    ZonesAndFileSharePaths[]
  >([]);
  const [fileSharePathFavorites, setFileSharePathFavorites] = React.useState<
    FileSharePathItem[]
  >([]);
  const [directoryFavorites, setDirectoryFavorites] = React.useState<
    DirectoryFavorite[]
  >([]);
  const { cookies } = useCookiesContext();

  async function fetchPreferences<T>(
    key: string,
    setStateFunction: React.Dispatch<React.SetStateAction<T>>
  ) {
    try {
      await sendGetRequest(
        `${getAPIPathRoot()}api/fileglancer/preference?key=${key}`,
        cookies['_xsrf']
      )
        .then(response => response.json())
        .then(data => {
          if (data.value) {
            setStateFunction(data.value);
          }
        });
    } catch (error) {
      console.log(
        `Potential error fetching preferences, or preference with key ${key} is not set:`,
        error
      );
    }
  }

  React.useEffect(() => {
    fetchPreferences('pathPreference', setPathPreference);
  }, []);

  React.useEffect(() => {
    fetchPreferences('zoneFavorites', setZoneFavorites);
  }, []);

  React.useEffect(() => {
    fetchPreferences('fileSharePathFavorites', setFileSharePathFavorites);
  }, []);

  React.useEffect(() => {
    fetchPreferences('directoryFavorites', setDirectoryFavorites);
  }, []);

  async function updatePreferences<T>(key: string, keyValue: T) {
    try {
      await sendPutRequest(
        `${getAPIPathRoot()}api/fileglancer/preference?key=${key}`,
        cookies['_xsrf'],
        { value: keyValue }
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
      updatePreferences('pathPreference', localPathPreference);
      setPathPreference(localPathPreference);
      setShowPathPrefAlert(true);
    } catch (error) {
      console.error('Error updating path preference:', error);
      setShowPathPrefAlert(false);
    }
  }

  function changePreferences<T>(
    preferenceState: T[],
    setPreferenceState: React.Dispatch<React.SetStateAction<T[]>>,
    preferenceKey: string,
    existingItemIndex: number | number[],
    newItem: T | T[]
  ) {
    let newFavorites = [...preferenceState];
    if (Array.isArray(existingItemIndex) && Array.isArray(newItem)) {
      existingItemIndex.forEach((itemIndex, index) => {
        if (itemIndex >= 0) {
          newFavorites.splice(itemIndex, 1);
        } else {
          newFavorites = [...newFavorites, newItem[index]];
        }
      });
    } else if (
      typeof existingItemIndex === 'number' &&
      !Array.isArray(newItem)
    ) {
      if (existingItemIndex >= 0) {
        newFavorites.splice(existingItemIndex, 1);
      } else {
        newFavorites = [...newFavorites, newItem];
      }
    }
    console.log('Updated favorites:', newFavorites);
    setPreferenceState(newFavorites);
    updatePreferences(preferenceKey, newFavorites);
  }

  function handleZoneFavoriteChange(item: ZonesAndFileSharePaths) {
    const itemKey = Object.keys(item)[0];

    const existingItemIndex = zoneFavorites.findIndex(
      zone => Object.keys(zone)[0] === itemKey
    );
    changePreferences(
      zoneFavorites,
      setZoneFavorites,
      'zoneFavorites',
      existingItemIndex,
      item as ZonesAndFileSharePaths
    );
  }

  function handleFileSharePathFavoriteChange(item: FileSharePathItem) {
    const existingItemIndex = fileSharePathFavorites.findIndex(
      path =>
        path.storage === item.storage && path.linux_path === item.linux_path
    );
    changePreferences(
      fileSharePathFavorites,
      setFileSharePathFavorites,
      'fileSharePathFavorites',
      existingItemIndex,
      item as FileSharePathItem
    );
  }

  function handleDirectoryFavoriteChange(
    item: DirectoryFavorite | DirectoryFavorite[]
  ) {
    let existingItemIndex;
    if (Array.isArray(item)) {
      existingItemIndex = [];
      item.forEach(dirItem => {
        const index = directoryFavorites.findIndex(
          dir =>
            dir.name === dirItem.name &&
            dir.fileSharePath === dirItem.fileSharePath
        );
        existingItemIndex.push(index);
      });
    } else {
      existingItemIndex = directoryFavorites.findIndex(
        dir =>
          dir.name === item.name && dir.fileSharePath === item.fileSharePath
      );
    }
    changePreferences(
      directoryFavorites,
      setDirectoryFavorites,
      'directoryFavorites',
      existingItemIndex,
      item as DirectoryFavorite | DirectoryFavorite[]
    );
  }

  async function handleFavoriteChange<T>(item: T | T[], type: string) {
    switch (type) {
      case 'zone':
        handleZoneFavoriteChange(item as ZonesAndFileSharePaths);
        break;
      case 'fileSharePath':
        handleFileSharePathFavoriteChange(item as FileSharePathItem);
        break;
      case 'directory':
        handleDirectoryFavoriteChange(
          item as DirectoryFavorite | DirectoryFavorite[]
        );
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
        zoneFavorites,
        setZoneFavorites,
        fileSharePathFavorites,
        setFileSharePathFavorites,
        directoryFavorites,
        setDirectoryFavorites,
        handleFavoriteChange
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};
