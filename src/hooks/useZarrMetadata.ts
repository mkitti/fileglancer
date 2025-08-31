import React from 'react';
import { default as log } from '@/logger';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import {
  getOmeZarrMetadata,
  getOmeZarrThumbnail,
  getZarrArray,
  generateNeuroglancerStateForDataURL,
  generateNeuroglancerStateForZarrArray,
  generateNeuroglancerStateForOmeZarr
} from '@/omezarr-helper';
import type { Metadata } from '@/omezarr-helper';
import { fetchFileAsJson, getFileURL } from '@/utils';
import { useCookies } from 'react-cookie';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import { useExternalBucketContext } from '@/contexts/ExternalBucketContext';
import * as zarr from 'zarrita';

export type OpenWithToolUrls = {
  copy: string;
  validator: string;
  neuroglancer: string;
  vole: string;
};

export type ZarrArray = zarr.Array<any>;
export type ZarrMetadata = Metadata | null;

export default function useZarrMetadata() {
  const [thumbnailSrc, setThumbnailSrc] = React.useState<string | null>(null);
  const [openWithToolUrls, setOpenWithToolUrls] =
    React.useState<OpenWithToolUrls | null>(null);
  const [metadata, setMetadata] = React.useState<ZarrMetadata>(null);
  const [omeZarrUrl, setOmeZarrUrl] = React.useState<string | null>(null);
  const [loadingThumbnail, setLoadingThumbnail] = React.useState(false);
  const [thumbnailError, setThumbnailError] = React.useState<string | null>(
    null
  );

  const validatorBaseUrl = 'https://ome.github.io/ome-ngff-validator/?source=';
  const neuroglancerBaseUrl = 'https://neuroglancer-demo.appspot.com/#!';
  const voleBaseUrl = 'https://volumeviewer.allencell.org/viewer?url=';
  const { fileBrowserState, areFileDataLoading } = useFileBrowserContext();
  const { dataUrl } = useProxiedPathContext();
  const { externalDataUrl } = useExternalBucketContext();
  const { disableNeuroglancerStateGeneration } = usePreferencesContext();
  const [cookies] = useCookies(['_xsrf']);

  const checkZarrMetadata = React.useCallback(
    async (cancelRef: { cancel: boolean }) => {
      if (areFileDataLoading) {
        return;
      }
      setMetadata(null);
      setOmeZarrUrl(null);
      setThumbnailSrc(null);
      setThumbnailError(null);
      setLoadingThumbnail(false);
      setOpenWithToolUrls(null);

      if (
        fileBrowserState.currentFileSharePath &&
        fileBrowserState.currentFolder
      ) {
        const imageUrl = getFileURL(
          fileBrowserState.currentFileSharePath.name,
          fileBrowserState.currentFolder.path
        );
        const zarrayFile = fileBrowserState.files.find(
          file => file.name === '.zarray'
        );
        if (zarrayFile) {
          try {
            try {
              const arr = await getZarrArray(imageUrl);
              if (cancelRef.cancel) {
                return;
              }
              const shapes = [arr.shape];
              setMetadata({
                arr,
                shapes,
                multiscale: undefined,
                omero: undefined,
                scales: undefined,
                zarr_version: 2
              });
            } catch (error) {
              log.error('Error fetching Zarr array:', error);
              if (cancelRef.cancel) {
                return;
              }
              setThumbnailError('Error fetching Zarr array');
            }
          } catch (error) {
            log.error('Error fetching Zarr array metadata:', error);
          }
        } else {
          const zattrsFile = fileBrowserState.files.find(
            file => file.name === '.zattrs'
          );
          if (zattrsFile) {
            try {
              const zattrs = (await fetchFileAsJson(
                fileBrowserState.currentFileSharePath.name,
                zattrsFile.path,
                cookies
              )) as any;
              if (zattrs.multiscales) {
                setThumbnailError(null);
                try {
                  setOmeZarrUrl(imageUrl);
                  const metadata = await getOmeZarrMetadata(imageUrl);
                  if (cancelRef.cancel) {
                    return;
                  }
                  setMetadata(metadata);
                  setLoadingThumbnail(true);
                } catch (error) {
                  log.error(
                    'Exception fetching OME-Zarr metadata:',
                    imageUrl,
                    error
                  );
                  if (cancelRef.cancel) {
                    return;
                  }
                  setThumbnailError('Error fetching OME-Zarr metadata');
                }
              }
            } catch (error) {
              log.error('Error fetching OME-Zarr metadata:', error);
            }
          }
        }
      }
    },
    [
      areFileDataLoading,
      fileBrowserState.currentFileSharePath,
      fileBrowserState.currentFolder,
      fileBrowserState.files,
      cookies
    ]
  );

  // When the file browser state changes, check for Zarr metadata
  React.useEffect(() => {
    const cancelRef = { cancel: false };
    checkZarrMetadata(cancelRef);
    return () => {
      cancelRef.cancel = true;
    };
  }, [checkZarrMetadata]);

  // When an OME-Zarr URL is set, load the thumbnail
  React.useEffect(() => {
    if (!omeZarrUrl) {
      return;
    }

    const controller = new AbortController();

    const loadThumbnail = async (signal: AbortSignal) => {
      try {
        const [thumbnail, error] = await getOmeZarrThumbnail(omeZarrUrl);
        if (signal.aborted) {
          return;
        }

        setLoadingThumbnail(false);
        if (error) {
          console.error('Thumbnail load failed:', error);
          setThumbnailError(error);
        } else {
          setThumbnailSrc(thumbnail);
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error('Unexpected error loading thumbnail:', err);
          setThumbnailError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    loadThumbnail(controller.signal);

    return () => {
      controller.abort();
    };
  }, [omeZarrUrl]);

  // Run tool url generation when the proxied path url or metadata changes
  React.useEffect(() => {
    setOpenWithToolUrls(null);
    console.log('Updating OpenWithToolUrls with metadata ', metadata, ' and dataUrl ', dataUrl, ' and externalDataUrl ', externalDataUrl);
    const url = externalDataUrl || dataUrl;
    if (metadata && url) {
      const openWithToolUrls = {
        copy: url
      } as OpenWithToolUrls;
      if (metadata && metadata?.multiscale) {
        openWithToolUrls.validator = validatorBaseUrl + url;
        openWithToolUrls.vole = voleBaseUrl + url;
        if (disableNeuroglancerStateGeneration) {
          openWithToolUrls.neuroglancer =
            neuroglancerBaseUrl + generateNeuroglancerStateForDataURL(url);
        } else {
          try {
            openWithToolUrls.neuroglancer =
              neuroglancerBaseUrl +
              generateNeuroglancerStateForOmeZarr(
                url,
                metadata.zarr_version,
                metadata.multiscale,
                metadata.arr,
                metadata.omero
              );
          } catch (error) {
            log.error(
              'Error generating Neuroglancer state for OME-Zarr:',
              error
            );
            openWithToolUrls.neuroglancer =
              neuroglancerBaseUrl +
              generateNeuroglancerStateForDataURL(url);
          }
        }
      } else {
        openWithToolUrls.validator = '';
        openWithToolUrls.vole = '';
        if (disableNeuroglancerStateGeneration) {
          openWithToolUrls.neuroglancer =
            neuroglancerBaseUrl + generateNeuroglancerStateForDataURL(url);
        } else {
          openWithToolUrls.neuroglancer =
            neuroglancerBaseUrl +
            generateNeuroglancerStateForZarrArray(url, 2);
        }
      }
      setOpenWithToolUrls(openWithToolUrls);
    }
  }, [metadata, dataUrl, externalDataUrl, disableNeuroglancerStateGeneration]);

  return {
    thumbnailSrc,
    openWithToolUrls,
    metadata,
    loadingThumbnail,
    thumbnailError
  };
}
