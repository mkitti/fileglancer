import React from 'react';
import toast from 'react-hot-toast';

import {
  useProxiedPathContext,
  type ProxiedPath
} from '@/contexts/ProxiedPathContext';
import type { OpenWithToolUrls, PendingToolUrl } from '@/hooks/useZarrMetadata';
import { constructToolUrl } from '@/utils/toolUrls';

export default function useDataLinkDialog() {
  const [showDataLinkDialog, setShowDataLinkDialog] =
    React.useState<boolean>(false);
  const {
    createProxiedPath,
    fetchProxiedPath,
    deleteProxiedPath,
    refreshProxiedPaths
  } = useProxiedPathContext();

  const handlePendingTool = React.useCallback(
    async (
      pendingToolUrl: PendingToolUrl,
      dataUrl: string | undefined,
      urls: OpenWithToolUrls | null,
      handleCopyUrl: ((url: string) => Promise<void>) | undefined,
      setPendingToolUrl:
        | React.Dispatch<React.SetStateAction<PendingToolUrl>>
        | undefined
    ) => {
      if (pendingToolUrl && pendingToolUrl !== 'copy') {
        let navigationUrl = urls?.[pendingToolUrl];

        // If URL not available but we have dataUrl from creating the new proxied path successfully,
        // construct the nagiation URL using the utility function
        if (!navigationUrl && dataUrl) {
          navigationUrl = constructToolUrl(pendingToolUrl, dataUrl);
        }

        if (navigationUrl && setPendingToolUrl) {
          window.open(navigationUrl, '_blank', 'noopener,noreferrer');
          setPendingToolUrl(null);
        } else {
          toast.error('URL not available');
        }
      } else if (pendingToolUrl === 'copy' && dataUrl && handleCopyUrl) {
        await handleCopyUrl(dataUrl);
      }
    },
    []
  );

  const handleCreateDataLink = React.useCallback(
    async (
      displayPath: string,
      pendingToolUrl: PendingToolUrl,
      urls: OpenWithToolUrls | null,
      handleCopyUrl: ((url: string) => Promise<void>) | undefined,
      setPendingToolUrl:
        | React.Dispatch<React.SetStateAction<PendingToolUrl>>
        | undefined
    ) => {
      // Check if proxied path already exists
      const fetchResult = await fetchProxiedPath();
      if (!fetchResult.success) {
        toast.error(
          `Error checking for existing data link: ${fetchResult.error}`
        );
        return;
      }

      if (fetchResult.data) {
        // Proxied path already exists
        toast.success(`Data link exists for ${displayPath}`);
        const refreshResult = await refreshProxiedPaths();
        if (!refreshResult.success) {
          toast.error(`Error refreshing proxied paths: ${refreshResult.error}`);
          return;
        }
        await handlePendingTool(
          pendingToolUrl,
          fetchResult.data?.url,
          urls,
          handleCopyUrl,
          setPendingToolUrl
        );
      } else {
        // No existing proxied path, create one
        const createProxiedPathResult = await createProxiedPath();
        if (createProxiedPathResult.success) {
          toast.success(`Successfully created data link for ${displayPath}`);
          const refreshResult = await refreshProxiedPaths();
          if (!refreshResult.success) {
            toast.error(
              `Error refreshing proxied paths: ${refreshResult.error}`
            );
            return;
          }
          await handlePendingTool(
            pendingToolUrl,
            createProxiedPathResult.data?.url,
            urls,
            handleCopyUrl,
            setPendingToolUrl
          );
        } else {
          toast.error(
            `Error creating data link: ${createProxiedPathResult.error}`
          );
        }
      }
    },
    [
      createProxiedPath,
      fetchProxiedPath,
      refreshProxiedPaths,
      handlePendingTool
    ]
  );

  const handleDeleteDataLink = React.useCallback(
    async (proxiedPath: ProxiedPath | null, displayPath: string) => {
      if (!proxiedPath) {
        toast.error('Proxied path not found');
        return;
      }

      const deleteResult = await deleteProxiedPath(proxiedPath);
      if (!deleteResult.success) {
        toast.error(`Error deleting data link: ${deleteResult.error}`);
        return;
      } else {
        toast.success(`Successfully deleted data link for ${displayPath}`);

        const refreshResult = await refreshProxiedPaths();
        if (!refreshResult.success) {
          toast.error(`Error refreshing proxied paths: ${refreshResult.error}`);
          return;
        }
      }
    },
    [deleteProxiedPath, refreshProxiedPaths]
  );

  return {
    showDataLinkDialog,
    setShowDataLinkDialog,
    handlePendingTool,
    handleCreateDataLink,
    handleDeleteDataLink
  };
}
