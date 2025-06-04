import React from 'react';
import type { FileOrFolder } from '@/shared.types';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import {
  getOmeZarrMetadata,
  generateNeuroglancerState
} from '@/omezarr-helper';
import type { Metadata } from '@/omezarr-helper';
import { fetchFileAsJson, getFileFetchPath } from '@/utils';
import { useCookies } from 'react-cookie';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';

export default function useZarrMetadata(files: FileOrFolder[]) {
  const [thumbnailSrc, setThumbnailSrc] = React.useState<string | null>(null);
  const [neuroglancerUrl, setNeuroglancerUrl] = React.useState<string | null>(
    null
  );
  const [metadata, setMetadata] = React.useState<Metadata | null>(null);
  const [hasMultiscales, setHasMultiscales] = React.useState(false);
  const [loadingThumbnail, setLoadingThumbnail] = React.useState(false);

  const neuroglancerBaseUrl = 'https://neuroglancer-demo.appspot.com/#!';
  const { currentFileOrFolder, currentFileSharePath } = useFileBrowserContext();
  const { dataUrl } = useProxiedPathContext();
  const [cookies] = useCookies(['_xsrf']);

  const checkZattrsForMultiscales = React.useCallback(async () => {
    setHasMultiscales(false);
    setThumbnailSrc(null);
    setMetadata(null);
    setNeuroglancerUrl(null);
    const zattrsFile = files.find(file => file.name === '.zattrs');
    if (zattrsFile && currentFileSharePath && currentFileOrFolder) {
      try {
        const zattrs = (await fetchFileAsJson(
          `${currentFileSharePath.name}/${zattrsFile.path}`,
          cookies
        )) as any;
        console.log('Zattrs', zattrs);
        if (zattrs.multiscales) {
          setHasMultiscales(true);
          const fileFetchPath = getFileFetchPath(
            currentFileSharePath.name,
            currentFileOrFolder.path
          );
          const imageUrl = `${window.location.origin}${fileFetchPath}`;
          setLoadingThumbnail(true);
          const metadata = await getOmeZarrMetadata(imageUrl);
          setMetadata(metadata);
          setThumbnailSrc(metadata.thumbnail);
        }
      } catch (error) {
        console.error('Error fetching OME-Zarr metadata:', error);
      } finally {
        setLoadingThumbnail(false);
      }
    }
  }, [files, currentFileSharePath, currentFileOrFolder, cookies]);

  React.useEffect(() => {
    checkZattrsForMultiscales();
  }, [checkZattrsForMultiscales]);

  React.useEffect(() => {
    setNeuroglancerUrl(null);
    if (metadata && dataUrl) {
      const neuroglancerState = generateNeuroglancerState(
        dataUrl,
        metadata.zarr_version,
        metadata.multiscale,
        metadata.arr,
        metadata.omero
      );
      setNeuroglancerUrl(neuroglancerBaseUrl + neuroglancerState);
    }
  }, [metadata, dataUrl]);

  return {
    thumbnailSrc,
    neuroglancerUrl,
    metadata,
    hasMultiscales,
    loadingThumbnail
  };
}
