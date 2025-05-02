import React from 'react';

import useContextMenu from '../hooks/useContextMenu';
import useShowPropertiesDrawer from '../hooks/useShowPropertiesDrawer';
import usePropertiesTarget from '../hooks/usePropertiesTarget';
import useHideDotFiles from '../hooks/useHideDotFiles';
import useSelectedFiles from '../hooks/useSelectedFiles';

import FileList from './ui/FileBrowser/FileList';
import PropertiesDrawer from './ui/PropertiesDrawer/PropertiesDrawer';
import Toolbar from './ui/FileBrowser/Toolbar';
import ContextMenu from './ui/FileBrowser/ContextMenu';

export default function Files() {
  const {
    contextMenuCoords,
    showContextMenu,
    setShowContextMenu,
    menuRef,
    handleRightClick
  } = useContextMenu();
  const { showPropertiesDrawer, setShowPropertiesDrawer } =
    useShowPropertiesDrawer();
  const { propertiesTarget, setPropertiesTarget } = usePropertiesTarget();
  const { hideDotFiles, setHideDotFiles, displayFiles } = useHideDotFiles();
  const { selectedFiles, setSelectedFiles } = useSelectedFiles();

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <Toolbar hideDotFiles={hideDotFiles} setHideDotFiles={setHideDotFiles} />
      <div className="relative grow">
        <PropertiesDrawer
          propertiesTarget={propertiesTarget}
          open={showPropertiesDrawer}
          setShowPropertiesDrawer={setShowPropertiesDrawer}
        />
        <FileList
          displayFiles={displayFiles}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          showPropertiesDrawer={showPropertiesDrawer}
          setPropertiesTarget={setPropertiesTarget}
          handleRightClick={handleRightClick}
        />
      </div>
      {showContextMenu && (
        <ContextMenu
          x={contextMenuCoords.x}
          y={contextMenuCoords.y}
          menuRef={menuRef}
          selectedFiles={selectedFiles}
          setShowPropertiesDrawer={setShowPropertiesDrawer}
          setShowContextMenu={setShowContextMenu}
        />
      )}
    </div>
  );
}
