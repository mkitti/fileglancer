import * as React from 'react';
import { Typography } from '@material-tailwind/react';

import type { FileOrFolder } from '@/shared.types';
import FileListCrumbs from './Crumbs';
import FileRow from './FileRow';
import ZarrPreview from './ZarrPreview';
import useZarrMetadata from '@/hooks/useZarrMetadata';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import Loader from '../Loader';

type FileListProps = {
  selectedFiles: FileOrFolder[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<FileOrFolder[]>>;
  showPropertiesDrawer: boolean;
  setPropertiesTarget: React.Dispatch<
    React.SetStateAction<FileOrFolder | null>
  >;
  hideDotFiles: boolean;
  handleRightClick: (
    e: React.MouseEvent<HTMLDivElement>,
    file: FileOrFolder,
    selectedFiles: FileOrFolder[],
    setSelectedFiles: React.Dispatch<React.SetStateAction<FileOrFolder[]>>,
    setPropertiesTarget: React.Dispatch<
      React.SetStateAction<FileOrFolder | null>
    >
  ) => void;
};

export default function FileList({
  selectedFiles,
  setSelectedFiles,
  showPropertiesDrawer,
  setPropertiesTarget,
  hideDotFiles,
  handleRightClick
}: FileListProps): React.ReactNode {
  const { files, isFileBrowserReady } = useFileBrowserContext();
  const {
    thumbnailSrc,
    openWithToolUrls,
    metadata,
    hasMultiscales,
    loadingThumbnail
  } = useZarrMetadata();

  const displayFiles = React.useMemo(() => {
    return hideDotFiles
      ? files.filter(file => !file.name.startsWith('.'))
      : files;
  }, [files, hideDotFiles]);

  return (
    <div className="px-2 transition-all duration-300 flex flex-col h-full overflow-hidden">
      <FileListCrumbs />
      <div className="overflow-y-auto">
        {hasMultiscales ? (
          <ZarrPreview
            thumbnailSrc={thumbnailSrc}
            loadingThumbnail={loadingThumbnail}
            openWithToolUrls={openWithToolUrls}
            metadata={metadata}
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
        {isFileBrowserReady && displayFiles.length > 0 ? (
          displayFiles.map((file, index) => {
            return (
              <FileRow
                key={file.name}
                file={file}
                index={index}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                displayFiles={displayFiles}
                showPropertiesDrawer={showPropertiesDrawer}
                setPropertiesTarget={setPropertiesTarget}
                handleRightClick={handleRightClick}
              />
            );
          })
        ) : isFileBrowserReady && displayFiles.length === 0 ? (
          <div className="flex items-center pl-3 py-1">
            <Typography className="text-primary-default">
              No files available for display.
            </Typography>
          </div>
        ) : (
          <div className="flex justify-center w-full py-2">
            <Loader />
          </div>
        )}
      </div>
    </div>
  );
}
