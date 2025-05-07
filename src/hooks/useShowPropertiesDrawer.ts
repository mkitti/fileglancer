import React from 'react';

// Hook to manage the visibility of the file properties drawer
export default function useShowPropertiesDrawer() {
  const [showPropertiesDrawer, setShowPropertiesDrawer] =
    React.useState<boolean>(false);

  return {
    showPropertiesDrawer,
    setShowPropertiesDrawer
  };
}
