import React from 'react';

import useContextMenu from '../hooks/useContextMenu';
import useShowPropertiesDrawer from '../hooks/useShowPropertiesDrawer';
import usePropertiesTarget from '../hooks/usePropertiesTarget';
import useHideDotFiles from '../hooks/useHideDotFiles';
import useSelectedFiles from '../hooks/useSelectedFiles';
import useNamingDialog from '../hooks/useNamingDialog';

import FileList from './ui/FileBrowser/FileList';
import PropertiesDrawer from './ui/PropertiesDrawer/PropertiesDrawer';
import Toolbar from './ui/FileBrowser/Toolbar';
import ContextMenu from './ui/FileBrowser/ContextMenu';
import ItemNamingDialog from './ui/FileBrowser/ItemNamingDialog';

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
  const {
    namingDialogType,
    setNamingDialogType,
    showNamingDialog,
    setShowNamingDialog,
    handleDialogSubmit,
    newName,
    setNewName,
    showAlert,
    setShowAlert,
    alertContent
  } = useNamingDialog();

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <Toolbar
        hideDotFiles={hideDotFiles}
        setHideDotFiles={setHideDotFiles}
        setShowPropertiesDrawer={setShowPropertiesDrawer}
        setShowNamingDialog={setShowNamingDialog}
        setNamingDialogType={setNamingDialogType}
      />
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
      {showContextMenu ? (
        <ContextMenu
          x={contextMenuCoords.x}
          y={contextMenuCoords.y}
          menuRef={menuRef}
          selectedFiles={selectedFiles}
          setShowPropertiesDrawer={setShowPropertiesDrawer}
          setShowContextMenu={setShowContextMenu}
          setShowNamingDialog={setShowNamingDialog}
          setNamingDialogType={setNamingDialogType}
        />
      ) : null}
      {showNamingDialog ? (
        <ItemNamingDialog
          selectedFiles={selectedFiles}
          showNamingDialog={showNamingDialog}
          setShowNamingDialog={setShowNamingDialog}
          handleDialogSubmit={handleDialogSubmit}
          newName={newName}
          setNewName={setNewName}
          showAlert={showAlert}
          setShowAlert={setShowAlert}
          alertContent={alertContent}
          namingDialogType={namingDialogType}
        />
      ) : null}
    </div>
  );
}
