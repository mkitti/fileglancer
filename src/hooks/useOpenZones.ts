import React from 'react';

// Hook to manage the open zones in the file browser sidebar
export default function useOpenZones() {
  const [openZones, setOpenZones] = React.useState<Record<string, boolean>>({});

  function toggleOpenZones(zone: string) {
    setOpenZones(prev => ({
      ...prev,
      [zone]: !prev[zone]
    }));
  }
  return {
    openZones,
    setOpenZones,
    toggleOpenZones
  };
}
