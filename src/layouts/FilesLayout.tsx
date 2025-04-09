import React from 'react';
import { Outlet, useOutletContext } from 'react-router';
import FileSidebar from '../components/ui/FileSidebar';
import useFileBrowser from '../hooks/useFileBrowser';

type FilesLayoutRouteProps = {
  zoneFavorites: string[];
  fileSharePathFavorites: string[];
  handleFavoriteChange: (item: string, type: string) => Promise<void>;
};

export const FilesLayout = () => {
  const {
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
    getFileSharePaths,
    getFiles,
    handlePathClick
  } = useFileBrowser();

  return (
    <div className="flex h-full w-full overflow-y-hidden">
      <FileSidebar
        fileSharePaths={fileSharePaths}
        zoneFavorites={zoneFavorites}
        setZoneFavorites={setZoneFavorites}
        openZones={openZones}
        toggleZone={toggleZone}
        handlePathClick={handlePathClick}
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
