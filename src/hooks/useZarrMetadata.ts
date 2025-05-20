import React from 'react';
import type { File, FileSharePathItem } from '@/shared.types';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { getOmeZarrMetadata } from '@/omezarr-helper';
import type { Metadata } from '@/omezarr-helper';

export default function useZarrMetadata(
  files: File[],
  currentFileSharePath: FileSharePathItem | null
) {
  const [thumbnailSrc, setThumbnailSrc] = React.useState<string | null>(null);
  const [neuroglancerUrl, setNeuroglancerUrl] = React.useState<string | null>(
    null
  );
  const [metadata, setMetadata] = React.useState<Metadata | null>(null);
  const [hasMultiscales, setHasMultiscales] = React.useState(false);
  const [loadingThumbnail, setLoadingThumbnail] = React.useState(false);

  const neuroglancerBaseUrl = 'https://neuroglancer-demo.appspot.com/#!';
  const { currentNavigationPath, getFileFetchPath } = useFileBrowserContext();

  const checkZattrsForMultiscales = React.useCallback(async () => {
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
        console.error('Error fetching OME-Zarr metadata:', error);
      }
      setLoadingThumbnail(false);
    } else {
      setHasMultiscales(false);
    }
  }, [files, currentFileSharePath, currentNavigationPath, getFileFetchPath]);

  React.useEffect(() => {
    checkZattrsForMultiscales();
  }, [checkZattrsForMultiscales]);

  return {
    thumbnailSrc,
    neuroglancerUrl,
    metadata,
    hasMultiscales,
    loadingThumbnail
  };
}
