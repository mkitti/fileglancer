import React from 'react';
import { default as log } from '@/logger';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import {
  getOmeZarrMetadata,
  generateNeuroglancerState,
  getZarrArray
} from '@/omezarr-helper';
import type { Metadata } from '@/omezarr-helper';
import { fetchFileAsJson, getFileURL } from '@/utils';
import { useCookies } from 'react-cookie';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import * as zarr from "zarrita";

export type OpenWithToolUrls = {
  copy: string;
  validator: string;
  neuroglancer: string;
  vole: string;
};

export type ZarrArray = zarr.Array<any>;

export default function useZarrMetadata() {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [thumbnailSrc, setThumbnailSrc] = React.useState<string | null>(null);
  const [openWithToolUrls, setOpenWithToolUrls] =
    React.useState<OpenWithToolUrls | null>(null);
  
  const [metadata, setMetadata] = React.useState<Metadata | ZarrArray | null>(null);
  const [hasMultiscales, setHasMultiscales] = React.useState(false);
  const [hasZarrArray, setHasZarrArray] = React.useState(false);
  const [loadingThumbnail, setLoadingThumbnail] = React.useState(false);
  const [thumbnailError, setThumbnailError] = React.useState<string | null>(
    null
  );

  const validatorBaseUrl = 'https://ome.github.io/ome-ngff-validator/?source=';
  const neuroglancerBaseUrl = 'https://neuroglancer-demo.appspot.com/#!';
  const voleBaseUrl = 'https://volumeviewer.allencell.org/viewer?url=';
  const { currentFolder, currentFileSharePath, files, isFileBrowserReady } =
    useFileBrowserContext();
  const { dataUrl } = useProxiedPathContext();
  const [cookies] = useCookies(['_xsrf']);

  const checkZarrMetadata = React.useCallback(async () => {
    if (!isFileBrowserReady) {
      return;
    }
    log.debug('checkZarrMetadata running, resetting imageUrl/hasZarrArray/hasMultiscales to false');
    setImageUrl(null);
    setHasZarrArray(false);
    setHasMultiscales(false);
    // setThumbnailSrc(null);
    // setMetadata(null);
    // setOpenWithToolUrls(null);

    if (currentFileSharePath && currentFolder) {
      const imageUrl = getFileURL(currentFileSharePath.name, currentFolder.path);
      const zarrayFile = files.find(file => file.name === '.zarray');
      if (zarrayFile) {
        try {
          log.debug('Zarr array found');
          log.debug('- Setting hasZarrArray to true and imageUrl to ', imageUrl);
          setHasZarrArray(true);
          setImageUrl(imageUrl);
        } catch (error) {
          log.error('Error fetching Zarr array metadata:', error);
        }
      }
      else {
        const zattrsFile = files.find(file => file.name === '.zattrs');
        if (zattrsFile) {
          try {
            const zattrs = (await fetchFileAsJson(
              currentFileSharePath.name,
              zattrsFile.path,
              cookies
            )) as any;
            log.debug('Zattrs found in ', imageUrl, zattrsFile.path, zattrs);
            if (zattrs.multiscales) {
              log.debug('- Setting hasMultiscales to true and imageUrl to ', imageUrl);
              setHasMultiscales(true);
              setImageUrl(imageUrl);
            }
          } catch (error) {
            log.error('Error fetching OME-Zarr metadata:', error);
          }
        }
      }
    }
  }, [files, currentFileSharePath, currentFolder, cookies, isFileBrowserReady]);

  React.useEffect(() => {
    const asyncCheck = async () => {
      await checkZarrMetadata();
    };
    asyncCheck();
  }, [checkZarrMetadata]);


  const fetchOmeZarrMetadata = React.useCallback(async (cancelRef: { cancel: boolean }) => {
    if (!hasMultiscales || !imageUrl) {
      return;
    }
    setLoadingThumbnail(true);
    try {
      log.info('Fetching OME-Zarr metadata from ', imageUrl);
      const [metadata, error] = await getOmeZarrMetadata(imageUrl);
      if (!cancelRef.cancel) {
        setMetadata(metadata);
        setThumbnailSrc(metadata.thumbnail);
        if (error) {
          setThumbnailError(error);
          log.error('Error fetching OME-Zarr metadata:', imageUrl, error);
        } else {
          setThumbnailError(null);
        }
      }
    } catch (error) {
      log.error('Exception fetching OME-Zarr metadata:', imageUrl, error);
      if (!cancelRef.cancel) {
        setThumbnailError("Error fetching OME-Zarr metadata");
      }
    } finally {
      setLoadingThumbnail(false);
    }
  }, [hasMultiscales, imageUrl]);

  // Run thumbnail generation when hasMultiscales or imageUrl changes
  React.useEffect(() => {
    log.debug('Use effect will call fetchOmeZarrMetadata.');
    const cancelRef = { cancel: false };
    const asyncFetch = async () => {
      log.debug('Use effect calling fetchOmeZarrMetadata.');
      await fetchOmeZarrMetadata(cancelRef);
    };
    asyncFetch();
    return () => {
      cancelRef.cancel = true;
    };
  }, [fetchOmeZarrMetadata]);


  const fetchArrayMetadata = React.useCallback(async (cancelRef: { cancel: boolean }) => {
    if (!hasZarrArray || !imageUrl) {
      return;
    }
    setLoadingThumbnail(true);
    try {
      log.debug('Fetching Zarr array from ', imageUrl);
      const arr = await getZarrArray(imageUrl);
      log.debug('Zarr array', arr);
      if (!cancelRef.cancel) {
        setMetadata(arr);
        setThumbnailError("Loaded Zarr array");
      }
    } catch (error) {
      log.error('Error fetching Zarr array:', error);
      if (!cancelRef.cancel) {
        setThumbnailError("Error fetching Zarr array");
      }
    } finally {
      if (!cancelRef.cancel) {
        setLoadingThumbnail(false);
      }
    }
  }, [hasZarrArray, imageUrl]);

  // Run array logic when hasZarrArray changes
  React.useEffect(() => {
    log.debug('Use effect will call fetchArrayMetadata.');
    const cancelRef = { cancel: false };
    const asyncFetch = async () => {
      log.debug('Use effect calling fetchArrayMetadata.');
      await fetchArrayMetadata(cancelRef);
    };
    asyncFetch();
    return () => {
      cancelRef.cancel = true;
    };
  }, [fetchArrayMetadata]);

  // Run tool url generation when data url ormetadata changes
  React.useEffect(() => {
    log.debug('Metadata or dataUrl changed', metadata, dataUrl);
    setOpenWithToolUrls(null);
    if (metadata && dataUrl) {
      const openWithToolUrls = {
        copy: dataUrl,
        validator: validatorBaseUrl + dataUrl,
        vole: voleBaseUrl + dataUrl
      } as OpenWithToolUrls;
      try {
        if (metadata instanceof zarr.Array) {
          log.debug('- metadata is a zarr array');
          openWithToolUrls.neuroglancer =
            neuroglancerBaseUrl + dataUrl;
        }
        else {
          log.debug('- metadata is not a zarr array');
          openWithToolUrls.neuroglancer =
            neuroglancerBaseUrl +
            generateNeuroglancerState(
              dataUrl,
              metadata.zarr_version,
              metadata.multiscale,
              metadata.arr,
              metadata.omero
            );
        }
      } catch (error) {
        log.error('Error generating neuroglancer state:', error);
        // Fallback to the data url if the neuroglancer state generation fails
        openWithToolUrls.neuroglancer = neuroglancerBaseUrl + dataUrl;
      }
      setOpenWithToolUrls(openWithToolUrls);
    }
  }, [metadata, dataUrl]);

  return {
    thumbnailSrc,
    openWithToolUrls,
    metadata,
    hasMultiscales,
    loadingThumbnail,
    thumbnailError
  };
}
