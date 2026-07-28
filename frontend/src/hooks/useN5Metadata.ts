import { useMemo } from 'react';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import { useExternalBucketContext } from '@/contexts/ExternalBucketContext';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import { useViewersContext } from '@/contexts/ViewersContext';
import { resolveViewerTemplate } from '@/utils/viewerUrl';
import { useN5MetadataQuery } from '@/queries/n5Queries';
import type { N5Metadata, N5OpenWithToolUrls } from '@/queries/n5Queries';

export type { N5Metadata, N5OpenWithToolUrls };

// Fallback used only when no Neuroglancer viewer is configured.
const FALLBACK_NEUROGLANCER_BASE_URL =
  'https://neuroglancer-demo.appspot.com/#!';

/**
 * Get the Neuroglancer source URL for N5 format
 */
function getNeuroglancerSourceN5(dataUrl: string): string {
  // Neuroglancer expects a trailing slash
  if (!dataUrl.endsWith('/')) {
    dataUrl = dataUrl + '/';
  }
  return dataUrl + '|n5:';
}

/**
 * Get the layer name for a given URL (same as Neuroglancer does it)
 */
function getLayerName(dataUrl: string): string {
  return dataUrl.split('/').filter(Boolean).pop() || 'Default';
}

/**
 * Generate a Neuroglancer state for N5 data
 */
function generateNeuroglancerStateForN5(dataUrl: string): string {
  const layer = {
    name: getLayerName(dataUrl),
    source: getNeuroglancerSourceN5(dataUrl),
    type: 'image' // Default to image for N5
  };

  const state = {
    layers: [layer],
    selectedLayer: {
      visible: true,
      layer: layer.name
    },
    layout: '4panel-alt'
  };

  return encodeURIComponent(JSON.stringify(state));
}

export default function useN5Metadata() {
  const { fileQuery } = useFileBrowserContext();
  const { currentDirProxiedPathQuery } = useProxiedPathContext();
  const { externalDataUrlQuery } = useExternalBucketContext();
  const { viewerUrlSources } = usePreferencesContext();
  const { validViewers } = useViewersContext();

  // Fetch N5 metadata
  const n5MetadataQuery = useN5MetadataQuery({
    fspName: fileQuery.data?.currentFileSharePath?.name,
    currentFileOrFolder: fileQuery.data?.currentFileOrFolder,
    files: fileQuery.data?.files
  });

  const metadata = n5MetadataQuery.data || null;

  const openWithToolUrls = useMemo(() => {
    if (!metadata) {
      return null;
    }

    // Resolve the Neuroglancer base URL from the deployment config and the
    // user's per-viewer URL preference, matching the OME-Zarr/Zarr path.
    const neuroglancer = validViewers.find(v => v.key === 'neuroglancer');
    const neuroglancerBaseUrl = neuroglancer
      ? resolveViewerTemplate(
          neuroglancer,
          viewerUrlSources['neuroglancer']
        ).split('#!')[0] + '#!'
      : FALLBACK_NEUROGLANCER_BASE_URL;

    const url =
      externalDataUrlQuery.data || currentDirProxiedPathQuery.data?.url;

    const toolUrls: N5OpenWithToolUrls = {
      copy: url || '',
      neuroglancer: ''
    };

    if (url) {
      // Generate Neuroglancer URL with state
      toolUrls.neuroglancer =
        neuroglancerBaseUrl + generateNeuroglancerStateForN5(url);
    }

    return toolUrls;
  }, [
    metadata,
    currentDirProxiedPathQuery.data?.url,
    externalDataUrlQuery.data,
    validViewers,
    viewerUrlSources
  ]);

  return {
    n5MetadataQuery,
    openWithToolUrls
  };
}
