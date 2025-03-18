import React from 'react';
import { useOutletContext } from 'react-router';
import FileList from '../components/ui/FileList';
import { File } from '../hooks/useFileBrowser';

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

  React.useEffect(() => {
    if (files.length === 0) {
      getFiles('local');
      setSelectedZone('/local');
    }
  }, []);

  return (
    <div className="flex-1 h-full overflow-auto">
      <FileList
        files={files}
        currentPath={currentPath}
        checked={checked}
        selectedZone={selectedZone}
        handleCheckboxToggle={handleCheckboxToggle}
        getFiles={getFiles}
      />
    </div>
  );
}
