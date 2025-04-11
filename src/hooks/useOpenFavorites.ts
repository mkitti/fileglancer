import React from 'react';

// Hook to manage the open zones in the file browser sidebar
export default function useToggleOpenFavorites() {
  const [openFavorites, setOpenFavorites] = React.useState<
    Record<string, boolean>
  >({});

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
