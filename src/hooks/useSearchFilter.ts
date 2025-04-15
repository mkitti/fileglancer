import { useState } from 'react';
import type { FileSharePaths, FileSharePathItem } from '../shared.types';
import type { DirectoryFavorite } from '../contexts/PreferencesContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';
import { usePreferencesContext } from '../contexts/PreferencesContext';

export default function useSearchFilter() {
  const { fileSharePaths } = useZoneBrowserContext();
  const { zoneFavorites, fileSharePathFavorites, directoryFavorites } =
    usePreferencesContext();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredFileSharePaths, setFilteredFileSharePaths] =
    useState<FileSharePaths>({});
  const [filteredZoneFavorites, setFilteredZoneFavorites] = useState<string[]>(
    []
  );
  const [filteredFileSharePathFavorites, setFilteredFileSharePathFavorites] =
    useState<FileSharePathItem[]>([]);
  const [filteredDirectoryFavorites, setFilteredDirectoryFavorites] = useState<
    DirectoryFavorite[]
  >([]);

  const filterFileSharePathsAndFavorites = (query: string) => {
    console.log('query in filterFavorites', query);

    const filteredPaths: FileSharePaths = {};

    Object.entries(fileSharePaths).forEach(([zone, pathItems]) => {
      const zoneMatches = zone.toLowerCase().includes(query);
      const matchingPathItems = pathItems.filter(
        (pathItem: FileSharePathItem) =>
          pathItem.name.toLowerCase().includes(query) ||
          pathItem.linux_path.toLowerCase().includes(query)
      );
      if (zoneMatches) {
        filteredPaths[zone] = pathItems;
      } else if (matchingPathItems.length > 0) {
        filteredPaths[zone] = matchingPathItems;
      }
    });

    const filteredFavorites = zoneFavorites.filter(zone =>
      zone.toLowerCase().includes(query)
    );

    const filteredFileSharePathFavorites = fileSharePathFavorites.filter(
      fileSharePath =>
        fileSharePath.zone.toLowerCase().includes(query) ||
        fileSharePath.name.toLowerCase().includes(query) ||
        fileSharePath.group.toLowerCase().includes(query) ||
        fileSharePath.storage.toLowerCase().includes(query) ||
        fileSharePath.mount_path.toLowerCase().includes(query) ||
        fileSharePath.linux_path.toLowerCase().includes(query) ||
        fileSharePath.mac_path?.toLowerCase().includes(query) ||
        fileSharePath.windows_path?.toLowerCase().includes(query)
    );

    const filteredDirectoryFavorites = directoryFavorites.filter(
      directory =>
        directory.navigationZone.toLowerCase().includes(query) ||
        directory.navigationPath.toLowerCase().includes(query) ||
        directory.name.toLowerCase().includes(query) ||
        directory.path.toLowerCase().includes(query)
    );

    setFilteredFileSharePaths(filteredPaths);
    setFilteredZoneFavorites(filteredFavorites);
    setFilteredFileSharePathFavorites(filteredFileSharePathFavorites);
    setFilteredDirectoryFavorites(filteredDirectoryFavorites);
  };

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const searchQuery = event.target.value;
    setSearchQuery(searchQuery);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filterFileSharePathsAndFavorites(query);
    } else {
      // When search query is empty, use all the original paths
      setFilteredFileSharePaths({});
      setFilteredZoneFavorites([]);
      setFilteredFileSharePathFavorites([]);
      setFilteredDirectoryFavorites([]);
    }
  };

  return {
    searchQuery,
    filteredFileSharePaths,
    filteredZoneFavorites,
    filteredFileSharePathFavorites,
    filteredDirectoryFavorites,
    handleSearchChange
  };
}
