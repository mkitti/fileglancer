import { useState } from 'react';
import { FileSharePaths, FileSharePathItem } from './useFileBrowser';

export default function useZoneFilter() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredFileSharePaths, setFilteredFileSharePaths] =
    useState<FileSharePaths>({});

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    fileSharePaths: FileSharePaths
  ): void => {
    const searchQuery = event.target.value;
    setSearchQuery(searchQuery);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
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

      setFilteredFileSharePaths(filteredPaths);
    } else {
      // When search query is empty, use all the original paths
      setFilteredFileSharePaths({});
    }
  };

  return { searchQuery, filteredFileSharePaths, handleSearchChange };
}
