import React from 'react';
import { Outlet } from 'react-router';
import FileglancerNavbar from '../components/ui/Navbar';
import usePreferences from '../hooks/usePreferences';

export const MainLayout = () => {
  const {
    pathPreference,
    handlePathPreferenceChange,
    handlePathPreferenceSubmit,
    zoneFavorites,
    fileSharePathFavorites,
    // directoryFavorites,
    handleFavoriteChange
  } = usePreferences();

  return (
    <div className="h-svh w-full overflow-y-hidden bg-background text-foreground box-border">
      <FileglancerNavbar />
      <Outlet
        context={{
          pathPreference,
          handlePathPreferenceChange,
          handlePathPreferenceSubmit,
          zoneFavorites,
          fileSharePathFavorites,
          handleFavoriteChange
        }}
      />
    </div>
  );
};
