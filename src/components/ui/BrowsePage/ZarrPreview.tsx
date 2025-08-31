import React from 'react';
import { Switch, Typography } from '@material-tailwind/react';

import zarrLogo from '@/assets/zarr.jpg';
import ZarrMetadataTable from '@/components/ui/BrowsePage/ZarrMetadataTable';
import DataLinkDialog from '@/components/ui/Dialogs/DataLink';
import DataToolLinks from './DataToolLinks';
import type { OpenWithToolUrls, ZarrMetadata } from '@/hooks/useZarrMetadata';
import useDataLinkDialog from '@/hooks/useDataLinkDialog';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import { useExternalBucketContext } from '@/contexts/ExternalBucketContext';
import { Metadata } from '@/omezarr-helper';

type ZarrPreviewProps = {
  thumbnailSrc: string | null;
  loadingThumbnail: boolean;
  openWithToolUrls: OpenWithToolUrls | null;
  metadata: ZarrMetadata;
  thumbnailError: string | null;
};

export default function ZarrPreview({
  thumbnailSrc,
  loadingThumbnail,
  openWithToolUrls,
  metadata,
  thumbnailError
}: ZarrPreviewProps): React.ReactNode {
  const [isImageShared, setIsImageShared] = React.useState(false);
  const { showDataLinkDialog, setShowDataLinkDialog } = useDataLinkDialog();
  const { proxiedPath } = useProxiedPathContext();
  const { externalDataUrl } = useExternalBucketContext();

  React.useEffect(() => {
    setIsImageShared(proxiedPath !== null);
  }, [proxiedPath]);

  return (
    <div className="my-4 p-4 shadow-sm rounded-md bg-primary-light/30">
      <div className="flex gap-12 w-full h-fit max-h-100">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 max-h-full">
            {loadingThumbnail ? (
              <div className="w-72 h-72 animate-pulse bg-surface text-foreground flex">
                <Typography className="place-self-center text-center w-full">
                  Loading thumbnail...
                </Typography>
              </div>
            ) : null}
            {!loadingThumbnail && metadata && thumbnailSrc ? (
              <img
                id="thumbnail"
                src={thumbnailSrc}
                alt="Thumbnail"
                className="max-h-72 max-w-max rounded-md"
              />
            ) : !loadingThumbnail && metadata && !thumbnailSrc ? (
              <div className="p-2">
                <img
                  src={zarrLogo}
                  alt="Zarr logo"
                  className="max-h-44 rounded-md"
                />
                {thumbnailError ? (
                  <Typography className="text-error text-xs pt-3">{`${thumbnailError}`}</Typography>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="share-switch"
              className="mt-2 bg-secondary-light border-secondary-light hover:!bg-secondary-light/80 hover:!border-secondary-light/80"
              onChange={() => {
                setShowDataLinkDialog(true);
              }}
              checked={externalDataUrl ? true : isImageShared}
              disabled={externalDataUrl ? true : false}
            />
            <label
              htmlFor="share-switch"
              className="-translate-y-0.5 flex flex-col gap-1"
            >
              <Typography
                as="label"
                htmlFor="share-switch"
                className={`${externalDataUrl ? 'cursor-default' : 'cursor-pointer'} text-foreground font-semibold`}
              >
                Data Link
              </Typography>
              <Typography
                type="small"
                className="text-foreground whitespace-normal max-w-[300px]"
              >
                {externalDataUrl
                  ? 'Public data link already exists since this data is on s3.janelia.org.'
                  : 'Creating a data link for this image allows you to open it in external viewers like Neuroglancer.'}
              </Typography>
            </label>
          </div>

          {showDataLinkDialog ? (
            <DataLinkDialog
              isImageShared={isImageShared}
              setIsImageShared={setIsImageShared}
              showDataLinkDialog={showDataLinkDialog}
              setShowDataLinkDialog={setShowDataLinkDialog}
              proxiedPath={proxiedPath}
            />
          ) : null}

          {openWithToolUrls && (externalDataUrl || isImageShared) ? (
            <DataToolLinks
              title="Open with:"
              urls={openWithToolUrls as OpenWithToolUrls}
            />
          ) : null}
        </div>
        {metadata && 'arr' in metadata && (
          <ZarrMetadataTable metadata={metadata as Metadata} />
        )}
      </div>
    </div>
  );
}
