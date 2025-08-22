import * as React from 'react';
import { Typography } from '@material-tailwind/react';

import FileListCrumbs from './Crumbs';
import FileRow from './FileRow';
import ZarrPreview from './ZarrPreview';
import ContextMenu from '@/components/ui/Menus/ContextMenu';
import { FileRowSkeleton } from '@/components/ui/widgets/Loaders';
import useContextMenu from '@/hooks/useContextMenu';
import useZarrMetadata from '@/hooks/useZarrMetadata';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

type FileListProps = {
  showPropertiesDrawer: boolean;
  hideDotFiles: boolean;
  togglePropertiesDrawer: () => void;
  setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPermissionsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConvertFileDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function FileList({
  showPropertiesDrawer,
  hideDotFiles,
  togglePropertiesDrawer,
  setShowRenameDialog,
  setShowDeleteDialog,
  setShowPermissionsDialog,
  setShowConvertFileDialog
}: FileListProps): React.ReactNode {
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
      <FileListCrumbs />
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
        <div className="min-w-full bg-background select-none">
          {/* Header row */}
          <div className="min-w-fit grid grid-cols-[minmax(170px,2fr)_minmax(80px,1fr)_minmax(95px,1fr)_minmax(75px,1fr)_minmax(40px,1fr)] gap-4 p-0 text-foreground">
            <div className="flex w-full gap-3 px-3 py-1 overflow-x-auto">
              <Typography variant="small" className="font-bold">
                Name
              </Typography>
            </div>

            <Typography variant="small" className="font-bold overflow-x-auto">
              Type
            </Typography>

            <Typography variant="small" className="font-bold overflow-x-auto">
              Last Modified
            </Typography>

            <Typography variant="small" className="font-bold overflow-x-auto">
              Size
            </Typography>

            <Typography variant="small" className="font-bold overflow-x-auto">
              Actions
            </Typography>
          </div>
        </div>
        {/* File rows */}
        {areFileDataLoading ? (
          Array.from({ length: 10 }, (_, index) => (
            <FileRowSkeleton key={index} />
          ))
        ) : !areFileDataLoading && displayFiles.length > 0 ? (
          displayFiles.map((file, index) => {
            return (
              <FileRow
                key={`${file.name}-${index}`}
                file={file}
                index={index}
                displayFiles={displayFiles}
                showPropertiesDrawer={showPropertiesDrawer}
                handleContextMenuClick={handleContextMenuClick}
              />
            );
          })
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
          showPropertiesDrawer={showPropertiesDrawer}
          togglePropertiesDrawer={togglePropertiesDrawer}
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
