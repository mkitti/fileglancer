import React from 'react';
import { useOutletContext } from 'react-router';

import { File } from '../shared.types';
import useDisplayOptions from '../hooks/useDisplayOptions';
import FileList from './ui/FileList';
import FilePropertiesDrawer from './ui/FilePropertiesDrawer';
import FileControlPanel from './ui/FileControlPanel';
import FileContextMenu from './ui/FileContextMenu';

type FilesRouteProps = {
  files: File[];
  currentPath: string;
  selectedZone: string | null;
  getFiles: (path: string) => void;
};

export default function Files() {
  const { files, currentPath, selectedZone, getFiles }: FilesRouteProps =
    useOutletContext();

  const {
    propertiesTarget,
    selectedFiles,
    displayFiles,
    hideDotFiles,
    setHideDotFiles,
    showFileDrawer,
    setShowFileDrawer,
    showFileContextMenu,
    setShowFileContextMenu,
    contextMenuCoords,
    handleContextMenu,
    handleLeftClicks
  } = useDisplayOptions(files);

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <FileControlPanel
        hideDotFiles={hideDotFiles}
        setHideDotFiles={setHideDotFiles}
      />
      <div className="relative grow">
        <FilePropertiesDrawer
          propertiesTarget={propertiesTarget}
          open={showFileDrawer}
          setShowFileDrawer={setShowFileDrawer}
        />
        <FileList
          displayFiles={displayFiles}
          currentPath={currentPath}
          selectedFiles={selectedFiles}
          selectedZone={selectedZone}
          getFiles={getFiles}
          handleContextMenu={handleContextMenu}
          handleLeftClicks={handleLeftClicks}
          showFileDrawer={showFileDrawer}
        />
      </div>
      {showFileContextMenu && (
        <FileContextMenu
          x={contextMenuCoords.x}
          y={contextMenuCoords.y}
          onClose={() => setShowFileContextMenu(false)}
          setShowFileDrawer={setShowFileDrawer}
          setShowFileContextMenu={setShowFileContextMenu}
        />
      )}
    </div>
  );
}
