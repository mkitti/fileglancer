import * as React from 'react';
import { Typography } from '@material-tailwind/react';

import Crumbs from './Crumbs';
import ZarrPreview from './ZarrPreview';
import Table from './FileTable';
import ContextMenu from '@/components/ui/Menus/ContextMenu';
import { FileRowSkeleton } from '@/components/ui/widgets/Loaders';
import useContextMenu from '@/hooks/useContextMenu';
import useZarrMetadata from '@/hooks/useZarrMetadata';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

type FileBrowserProps = {
  showPropertiesDrawer: boolean;
  hideDotFiles: boolean;
  togglePropertiesDrawer: () => void;
  setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPermissionsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConvertFileDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function FileBrowser({
  showPropertiesDrawer,
  hideDotFiles,
  togglePropertiesDrawer,
  setShowRenameDialog,
  setShowDeleteDialog,
  setShowPermissionsDialog,
  setShowConvertFileDialog
}: FileBrowserProps): React.ReactNode {
  const { fileBrowserState, areFileDataLoading } = useFileBrowserContext();

  const {
    contextMenuCoords,
    showContextMenu,
    setShowContextMenu,
    menuRef,
    handleContextMenuClick
  } = useContextMenu();

  const {
    metadata,
    thumbnailSrc,
    openWithToolUrls,
    loadingThumbnail,
    thumbnailError
  } = useZarrMetadata();

  const displayFiles = React.useMemo(() => {
    return hideDotFiles
      ? fileBrowserState.files.filter(file => !file.name.startsWith('.'))
      : fileBrowserState.files;
  }, [fileBrowserState.files, hideDotFiles]);

  return (
    <div className="px-2 transition-all duration-300 flex flex-col h-full overflow-hidden">
      <Crumbs />
      <div className="overflow-y-auto">
        {metadata ? (
          <ZarrPreview
            metadata={metadata}
            thumbnailSrc={thumbnailSrc}
            loadingThumbnail={loadingThumbnail}
            openWithToolUrls={openWithToolUrls}
            thumbnailError={thumbnailError}
          />
        ) : null}

        {/* Loading state */}
        {areFileDataLoading ? (
          <div className="min-w-full bg-background select-none">
            {Array.from({ length: 10 }, (_, index) => (
              <FileRowSkeleton key={index} />
            ))}
          </div>
        ) : !areFileDataLoading && displayFiles.length > 0 ? (
          <Table
            data={displayFiles}
            showPropertiesDrawer={showPropertiesDrawer}
            handleContextMenuClick={handleContextMenuClick}
          />
        ) : !areFileDataLoading &&
          displayFiles.length === 0 &&
          !fileBrowserState.uiErrorMsg ? (
          <div className="flex items-center pl-3 py-1">
            <Typography className="text-primary-default">
              No files available for display.
            </Typography>
          </div>
        ) : !areFileDataLoading &&
          displayFiles.length === 0 &&
          fileBrowserState.uiErrorMsg ? (
          /* Error state */
          <div className="flex items-center pl-3 py-1">
            <Typography className="text-primary-default">
              {fileBrowserState.uiErrorMsg}
            </Typography>
          </div>
        ) : null}
      </div>
      {showContextMenu ? (
        <ContextMenu
          x={contextMenuCoords.x}
          y={contextMenuCoords.y}
          menuRef={menuRef}
          togglePropertiesDrawer={togglePropertiesDrawer}
          showPropertiesDrawer={showPropertiesDrawer}
          setShowContextMenu={setShowContextMenu}
          setShowRenameDialog={setShowRenameDialog}
          setShowDeleteDialog={setShowDeleteDialog}
          setShowPermissionsDialog={setShowPermissionsDialog}
          setShowConvertFileDialog={setShowConvertFileDialog}
        />
      ) : null}
    </div>
  );
}
