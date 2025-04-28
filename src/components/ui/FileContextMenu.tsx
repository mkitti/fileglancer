import * as React from 'react';
import ReactDOM from 'react-dom';
import { Typography } from '@material-tailwind/react';
import type { File } from '../../shared.types';
import { useZoneBrowserContext } from '../../contexts/ZoneBrowserContext';
import { usePreferencesContext } from '../../contexts/PreferencesContext';

type ContextMenuProps = {
  x: number;
  y: number;
  menuRef: React.RefObject<HTMLDivElement>;
  selectedFiles: File[];
  setShowFilePropertiesDrawer: (show: boolean) => void;
  setShowFileContextMenu: (show: boolean) => void;
};

export default function FileContextMenu({
  x,
  y,
  menuRef,
  selectedFiles,
  setShowFilePropertiesDrawer,
  setShowFileContextMenu
}: ContextMenuProps): JSX.Element {
  const { currentNavigationZone, currentFileSharePath } =
    useZoneBrowserContext();
  const { handleFavoriteChange } = usePreferencesContext();
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-background shadow-lg shadow-surface rounded-md p-2"
      style={{
        left: `${x}px`,
        top: `${y}px`
      }}
    >
      <div className="flex flex-col gap-2">
        <Typography
          className="text-sm p-1 cursor-pointer text-secondary-light hover:bg-secondary-light/30 transition-colors whitespace-nowrap"
          onClick={() => {
            setShowFilePropertiesDrawer(true);
            setShowFileContextMenu(false);
          }}
        >
          View file properties
        </Typography>
        {(selectedFiles.length === 1 && selectedFiles[0].is_dir) ||
        (selectedFiles.length > 1 &&
          selectedFiles.some(file => file.is_dir)) ? (
          <Typography
            className="text-sm p-1 cursor-pointer text-secondary-light hover:bg-secondary-light/30 transition-colors whitespace-nowrap"
            onClick={() => {
              if (currentNavigationZone && currentFileSharePath) {
                if (selectedFiles.length === 1) {
                  handleFavoriteChange(
                    {
                      fileSharePath: currentFileSharePath,
                      name: selectedFiles[0].name,
                      path: selectedFiles[0].path
                    },
                    'directory'
                  );
                } else if (selectedFiles.length > 1) {
                  const directoriesToAdd = selectedFiles
                    .filter(file => file.is_dir)
                    .map(file => ({
                      navigationZone: currentNavigationZone,
                      fileSharePath: currentFileSharePath,
                      name: file.name,
                      path: file.path
                    }));

                  handleFavoriteChange(directoriesToAdd, 'directory');
                  setShowFileContextMenu(false);
                }
              }
            }}
          >
            Set/unset as favorite
          </Typography>
        ) : null}
      </div>
    </div>,
    document.body // Render directly to body
  );
}
