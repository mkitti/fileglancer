import React from 'react';
import FileList from '../components/ui/FileList';
import useFileBrowser from '../hooks/useFileBrowser';

export default function Files() {
  const {
    files,
    fileSharePaths,
    currentPath,
    checked,
    selectedZone,
    getFiles,
    handleCheckboxToggle,
  } = useFileBrowser();

  React.useEffect(() => {
    if (files.length === 0 && Object.keys(fileSharePaths).length > 0) {
      if (selectedZone) {
        getFiles(selectedZone);
      }
    }
  }, [selectedZone, fileSharePaths]);

  console.log('files in Files.tsx', files);
  console.log('fileSharePaths in Files.tsx', fileSharePaths);

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
