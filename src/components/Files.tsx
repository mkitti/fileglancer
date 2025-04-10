import React from 'react';
import { useOutletContext } from 'react-router';

import { File } from '../shared.types';
import useDisplayOptions from '../hooks/useDisplayOptions';
import useContextMenu from '../hooks/useContextMenu';
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
    setPropertiesTarget,
    selectedFiles,
    setSelectedFiles,
    displayFiles,
    hideDotFiles,
    setHideDotFiles,
    showFileDrawer,
    setShowFileDrawer,
    handleLeftClicks
  } = useDisplayOptions(files);

  const {
    contextMenuCoords,
    showFileContextMenu,
    setShowFileContextMenu,
    menuRef,
    handleRightClick
  } = useContextMenu();

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
          setSelectedFiles={setSelectedFiles}
          selectedZone={selectedZone}
          getFiles={getFiles}
          handleLeftClicks={handleLeftClicks}
          showFileDrawer={showFileDrawer}
          setPropertiesTarget={setPropertiesTarget}
          handleRightClick={handleRightClick}
        />
      </div>
      {showFileContextMenu && (
        <FileContextMenu
          x={contextMenuCoords.x}
          y={contextMenuCoords.y}
          menuRef={menuRef}
          setShowFileDrawer={setShowFileDrawer}
          setShowFileContextMenu={setShowFileContextMenu}
        />
      )}
    </div>
  );
}
