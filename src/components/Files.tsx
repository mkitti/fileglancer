import React from 'react';
import { useOutletContext } from 'react-router';

import FileList from './ui/FileList';

import { File } from '../hooks/useFileBrowser';
import FilePropertiesPanel from './ui/FilePropertiesPanel';
import FileControlPanel from './ui/FileControlPanel';

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

  const displayFiles = React.useMemo(() => {
    return hideDotFiles
      ? files.filter(file => !file.name.startsWith('.'))
      : files;
  }, [files, hideDotFiles]);

  const handleFileClick = (e: React.MouseEvent<HTMLDivElement>, file: File) => {
    e.preventDefault();
    if (e.type === 'contextmenu') {
      setSelectedFile(file);
    } else {
      console.log('File clicked:', file);
      setSelectedFile(prev => (prev === file ? null : file));
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
        showFileDrawer={showFileDrawer}
        setShowFileDrawer={setShowFileDrawer}
      />
      <div className="relative grow">
        <FilePropertiesPanel
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
    </div>
  );
}
