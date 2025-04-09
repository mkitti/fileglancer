import * as React from 'react';
import { useCookies } from 'react-cookie';
import { getAPIPathRoot, sendGetRequest, sendPutRequest } from '../utils';

export default function useFileBrowser() {
  const [pathPreference, setPathPreference] = React.useState<
    ['linux_path'] | ['windows_path'] | ['mac_path']
  >(['linux_path']);
  const [zoneFavorites, setZoneFavorites] = React.useState<string[]>([]);
  const [fileSharePathFavorites, setFileSharePathFavorites] = React.useState<
    string[]
  >([]);
  const [directoryFavorites, setDirectoryFavorites] = React.useState<string[]>(
    []
  );
  const [cookies] = useCookies(['_xsrf']);

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
            setZoneFavorites(data);
          });
        await sendGetRequest(
          `${getAPIPathRoot()}api/fileglancer/preference?key=fileSharePathFavorites`,
          cookies['_xsrf']
        )
          .then(response => response.json())
          .then(data => {
            setFileSharePathFavorites(data);
          });
        await sendGetRequest(
          `${getAPIPathRoot()}api/fileglancer/preference?key=directoryFavorites`,
          cookies['_xsrf']
        )
          .then(response => response.json())
          .then(data => {
            setDirectoryFavorites(data);
          });
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
    };
    fetchPreferences();
  }, []);

  const updatePreferences = async (key: string, body: string[]) => {
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
    event: React.ChangeEvent<HTMLSelectElement>
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

  const handleFavoriteChange = async (item: string, type: string) => {
    if (type === 'zone') {
      const newFavorites = zoneFavorites.includes(item)
        ? zoneFavorites.filter(zone => zone !== item)
        : [...zoneFavorites, item];
      setZoneFavorites(newFavorites);
      updatePreferences('zoneFavorites', newFavorites);
    } else if (type === 'fileSharePath') {
      const newFavorites = fileSharePathFavorites.includes(item)
        ? fileSharePathFavorites.filter(path => path !== item)
        : [...fileSharePathFavorites, item];
      setFileSharePathFavorites(newFavorites);
      updatePreferences('fileSharePathFavorites', newFavorites);
    } else if (type === 'directory') {
      const newFavorites = directoryFavorites.includes(item)
        ? directoryFavorites.filter(dir => dir !== item)
        : [...directoryFavorites, item];
      setDirectoryFavorites(newFavorites);
      updatePreferences('directoryFavorites', newFavorites);
    }
  };

  return {
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
  };
}
