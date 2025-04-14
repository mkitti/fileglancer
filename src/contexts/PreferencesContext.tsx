import React from 'react';
import type { FileSharePathItem } from '../shared.types';
import { useCookiesContext } from '../contexts/CookiesContext';
import { getAPIPathRoot, sendGetRequest, sendPutRequest } from '../utils';

type DirectoryFavorite = {
  navigationZone: string;
  navigationPath: string;
  name: string;
  path: string;
};

type PreferencesContextType = {
  pathPreference: ['linux_path'] | ['windows_path'] | ['mac_path'];
  handlePathPreferenceChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  handlePathPreferenceSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  zoneFavorites: string[];
  setZoneFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  fileSharePathFavorites: FileSharePathItem[];
  setFileSharePathFavorites: React.Dispatch<
    React.SetStateAction<FileSharePathItem[]>
  >;
  directoryFavorites: DirectoryFavorite[];
  setDirectoryFavorites: React.Dispatch<
    React.SetStateAction<DirectoryFavorite[]>
  >;
  handleFavoriteChange: (
    item: string | FileSharePathItem | DirectoryFavorite | DirectoryFavorite[],
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
  const [zoneFavorites, setZoneFavorites] = React.useState<string[]>([]);
  const [fileSharePathFavorites, setFileSharePathFavorites] = React.useState<
    FileSharePathItem[]
  >([]);
  const [directoryFavorites, setDirectoryFavorites] = React.useState<
    DirectoryFavorite[]
  >([]);
  const { cookies } = useCookiesContext();

  React.useEffect(() => {
    const fetchPreferences = async () => {
      try {
        await sendGetRequest(
          `${getAPIPathRoot()}api/fileglancer/preference?key=pathPreference`,
          cookies['_xsrf']
        )
          .then(response => response.json())
          .then(data => {
            if (data) {
              setPathPreference(data);
            }
          });
        await sendGetRequest(
          `${getAPIPathRoot()}api/fileglancer/preference?key=zoneFavorites`,
          cookies['_xsrf']
        )
          .then(response => response.json())
          .then(data => {
            if (data) {
              setZoneFavorites(data);
            }
          });
        await sendGetRequest(
          `${getAPIPathRoot()}api/fileglancer/preference?key=fileSharePathFavorites`,
          cookies['_xsrf']
        )
          .then(response => response.json())
          .then(data => {
            if (data) {
              setFileSharePathFavorites(data);
            }
          });
        await sendGetRequest(
          `${getAPIPathRoot()}api/fileglancer/preference?key=directoryFavorites`,
          cookies['_xsrf']
        )
          .then(response => response.json())
          .then(data => {
            if (data) {
              setDirectoryFavorites(data);
            }
          });
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
    };
    fetchPreferences();
  }, []);

  const updatePreferences = async (
    key: string,
    body: string[] | FileSharePathItem[] | DirectoryFavorite[]
  ) => {
    try {
      await sendPutRequest(
        `${getAPIPathRoot()}api/fileglancer/preference?key=${key}`,
        cookies['_xsrf'],
        body
      );
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
    }
  };

  function handlePathPreferenceChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedPath = event.target.value.split(' ') as [
      'linux_path' | 'windows_path' | 'mac_path'
    ];
    setPathPreference(selectedPath);
  }

  function handlePathPreferenceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updatePreferences('pathPreference', pathPreference);
  }

  const handleFavoriteChange = async (
    item: string | FileSharePathItem | DirectoryFavorite | DirectoryFavorite[],
    type: string
  ) => {
    if (type === 'zone' && typeof item === 'string') {
      const newFavorites = zoneFavorites.includes(item)
        ? zoneFavorites.filter(zone => zone !== item)
        : [...zoneFavorites, item];
      setZoneFavorites(newFavorites);
      updatePreferences('zoneFavorites', newFavorites);
    } else if (
      type === 'fileSharePath' &&
      typeof item !== 'string' &&
      'group' in item
    ) {
      const newFavorites = fileSharePathFavorites.includes(item)
        ? fileSharePathFavorites.filter(path => path !== item)
        : [...fileSharePathFavorites, item];
      setFileSharePathFavorites(newFavorites);
      updatePreferences('fileSharePathFavorites', newFavorites);
    } else if (
      type === 'directory' &&
      typeof item !== 'string' &&
      'navigationZone' in item
    ) {
      const newFavorites = directoryFavorites.includes(item)
        ? directoryFavorites.filter(dir => dir !== item)
        : [...directoryFavorites, item];
      console.log('new favorite directories:', newFavorites);
      setDirectoryFavorites(newFavorites);
      updatePreferences('directoryFavorites', newFavorites);
    } else if (type === 'directory' && Array.isArray(item)) {
      const itemsToProcess = item as DirectoryFavorite[];
      const updatedFavorites = [...directoryFavorites];

      itemsToProcess.forEach(newItem => {
        // Check if item already exists in favorites
        const existingItemIndex = updatedFavorites.findIndex(
          existingItem =>
            existingItem.path === newItem.path &&
            existingItem.navigationZone === newItem.navigationZone
        );

        if (existingItemIndex >= 0) {
          // Remove existing items
          updatedFavorites.splice(existingItemIndex, 1);
        } else {
          updatedFavorites.push(newItem);
        }
      });

      console.log('new favorite directories:', updatedFavorites);
      setDirectoryFavorites(updatedFavorites);
      updatePreferences('directoryFavorites', updatedFavorites);
    }
  };

  return (
    <PreferencesContext.Provider
      value={{
        pathPreference,
        handlePathPreferenceChange,
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
