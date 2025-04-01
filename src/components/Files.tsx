import React from 'react';
import { useOutletContext } from 'react-router';

import { File } from '../hooks/useFileBrowser';
import useDisplayOptions from '../hooks/useDisplayOptions';
import FileList from './ui/FileList';
import FilePropertiesDrawer from './ui/FilePropertiesDrawer';
import FileControlPanel from './ui/FileControlPanel';
import FileContextMenu from './ui/FileContextMenu';

type FilesRouteProps = {
  files: File[];
  currentPath: string;
  checked: string[];
  selectedZone: string | null;
  setSelectedZone: (zone: string | null) => void;
  handleCheckboxToggle: (file: File) => void;
  getFiles: (path: string) => void;
};

export default function Files() {
  const {
    files,
    currentPath,
    checked,
    selectedZone,
    handleCheckboxToggle,
    getFiles
  }: FilesRouteProps = useOutletContext();

  const {
    selectedFile,
    displayFiles,
    hideDotFiles,
    setHideDotFiles,
    showFileDrawer,
    setShowFileDrawer,
    showFileContextMenu,
    setShowFileContextMenu,
    contextMenuCoords,
    handleFileClick
  } = useDisplayOptions(files);

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <FileControlPanel
        hideDotFiles={hideDotFiles}
        setHideDotFiles={setHideDotFiles}
        setShowFileDrawer={setShowFileDrawer}
      />
      <div className="relative grow">
        <FilePropertiesDrawer
          selectedFile={selectedFile}
          open={showFileDrawer}
          setShowFileDrawer={setShowFileDrawer}
        />
        <FileList
          displayFiles={displayFiles}
          currentPath={currentPath}
          checked={checked}
          selectedZone={selectedZone}
          handleCheckboxToggle={handleCheckboxToggle}
          getFiles={getFiles}
          handleFileClick={handleFileClick}
          showFileDrawer={showFileDrawer}
          selectedFile={selectedFile}
        />
      </div>
      {showFileContextMenu && (
        <FileContextMenu
          x={contextMenuCoords.x}
          y={contextMenuCoords.y}
          onClose={() => setShowFileContextMenu(false)}
          setShowFileDrawer={setShowFileDrawer}
        />
      )}
    </div>
  );
}
