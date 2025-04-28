import React from 'react';
import type {
  ZonesAndFileSharePaths,
  FileSharePathItem
} from '../shared.types';
import type { DirectoryFavorite } from '../contexts/PreferencesContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';
import { usePreferencesContext } from '../contexts/PreferencesContext';

export default function useSearchFilter() {
  const { zonesAndFileSharePaths } = useZoneBrowserContext();
  const { zoneFavorites, fileSharePathFavorites, directoryFavorites } =
    usePreferencesContext();

  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [filteredZonesAndFileSharePaths, setFilteredZonesAndFileSharePaths] =
    React.useState<ZonesAndFileSharePaths>({});
  const [filteredZoneFavorites, setFilteredZoneFavorites] = React.useState<
    ZonesAndFileSharePaths[]
  >([]);
  const [filteredFileSharePathFavorites, setFilteredFileSharePathFavorites] =
    React.useState<FileSharePathItem[]>([]);
  const [filteredDirectoryFavorites, setFilteredDirectoryFavorites] =
    React.useState<DirectoryFavorite[]>([]);

  const filterZonesAndFileSharePaths = (query: string) => {
    const filteredPaths: ZonesAndFileSharePaths = {};

    Object.entries(zonesAndFileSharePaths).forEach(([zone, pathItems]) => {
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

    setFilteredZonesAndFileSharePaths(filteredPaths);
  };

  const filterAllFavorites = (query: string) => {
    const filteredZoneFavorites = zoneFavorites.filter(zone =>
      Object.keys(zone)[0].toLowerCase().includes(query)
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
        directory.fileSharePath.zone.toLowerCase().includes(query) ||
        directory.fileSharePath.name.toLowerCase().includes(query) ||
        directory.name.toLowerCase().includes(query) ||
        directory.path.toLowerCase().includes(query)
    );

    setFilteredZoneFavorites(filteredZoneFavorites);
    setFilteredFileSharePathFavorites(filteredFileSharePathFavorites);
    setFilteredDirectoryFavorites(filteredDirectoryFavorites);
  };

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const searchQuery = event.target.value;
    setSearchQuery(searchQuery.trim().toLowerCase());
  };

  React.useEffect(() => {
    if (searchQuery !== '') {
      filterZonesAndFileSharePaths(searchQuery);
      filterAllFavorites(searchQuery);
    } else if (searchQuery === '') {
      // When search query is empty, use all the original paths
      setFilteredZonesAndFileSharePaths({});
      setFilteredZoneFavorites([]);
      setFilteredFileSharePathFavorites([]);
      setFilteredDirectoryFavorites([]);
    }
  }, [
    searchQuery,
    zonesAndFileSharePaths,
    zoneFavorites,
    fileSharePathFavorites,
    directoryFavorites
  ]);

  return {
    searchQuery,
    filteredZonesAndFileSharePaths,
    filteredZoneFavorites,
    filteredFileSharePathFavorites,
    filteredDirectoryFavorites,
    handleSearchChange
  };
}
