import * as React from 'react';
export default function useFileBrowser() {
  const [zoneFavorites, setZoneFavorites] = React.useState<string[]>([]);
  const [fileSharePathFavorites, setFileSharePathFavorites] = React.useState<
    string[]
  >([]);
  const [directoryFavorites, setDirectoryFavorites] = React.useState<string[]>(
    []
  );

  const handleFavoriteChange = (item: string, type: string) => {
    switch (type) {
      case 'zone':
        setZoneFavorites(prev =>
          prev.includes(item)
            ? prev.filter(zone => zone !== item)
            : [...prev, item]
        );
        break;
      case 'fileSharePath':
        setFileSharePathFavorites(prev =>
          prev.includes(item)
            ? prev.filter(path => path !== item)
            : [...prev, item]
        );
        break;
      case 'directory':
        setDirectoryFavorites(prev =>
          prev.includes(item)
            ? prev.filter(dir => dir !== item)
            : [...prev, item]
        );
        break;
    }
  };

  return {
    zoneFavorites,
    setZoneFavorites,
    fileSharePathFavorites,
    setFileSharePathFavorites,
    directoryFavorites,
    setDirectoryFavorites,
    handleFavoriteChange
  };
}
