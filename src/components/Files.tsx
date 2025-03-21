import React from 'react';
import { useOutletContext } from 'react-router';

import { File } from '../hooks/useFileBrowser';
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
    setSelectedZone,
    handleCheckboxToggle,
    getFiles
  }: FilesRouteProps = useOutletContext();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [hideDotFiles, setHideDotFiles] = React.useState<boolean>(true);
  const [showFileDrawer, setShowFileDrawer] = React.useState<boolean>(false);
  const [showFileContextMenu, setShowFileContextMenu] =
    React.useState<boolean>(false);
  const [contextMenuCoords, setContextMenuCoords] = React.useState({
    x: 0,
    y: 0
  });

  const displayFiles = React.useMemo(() => {
    return hideDotFiles
      ? files.filter(file => !file.name.startsWith('.'))
      : files;
  }, [files, hideDotFiles]);

  const handleFileClick = (e: React.MouseEvent<HTMLDivElement>, file: File) => {
    e.preventDefault();
    setSelectedFile(prev => (prev === file ? null : file));
    if (e.type === 'contextmenu') {
      setContextMenuCoords({ x: e.clientX, y: e.clientY });
      setShowFileContextMenu(true);
      e.stopPropagation();
    }
  };

  React.useEffect(() => {
    if (files.length === 0) {
      getFiles('local');
      setSelectedZone('/local');
    }
  }, []);

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
