import React from 'react';
import { Outlet } from 'react-router';
import FileSidebar from '../components/ui/FileSidebar';
import useFileBrowser from '../hooks/useFileBrowser';

export const FilesLayout = () => {
  const {
    files,
    currentPath,
    checked,
    selectedZone,
    fileSharePaths,
    openZones,
    setSelectedZone,
    toggleZone,
    getFileSharePaths,
    getFiles,
    handlePathClick,
    handleCheckboxToggle
  } = useFileBrowser();

  React.useEffect(() => {
    if (Object.keys(fileSharePaths).length === 0) {
      getFileSharePaths();
    }
  }, [fileSharePaths, getFileSharePaths]);

  return (
    <div className="flex h-full w-full">
      <FileSidebar
        fileSharePaths={fileSharePaths}
        openZones={openZones}
        toggleZone={toggleZone}
        handlePathClick={handlePathClick}
      />

      <Outlet
        context={{
          files,
          currentPath,
          checked,
          selectedZone,
          setSelectedZone,
          handleCheckboxToggle,
          getFiles
        }}
      />
    </div>
  );
};
