import React from 'react';
import { default as log } from '@/logger';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import {
  getOmeZarrMetadata,
  generateNeuroglancerState
} from '@/omezarr-helper';
import type { Metadata } from '@/omezarr-helper';
import { fetchFileAsJson, getFileURL } from '@/utils';
import { useCookies } from 'react-cookie';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';

export type OpenWithToolUrls = {
  copy: string;
  validator: string;
  neuroglancer: string;
  vole: string;
};

export default function useZarrMetadata() {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [thumbnailSrc, setThumbnailSrc] = React.useState<string | null>(null);
  const [openWithToolUrls, setOpenWithToolUrls] =
    React.useState<OpenWithToolUrls | null>(null);
  const [metadata, setMetadata] = React.useState<Metadata | null>(null);
  const [hasMultiscales, setHasMultiscales] = React.useState(false);
  const [loadingThumbnail, setLoadingThumbnail] = React.useState(false);

  const validatorBaseUrl = 'https://ome.github.io/ome-ngff-validator/?source=';
  const neuroglancerBaseUrl = 'https://neuroglancer-demo.appspot.com/#!';
  const voleBaseUrl = 'https://volumeviewer.allencell.org/viewer?url=';
  const { currentFolder, currentFileSharePath, files, isFileBrowserReady } =
    useFileBrowserContext();
  const { dataUrl } = useProxiedPathContext();
  const [cookies] = useCookies(['_xsrf']);

  const checkZattrsForMultiscales = React.useCallback(async () => {
    if (!isFileBrowserReady) {
      return;
    }
    setHasMultiscales(false);
    setImageUrl(null);
    setThumbnailSrc(null);
    setMetadata(null);
    setOpenWithToolUrls(null);
    const zattrsFile = files.find(file => file.name === '.zattrs');
    if (zattrsFile && currentFileSharePath && currentFolder) {
      try {
        const zattrs = (await fetchFileAsJson(
          currentFileSharePath.name,
          zattrsFile.path,
          cookies
        )) as any;
        log.debug('Zattrs', zattrs);
        if (zattrs.multiscales) {
          setHasMultiscales(true);
          setImageUrl(
            getFileURL(currentFileSharePath.name, currentFolder.path)
          );
        }
      } catch (error) {
        log.error('Error fetching OME-Zarr metadata:', error);
      }
    }
  }, [files, currentFileSharePath, currentFolder, cookies, isFileBrowserReady]);

  // 2. Run checkZattrsForMultiscales when dependencies change
  React.useEffect(() => {
    let cancelled = false;
    if (!cancelled) {
      checkZattrsForMultiscales();
    }
    return () => {
      cancelled = true;
    };
  }, [checkZattrsForMultiscales]);

  // 3. Run your metadata/thumbnail logic when hasMultiscales and currentFolder are ready
  React.useEffect(() => {
    if (!hasMultiscales || !imageUrl) {
      return;
    }
    let cancelled = false;
    const fetchMetadata = async () => {
      setLoadingThumbnail(true);
      try {
        const metadata = await getOmeZarrMetadata(imageUrl);
        if (!cancelled) {
          setMetadata(metadata);
          setThumbnailSrc(metadata.thumbnail);
        }
      } catch (error) {
        log.error('Error fetching OME-Zarr metadata:', error);
      } finally {
        setLoadingThumbnail(false);
      }
    };
    fetchMetadata();
    return () => {
      cancelled = true;
    };
  }, [hasMultiscales, imageUrl]);

  React.useEffect(() => {
    setOpenWithToolUrls(null);
    if (metadata && dataUrl) {
      const openWithToolUrls = {
        copy: dataUrl,
        validator: validatorBaseUrl + dataUrl,
        vole: voleBaseUrl + dataUrl
      } as OpenWithToolUrls;
      try {
        openWithToolUrls.neuroglancer =
          neuroglancerBaseUrl +
          generateNeuroglancerState(
            dataUrl,
            metadata.zarr_version,
            metadata.multiscale,
            metadata.arr,
            metadata.omero
          );
      } catch (error) {
        console.error('Error generating neuroglancer state:', error);
      }
      setOpenWithToolUrls(openWithToolUrls);
    }
  }, [metadata, dataUrl]);

  return {
    thumbnailSrc,
    openWithToolUrls,
    metadata,
    hasMultiscales,
    loadingThumbnail
  };
}
