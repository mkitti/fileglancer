import React from 'react';
import { default as log } from '@/logger';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import {
  getOmeZarrMetadata,
  getZarrArray,
  generateNeuroglancerStateForZarrArray,
  generateNeuroglancerStateForOmeZarr,
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
export type ZarrMetadata = Metadata | ZarrArray | null;

export default function useZarrMetadata() {
  const [thumbnailSrc, setThumbnailSrc] = React.useState<string | null>(null);
  const [openWithToolUrls, setOpenWithToolUrls] = React.useState<OpenWithToolUrls | null>(null);
  const [metadata, setMetadata] = React.useState<ZarrMetadata>(null);
  const [loadingThumbnail, setLoadingThumbnail] = React.useState(false);
  const [thumbnailError, setThumbnailError] = React.useState<string | null>(null);

  const validatorBaseUrl = 'https://ome.github.io/ome-ngff-validator/?source=';
  const neuroglancerBaseUrl = 'https://neuroglancer-demo.appspot.com/#!';
  const voleBaseUrl = 'https://volumeviewer.allencell.org/viewer?url=';
  const { fileBrowserState } = useFileBrowserContext();
  const { dataUrl } = useProxiedPathContext();
  const [cookies] = useCookies(['_xsrf']);

  const checkZarrMetadata = React.useCallback(async (cancelRef: { cancel: boolean }) => {
    if (!fileBrowserState.isFileBrowserReady) {
      return;
    }
    log.debug('[checkZarrMetadata] resetting metadata to null');
    setMetadata(null);
    setThumbnailSrc(null);
    setOpenWithToolUrls(null);

    if (fileBrowserState.currentFileSharePath && fileBrowserState.currentFolder) {
      const imageUrl = getFileURL(fileBrowserState.currentFileSharePath.name, fileBrowserState.currentFolder.path);
      const zarrayFile = fileBrowserState.files.find(file => file.name === '.zarray');
      if (zarrayFile) {
        try {
          log.debug('[checkZarrMetadata] Setting hasZarrArray to true and imageUrl to ', imageUrl);
          
          setThumbnailError(null);
          setLoadingThumbnail(true);
          try {
            log.debug('Fetching Zarr array from ', imageUrl);
            const arr = await getZarrArray(imageUrl);
            if (cancelRef.cancel) return;
            setMetadata(arr);
          } catch (error) {
            log.error('Error fetching Zarr array:', error);
            if (cancelRef.cancel) return;
            setThumbnailError("Error fetching Zarr array");
          } finally {
            if (cancelRef.cancel) return;
            setLoadingThumbnail(false);
          }

        } catch (error) {
          log.error('[checkZarrMetadata] Error fetching Zarr array metadata:', error);
        }
      }
      else {
        const zattrsFile = fileBrowserState.files.find(file => file.name === '.zattrs');
        if (zattrsFile) {
          try {
            const zattrs = (await fetchFileAsJson(
              fileBrowserState.currentFileSharePath.name,
              zattrsFile.path,
              cookies
            )) as any;
            log.debug('[checkZarrMetadata] Zattrs found in ', imageUrl, zattrsFile.path, zattrs);
            if (zattrs.multiscales) {
              log.debug('[checkZarrMetadata] Setting hasMultiscales to true and imageUrl to ', imageUrl);
                       
              setThumbnailError(null);
              setLoadingThumbnail(true);
              try {
                log.info('Fetching OME-Zarr metadata from ', imageUrl);
                const [metadata, error] = await getOmeZarrMetadata(imageUrl);
                if (cancelRef.cancel) return;
                setMetadata(metadata);
                setThumbnailSrc(metadata.thumbnail);
                if (error) {
                  setThumbnailError(error);
                  log.error('Error fetching OME-Zarr metadata:', imageUrl, error);
                }
              } catch (error) {
                log.error('Exception fetching OME-Zarr metadata:', imageUrl, error);
                if (cancelRef.cancel) return;
                setThumbnailError("Error fetching OME-Zarr metadata");
              } finally {
                if (cancelRef.cancel) return;
                setLoadingThumbnail(false);
              }
            }
          } catch (error) {
            log.error('[checkZarrMetadata] Error fetching OME-Zarr metadata:', error);
          }
        }
      }
    }
  }, [fileBrowserState, cookies]);

  React.useEffect(() => {
    const cancelRef = { cancel: false };
    checkZarrMetadata(cancelRef);
    return () => {
      cancelRef.cancel = true;
    };
  }, [checkZarrMetadata]);


  // React.useEffect(() => {
  //   log.debug('!!!! hasZarrArray changed to ', hasZarrArray);
  // }, [hasZarrArray]);

  // Run tool url generation when data url ormetadata changes
  React.useEffect(() => {
    log.debug('Metadata or dataUrl changed', metadata, dataUrl);
    setOpenWithToolUrls(null);
    if (metadata && dataUrl) {
      const openWithToolUrls = {
        copy: dataUrl
      } as OpenWithToolUrls;
      if (metadata instanceof zarr.Array) {
        log.debug('- metadata is a zarr array:', metadata);
        openWithToolUrls.validator = '';
        openWithToolUrls.vole = '';
        openWithToolUrls.neuroglancer =
          neuroglancerBaseUrl + 
          generateNeuroglancerStateForZarrArray(dataUrl, 2);
      }
      else {
        log.debug('- metadata is not a Zarr array');
        openWithToolUrls.validator = validatorBaseUrl + dataUrl;
        openWithToolUrls.vole = voleBaseUrl + dataUrl;
        try {
          openWithToolUrls.neuroglancer =
            neuroglancerBaseUrl +
            generateNeuroglancerStateForOmeZarr(
              dataUrl,
              metadata.zarr_version,
              metadata.multiscale,
              metadata.arr,
              metadata.omero
            );
        }
        catch (error) {
          log.error('Error generating Neuroglancer state for OME-Zarr:', error);
          log.error('Falling back to Zarr array state');
          openWithToolUrls.neuroglancer =
            neuroglancerBaseUrl + 
            generateNeuroglancerStateForZarrArray(dataUrl, 2);
        }
      }
      setOpenWithToolUrls(openWithToolUrls);
    }
  }, [metadata, dataUrl]);

  return {
    thumbnailSrc,
    openWithToolUrls,
    metadata,
    loadingThumbnail,
    thumbnailError
  };
}
