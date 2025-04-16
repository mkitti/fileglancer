import React from 'react';

// Hook to manage the open favorite "types" (i.e., zone,
// file share path, directory) in the file browser sidebar
export default function useToggleOpenFavorites() {
  const [openFavorites, setOpenFavorites] = React.useState<
    Record<string, boolean>
  >({ all: true });

  function toggleOpenFavorites(zone: string) {
    setOpenFavorites(prev => ({
      ...prev,
      [zone]: !prev[zone]
    }));
  }
  return {
    openFavorites,
    toggleOpenFavorites
  };
}
