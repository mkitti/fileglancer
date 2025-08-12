import React from 'react';
import { Switch, Typography } from '@material-tailwind/react';

import zarrLogo from '@/assets/zarr.jpg';
import ZarrMetadataTable from '@/components/ui/BrowsePage/ZarrMetadataTable';
import DataLinkDialog from '@/components/ui/Dialogs/DataLink';
import Loader from '@/components/ui/widgets/Loader';
import DataToolLinks from './DataToolLinks';
import type { OpenWithToolUrls, ZarrMetadata } from '@/hooks/useZarrMetadata';
import useDataLinkDialog from '@/hooks/useDataLinkDialog';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import { useExternalBucketContext } from '@/contexts/ExternalBucketContext';
import {
  Metadata,
  generateNeuroglancerStateForZarrArray,
  generateNeuroglancerStateForOmeZarr
} from '@/omezarr-helper';
import * as zarr from 'zarrita';

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
  const [externalToolUrls, setExternalToolUrls] =
    React.useState<OpenWithToolUrls | null>(null);

  const { showDataLinkDialog, setShowDataLinkDialog } = useDataLinkDialog();
  const { proxiedPath } = useProxiedPathContext();
  const { externalBucket, externalDataUrl } = useExternalBucketContext();

  React.useEffect(() => {
    setIsImageShared(proxiedPath !== null);
  }, [proxiedPath]);

  // Generate external tool URLs when external data URL changes
  React.useEffect(() => {
    setExternalToolUrls(null);
    if (metadata && externalDataUrl) {
      const validatorBaseUrl =
        'https://ome.github.io/ome-ngff-validator/?source=';
      const neuroglancerBaseUrl = 'https://neuroglancer-demo.appspot.com/#!';
      const voleBaseUrl = 'https://volumeviewer.allencell.org/viewer?url=';

      const urls = {
        copy: externalDataUrl
      } as OpenWithToolUrls;

      if (metadata instanceof zarr.Array) {
        urls.validator = '';
        urls.vole = '';
        urls.neuroglancer =
          neuroglancerBaseUrl +
          generateNeuroglancerStateForZarrArray(externalDataUrl, 2);
      } else {
        urls.validator = validatorBaseUrl + externalDataUrl;
        urls.vole = voleBaseUrl + externalDataUrl;
        try {
          urls.neuroglancer =
            neuroglancerBaseUrl +
            generateNeuroglancerStateForOmeZarr(
              externalDataUrl,
              (metadata as Metadata).zarr_version,
              (metadata as Metadata).multiscale,
              (metadata as Metadata).arr,
              (metadata as Metadata).omero
            );
        } catch {
          urls.neuroglancer =
            neuroglancerBaseUrl +
            generateNeuroglancerStateForZarrArray(externalDataUrl, 2);
        }
      }
      setExternalToolUrls(urls);
    }
  }, [metadata, externalDataUrl]);

  return (
    <div className="my-4 p-4 shadow-sm rounded-md bg-primary-light/30">
      <div className="flex gap-12 w-full h-fit max-h-100">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 max-h-full">
            {loadingThumbnail ? <Loader text="Loading thumbnail..." /> : null}
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
              checked={isImageShared}
            />
            <label
              htmlFor="share-switch"
              className="-translate-y-0.5 flex flex-col gap-1"
            >
              <Typography
                as="label"
                htmlFor="share-switch"
                className="cursor-pointer text-foreground font-semibold"
              >
                Data Link
              </Typography>
              <Typography
                type="small"
                className="text-foreground whitespace-normal max-w-[300px]"
              >
                Creating a data link for this image allows you to open it in
                external viewers like Neuroglancer.
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

          {openWithToolUrls && isImageShared ? (
            <DataToolLinks title="Open with:" urls={openWithToolUrls} />
          ) : null}

          {externalToolUrls && externalBucket ? (
            <DataToolLinks
              title="Open with (External):"
              urls={externalToolUrls}
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
