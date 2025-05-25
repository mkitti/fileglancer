import React from 'react';
import type { FileOrFolder } from '@/shared.types';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { getOmeZarrMetadata } from '@/omezarr-helper';
import type { Metadata } from '@/omezarr-helper';
import { useZoneBrowserContext } from '@/contexts/ZoneBrowserContext';
import { fetchFileAsJson } from '@/utils';
import { useCookies } from 'react-cookie';

export default function useZarrMetadata(files: FileOrFolder[]) {
  const [thumbnailSrc, setThumbnailSrc] = React.useState<string | null>(null);
  const [neuroglancerUrl, setNeuroglancerUrl] = React.useState<string | null>(
    null
  );
  const [metadata, setMetadata] = React.useState<Metadata | null>(null);
  const [hasMultiscales, setHasMultiscales] = React.useState(false);
  const [loadingThumbnail, setLoadingThumbnail] = React.useState(false);

  const proxyBaseUrl = 'https://rokickik-dev.int.janelia.org:7878/files';
  const neuroglancerBaseUrl = 'https://neuroglancer-demo.appspot.com/#!';
  const { currentNavigationPath, getFileFetchPath } = useFileBrowserContext();
  const { currentFileSharePath } = useZoneBrowserContext();
  const [cookies] = useCookies(['_xsrf']);  

  const checkZattrsForMultiscales = React.useCallback(async () => {
    setHasMultiscales(false);
    setThumbnailSrc(null);
    setMetadata(null);
    setNeuroglancerUrl(null);
    const zattrsFile = files.find(file => file.name === '.zattrs');
    if (zattrsFile && currentFileSharePath) {
      setHasMultiscales(true);
      setLoadingThumbnail(true);
      try {
        const zattrs = (await fetchFileAsJson(`${currentFileSharePath.name}/${zattrsFile.path}`, cookies)) as any;
        console.log('Zattrs', zattrs);
        if (zattrs.multiscales) {
          console.log('Found OME-Zarr metadata:', zattrs.multiscales);
          const fileFetchPath = getFileFetchPath(
            currentNavigationPath.replace('?subpath=', '/')
          );
          const imageUrl = `${window.location.origin}${fileFetchPath}`;
          const metadata = await getOmeZarrMetadata(imageUrl);
          setMetadata(metadata);
          setThumbnailSrc(metadata.thumbnail);
          setNeuroglancerUrl(neuroglancerBaseUrl + metadata.neuroglancerState);
        }
        else {
          setHasMultiscales(false);
        }
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
