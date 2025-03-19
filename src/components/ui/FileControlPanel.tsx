import * as React from 'react';
import { Switch } from '@material-tailwind/react';

type FileControlPanelProps = {
  hideDotFiles: boolean;
  setHideDotFiles: React.Dispatch<React.SetStateAction<boolean>>;
  showFileDrawer: boolean;
  setShowFileDrawer: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function FileControlPanel({
  hideDotFiles,
  setHideDotFiles,
  showFileDrawer,
  setShowFileDrawer
}: FileControlPanelProps) {
  return (
    <div className="flex flex-col min-w-full border-b border-gray-200">
      <div className="flex items-center gap-2 px-4 py-2">
        <Switch
          id="toggle-dot-files"
          checked={hideDotFiles}
          onClick={() => setHideDotFiles((prev: boolean) => !prev)}
        />
        <label
          htmlFor="toggle-dot-files"
          className={`cursor-pointer text-sm ${hideDotFiles ? 'text-black' : 'text-secondary-dark'}`}
        >
          Dot files hidden
        </label>
      </div>

      <div className="flex items-center gap-2 px-4 py-2">
        <Switch
          id="show-file-drawer"
          checked={showFileDrawer}
          onClick={() => setShowFileDrawer((prev: boolean) => !prev)}
        />
        <label
          htmlFor="show-file-drawer"
          className={`cursor-pointer text-sm ${hideDotFiles ? 'text-black' : 'text-secondary-dark'}`}
        >
          Show file properties
        </label>
      </div>
    </div>
  );
}
