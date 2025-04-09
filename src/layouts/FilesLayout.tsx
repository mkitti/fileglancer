import React from 'react';
import { Outlet, useOutletContext } from 'react-router';
import FileSidebar from '../components/ui/FileSidebar';
import useFileBrowser from '../hooks/useFileBrowser';

type FilesLayoutRouteProps = {
  pathPreference: ['linux_path'] | ['windows_path'] | ['mac_path'];
  zoneFavorites: string[];
  fileSharePathFavorites: string[];
  handleFavoriteChange: (item: string, type: string) => Promise<void>;
};

export const FilesLayout = () => {
  const {
    pathPreference,
    zoneFavorites,
    fileSharePathFavorites,
    handleFavoriteChange
  }: FilesLayoutRouteProps = useOutletContext();

  const {
    files,
    currentPath,
    selectedZone,
    fileSharePaths,
    openZones,
    setSelectedZone,
    toggleZone,
    getFiles,
    handlePathClick
  } = useFileBrowser();

  return (
    <div className="flex h-full w-full overflow-y-hidden">
      <FileSidebar
        fileSharePaths={fileSharePaths}
        zoneFavorites={zoneFavorites}
        fileSharePathFavorites={fileSharePathFavorites}
        openZones={openZones}
        toggleZone={toggleZone}
        handlePathClick={handlePathClick}
        pathPreference={pathPreference}
        handleFavoriteChange={handleFavoriteChange}
      />
      <Outlet
        context={{
          files,
          currentPath,
          selectedZone,
          setSelectedZone,
          getFiles
        }}
      />
    </div>
  );
};
