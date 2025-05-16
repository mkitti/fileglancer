import React from 'react';
import type { Zone, ZonesAndFileSharePathsMap } from '../shared.types';
// import type { DirectoryFavorite } from '../contexts/PreferencesContext';
import { useZoneBrowserContext } from '../contexts/ZoneBrowserContext';
// import { usePreferencesContext } from '../contexts/PreferencesContext';

export default function useSearchFilter() {
  const { zonesAndFileSharePathsMap } = useZoneBrowserContext();
  // const { zoneFavorites } = usePreferencesContext();

  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [filteredZonesMap, setFilteredZonesMap] =
    React.useState<ZonesAndFileSharePathsMap>({});
  //   const [filteredZoneFavorites, setFilteredZoneFavorites] = React.useState<
  //     Record<string, Zone>
  //   >({});
  //   const [filteredFileSharePathFavorites, setFilteredFileSharePathFavorites] =
  //     React.useState<FileSharePath[]>([]);
  //   const [filteredDirectoryFavorites, setFilteredDirectoryFavorites] =
  //     React.useState<DirectoryFavorite[]>([]);

  const filterZonesMap = (query: string) => {
    const matches = Object.fromEntries(
      Object.entries(zonesAndFileSharePathsMap).filter(([key, value]) => {
        // Only filter zones the 'uber' map, since this is where fsps are
        // populated from in the zone browser
        if (key.startsWith('zone')) {
          const zone = value as Zone;
          const zoneNameMatches = zone.name.toLowerCase().includes(query);

          // filter the fsps inside the zone
          const matchingFileSharePaths = zone.fileSharePaths.filter(fsp =>
            fsp.name.toLowerCase().includes(query)
          );

          // If Zone.name matches or any FileSharePath.name inside the zone matches,
          // keep the Zone
          if (zoneNameMatches || matchingFileSharePaths.length > 0) {
            // Update the Zone's fileSharePaths to only include matching ones
            zone.fileSharePaths = matchingFileSharePaths;
            return true;
          }
        } else if (!key.startsWith('zone')) {
          return false;
        }
      })
    );
    console.log('matches: ', matches);
    if (matches) {
      setFilteredZonesMap(matches);
    }
  };

  //   const filterAllFavorites = (query: string) => {
  //     const filteredZoneFavorites = zoneFavorites.filter(zone =>
  //       Object.keys(zone)[0].toLowerCase().includes(query)
  //     );

  //     const filteredFileSharePathFavorites = fileSharePathFavorites.filter(
  //       fileSharePath =>
  //         fileSharePath.zone.toLowerCase().includes(query) ||
  //         fileSharePath.name.toLowerCase().includes(query) ||
  //         fileSharePath.group.toLowerCase().includes(query) ||
  //         fileSharePath.storage.toLowerCase().includes(query) ||
  //         fileSharePath.mount_path.toLowerCase().includes(query) ||
  //         fileSharePath.linux_path.toLowerCase().includes(query) ||
  //         fileSharePath.mac_path?.toLowerCase().includes(query) ||
  //         fileSharePath.windows_path?.toLowerCase().includes(query)
  //     );

  //     const filteredDirectoryFavorites = directoryFavorites.filter(
  //       directory =>
  //         directory.fileSharePath.zone.toLowerCase().includes(query) ||
  //         directory.fileSharePath.name.toLowerCase().includes(query) ||
  //         directory.name.toLowerCase().includes(query) ||
  //         directory.path.toLowerCase().includes(query)
  //     );

  //     setFilteredZoneFavorites(filteredZoneFavorites);
  //     setFilteredFileSharePathFavorites(filteredFileSharePathFavorites);
  //     setFilteredDirectoryFavorites(filteredDirectoryFavorites);
  //   };

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const searchQuery = event.target.value;
    setSearchQuery(searchQuery.trim().toLowerCase());
  };

  React.useEffect(() => {
    if (searchQuery !== '') {
      filterZonesMap(searchQuery);
      //   filterAllFavorites(searchQuery);
    } else if (searchQuery === '') {
      // When search query is empty, use all the original paths
      setFilteredZonesMap({});
      //   setFilteredZoneFavorites([]);
      //   setFilteredFileSharePathFavorites([]);
      //   setFilteredDirectoryFavorites([]);
    }
  }, [
    searchQuery,
    zonesAndFileSharePathsMap
    // zoneFavorites
    // fileSharePathFavorites,
    // directoryFavorites
  ]);

  return {
    searchQuery,
    filteredZonesMap,
    // filteredZoneFavorites,
    // filteredFileSharePathFavorites,
    // filteredDirectoryFavorites,
    handleSearchChange
  };
}
