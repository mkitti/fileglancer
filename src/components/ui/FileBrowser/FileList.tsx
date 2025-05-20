import * as React from 'react';
import { Typography } from '@material-tailwind/react';

import type { FileOrFolder } from '@/shared.types';
import type { Metadata } from '@/omezarr-helper';
import FileListCrumbs from './Crumbs';
import FileRow from './FileRow';
import { useZoneBrowserContext } from '@/contexts/ZoneBrowserContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { getOmeZarrMetadata } from '@/omezarr-helper';
import ZarrPreview from './ZarrPreview';

type FileListProps = {
  files: FileOrFolder[];
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
  files,
  selectedFiles,
  setSelectedFiles,
  showPropertiesDrawer,
  setPropertiesTarget,
  hideDotFiles,
  handleRightClick
}: FileListProps): React.ReactNode {
  const { currentNavigationPath, getFileFetchPath } = useFileBrowserContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const displayFiles = React.useMemo(() => {
    return hideDotFiles
      ? files.filter(file => !file.name.startsWith('.'))
      : files;
  }, [files, hideDotFiles]);

  const [loadingThumbnail, setLoadingThumbnail] = React.useState(false);
  const [hasMultiscales, setHasMultiscales] = React.useState(false);
  const [thumbnailSrc, setThumbnailSrc] = React.useState<string | null>(null);
  const [neuroglancerUrl, setNeuroglancerUrl] = React.useState<string | null>(
    null
  );
  const [metadata, setMetadata] = React.useState<Metadata | null>(null);
  const neuroglancerBaseUrl = 'https://neuroglancer-demo.appspot.com/#!';

  React.useEffect(() => {
    const checkZattrsForMultiscales = async () => {
      setHasMultiscales(false);
      const zattrsFile = files.find(file => file.name === '.zattrs');
      if (zattrsFile && currentFileSharePath) {
        setHasMultiscales(true);
        setLoadingThumbnail(true);
        try {
          const fileFetchPath = getFileFetchPath(
            currentNavigationPath.replace('?subpath=', '/')
          );
          const imageUrl = `${window.location.origin}${fileFetchPath}`;
          const metadata = await getOmeZarrMetadata(imageUrl);
          setMetadata(metadata);
          setThumbnailSrc(metadata.thumbnail);
          setNeuroglancerUrl(neuroglancerBaseUrl + metadata.neuroglancerState);
        } catch (error) {
          console.error('Error getting OME-Zarrmetadata', error);
        }
        setLoadingThumbnail(false);
      } else {
        setHasMultiscales(false);
        setMetadata(null);
      }
    };
    checkZattrsForMultiscales();
  }, [currentNavigationPath]);

  return (
    <div
      className={`px-2 transition-all duration-300 ${showPropertiesDrawer ? 'mr-[350px]' : ''}`}
    >
      <FileListCrumbs />

      {hasMultiscales ? (
        <ZarrPreview
          thumbnailSrc={thumbnailSrc}
          loadingThumbnail={loadingThumbnail}
          neuroglancerUrl={neuroglancerUrl}
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

        {/* File rows */}
        {displayFiles.length > 0 &&
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
          })}
      </div>
    </div>
  );
}
