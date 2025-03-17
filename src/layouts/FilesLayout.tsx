import React from 'react';
import { Outlet } from 'react-router';
import FileSidebar from '../components/ui/FileSidebar';
import useFileBrowser from '../hooks/useFileBrowser';

export const FilesLayout = () => {
  const {fileSharePaths, openZones, toggleZone, getFileSharePaths, handlePathClick} = useFileBrowser();

  React.useEffect(() => {
    if (Object.keys(fileSharePaths).length === 0) {
      getFileSharePaths();
    }
  }, [fileSharePaths, getFileSharePaths]);

  return (
    <div className="flex h-full w-full">
      <div className="w-64 h-full border-r border-gray-200 overflow-y-auto">
        <FileSidebar
          fileSharePaths={fileSharePaths}
          openZones={openZones}
          toggleZone={toggleZone}
          handlePathClick={handlePathClick}
        />
      </div>
      <Outlet />
    </div>
  );
};
    
