import React from 'react';
import { useOutletContext } from 'react-router';
import { Switch } from '@material-tailwind/react';
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

  const [hideDotFiles, setHideDotFiles] = React.useState<boolean>(true);

  const noDotFiles = React.useMemo(() => {
    return hideDotFiles
      ? files.filter(file => !file.name.startsWith('.'))
      : files;
  }, [files, hideDotFiles]);

  React.useEffect(() => {
    if (files.length === 0) {
      getFiles('local');
      setSelectedZone('/local');
    }
  }, []);

  return (
    <div className="flex-1 h-full overflow-auto">
      <div className="flex items-center gap-2 px-4 py-2">
        <Switch
          id="toggle-dot-files"
          checked={hideDotFiles}
          onChange={() => setHideDotFiles(prev => !prev)}
        />
        <label
          htmlFor="toggle-dot-files"
          className={`cursor-pointer text-sm ${hideDotFiles ? 'text-black' : 'text-secondary-dark'}`}
        >
          Dot files hidden
        </label>
      </div>
      <FileList
        files={hideDotFiles ? noDotFiles : files}
        currentPath={currentPath}
        checked={checked}
        selectedZone={selectedZone}
        handleCheckboxToggle={handleCheckboxToggle}
        getFiles={getFiles}
      />
    </div>
  );
}
