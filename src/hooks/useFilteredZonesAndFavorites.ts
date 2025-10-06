import React from 'react';

import type {
  Zone,
  ZonesAndFileSharePathsMap,
  FileSharePath
} from '@/shared.types';
import { useZoneAndFspMapContext } from '@/contexts/ZonesAndFspMapContext';
import {
  FolderFavorite,
  usePreferencesContext
} from '@/contexts/PreferencesContext';
import { useProfileContext } from '@/contexts/ProfileContext';

export default function useFilteredZonesAndFavorites() {
  const { zonesAndFileSharePathsMap } = useZoneAndFspMapContext();
  const {
    zoneFavorites,
    fileSharePathFavorites,
    folderFavorites,
    isFilteredByGroups
  } = usePreferencesContext();
  const { profile } = useProfileContext();

  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [filteredZonesMap, setFilteredZonesMap] =
    React.useState<ZonesAndFileSharePathsMap>({});
  const [filteredZoneFavorites, setFilteredZoneFavorites] = React.useState<
    Zone[]
  >([]);
  const [filteredFileSharePathFavorites, setFilteredFileSharePathFavorites] =
    React.useState<FileSharePath[]>([]);
  const [filteredFolderFavorites, setFilteredFolderFavorites] = React.useState<
    FolderFavorite[]
  >([]);

  const filterZonesMap = React.useCallback(
    (query: string) => {
      const userGroups = profile?.groups || [];

      const matches = Object.entries(zonesAndFileSharePathsMap)
        .map(([key, value]) => {
          if (key.startsWith('zone')) {
            const zone = value as Zone;
            const zoneNameMatches = zone.name.toLowerCase().includes(query);

            // Filter the file share paths inside the zone
            let matchingFileSharePaths = zone.fileSharePaths.filter(fsp =>
              fsp.name.toLowerCase().includes(query)
            );

            // Apply group filtering if enabled
            if (isFilteredByGroups && userGroups.length > 0) {
              matchingFileSharePaths = matchingFileSharePaths.filter(
                fsp => userGroups.includes(fsp.group) || fsp.group === 'public'
              );
            }

            // If Zone.name matches or any FileSharePath.name inside the zone matches,
            // return a modified Zone object with only the matching file share paths
            if (zoneNameMatches || matchingFileSharePaths.length > 0) {
              return [
                key,
                {
                  ...zone,
                  fileSharePaths: matchingFileSharePaths
                }
              ];
            }
          }
          return null; // Return null for non-matching entries
        })
        .filter(Boolean); // Remove null entries

      setFilteredZonesMap(Object.fromEntries(matches as [string, Zone][]));
    },
    [zonesAndFileSharePathsMap, isFilteredByGroups, profile]
  );

  const filterAllFavorites = React.useCallback(
    (query: string) => {
      const filteredZoneFavorites = zoneFavorites.filter(
        zone =>
          zone.name.toLowerCase().includes(query) ||
          // any of the file share paths inside the zone match
          zone.fileSharePaths.some(fileSharePath =>
            fileSharePath.name.toLowerCase().includes(query)
          )
      );

      const filteredFileSharePathFavorites = fileSharePathFavorites.filter(
        fileSharePath =>
          fileSharePath.zone.toLowerCase().includes(query) ||
          fileSharePath.name.toLowerCase().includes(query) ||
          fileSharePath.group.toLowerCase().includes(query) ||
          fileSharePath.storage.toLowerCase().includes(query)
      );

      const filteredFolderFavorites = folderFavorites.filter(
        folder =>
          folder.folderPath.toLowerCase().includes(query) ||
          folder.fsp.name.toLowerCase().includes(query) ||
          folder.fsp.zone.toLowerCase().includes(query) ||
          folder.fsp.group.toLowerCase().includes(query) ||
          folder.fsp.storage.toLowerCase().includes(query)
      );

      setFilteredZoneFavorites(filteredZoneFavorites);
      setFilteredFileSharePathFavorites(filteredFileSharePathFavorites);
      setFilteredFolderFavorites(filteredFolderFavorites);
    },
    [zoneFavorites, fileSharePathFavorites, folderFavorites]
  );

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const searchQuery = event.target.value;
    setSearchQuery(searchQuery.trim().toLowerCase());
  };

  const clearSearch = (): void => {
    setSearchQuery('');
  };

  React.useEffect(() => {
    if (searchQuery !== '') {
      filterZonesMap(searchQuery);
      filterAllFavorites(searchQuery);
    } else if (searchQuery === '' && isFilteredByGroups && profile?.groups) {
      // When search query is empty but group filtering is enabled, apply group filter
      const userGroups = profile.groups;
      const groupFilteredMap = Object.entries(zonesAndFileSharePathsMap)
        .map(([key, value]) => {
          if (key.startsWith('zone')) {
            const zone = value as Zone;
            const matchingFileSharePaths = zone.fileSharePaths.filter(
              fsp => userGroups.includes(fsp.group) || fsp.group === 'public'
            );
            if (matchingFileSharePaths.length > 0) {
              return [
                key,
                {
                  ...zone,
                  fileSharePaths: matchingFileSharePaths
                }
              ];
            }
          }
          return null;
        })
        .filter(Boolean);
      setFilteredZonesMap(
        Object.fromEntries(groupFilteredMap as [string, Zone][])
      );
      setFilteredZoneFavorites([]);
      setFilteredFileSharePathFavorites([]);
      setFilteredFolderFavorites([]);
    } else {
      // When search query is empty and group filtering is disabled, use all the original paths
      setFilteredZonesMap({});
      setFilteredZoneFavorites([]);
      setFilteredFileSharePathFavorites([]);
      setFilteredFolderFavorites([]);
    }
  }, [
    searchQuery,
    zonesAndFileSharePathsMap,
    zoneFavorites,
    fileSharePathFavorites,
    folderFavorites,
    filterAllFavorites,
    filterZonesMap,
    isFilteredByGroups,
    profile
  ]);

  return {
    searchQuery,
    filteredZonesMap,
    filteredZoneFavorites,
    filteredFileSharePathFavorites,
    filteredFolderFavorites,
    handleSearchChange,
    clearSearch
  };
}
