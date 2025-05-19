import * as React from 'react';
import { Typography } from '@material-tailwind/react';

import type { File } from '../../../shared.types';
import FileListCrumbs from './Crumbs';
import FileRow from './FileRow';
import { useZoneBrowserContext } from '../../../contexts/ZoneBrowserContext';
import { useFileBrowserContext } from '../../../contexts/FileBrowserContext';
import { fetchFileAsJson } from '../../../utils';
import { getOmeZarrMetadata } from '../../../omezarr-helper';

type FileListProps = {
  files: File[];
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  showPropertiesDrawer: boolean;
  setPropertiesTarget: React.Dispatch<React.SetStateAction<File | null>>;
  hideDotFiles: boolean;
  handleRightClick: (
    e: React.MouseEvent<HTMLDivElement>,
    file: File,
    selectedFiles: File[],
    setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setPropertiesTarget: React.Dispatch<React.SetStateAction<File | null>>
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
}: FileListProps): JSX.Element {
  const { currentNavigationPath, getFileFetchPath } = useFileBrowserContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const displayFiles = React.useMemo(() => {
    return hideDotFiles
      ? files.filter(file => !file.name.startsWith('.'))
      : files;
  }, [files, hideDotFiles]);

  const [hasMultiscales, setHasMultiscales] = React.useState(false);
  const [thumbnailSrc, setThumbnailSrc] = React.useState<string | null>(null);
  const [neuroglancerUrl, setNeuroglancerUrl] = React.useState<string | null>(null);
  const neuroglancerBaseUrl = "https://neuroglancer-demo.appspot.com/#!"

  React.useEffect(() => {
    const checkZattrsForMultiscales = async () => {
      const zattrsFile = files.find(file => file.name === '.zattrs');

      if (zattrsFile && currentFileSharePath) {
        try {
          const fileFetchPath = getFileFetchPath(currentNavigationPath.replace('?subpath=', '/'));
          const imageUrl = `${window.location.origin}${fileFetchPath}`;
          const metadata = await getOmeZarrMetadata(imageUrl);
          setThumbnailSrc(metadata.thumbnail);
          setNeuroglancerUrl(neuroglancerBaseUrl + metadata.neuroglancerState);
          setHasMultiscales(true);
        } catch (error) {
          setHasMultiscales(false);
          console.error("Error getting OME-Zarrmetadata", error);
        }
      }
    };

    checkZattrsForMultiscales();
  }, [files, fetchFileAsJson, currentFileSharePath]);

  return (
    <div
      className={`px-2 transition-all duration-300 ${showPropertiesDrawer ? 'mr-[350px]' : ''}`}
    >
      <FileListCrumbs />

      {hasMultiscales ? (
        <div className="my-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <Typography variant="small" className="text-blue-600 dark:text-blue-400">
            This directory contains an OME-Zarr image
          </Typography>

          {thumbnailSrc ? (
            <img id="thumbnail" src={thumbnailSrc} alt="Thumbnail" />
          ): null}

          {neuroglancerUrl ? (
            <a href={neuroglancerUrl} target="_blank" rel="noopener noreferrer">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-400 dark:hover:bg-blue-500">
                View in Neuroglancer
              </button>
            </a>
          ) : null}

        </div>
      ): null}

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
