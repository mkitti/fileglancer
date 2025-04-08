import React from 'react';
import { Outlet } from 'react-router';
import FileSidebar from '../components/ui/FileSidebar';
import useFileBrowser from '../hooks/useFileBrowser';
import usePreferences from '../hooks/usePreferences';

export const FilesLayout = () => {
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
  const {
    zoneFavorites,
    setZoneFavorites,
    // fileSharePathFavorites,
    // setFileSharePathFavorites,
    // directoryFavorites,
    // setDirectoryFavorites,
    handleFavoriteChange
  } = usePreferences();

  React.useEffect(() => {
    if (Object.keys(fileSharePaths).length === 0) {
      getFileSharePaths();
    }
  }, [fileSharePaths, getFileSharePaths]);

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
