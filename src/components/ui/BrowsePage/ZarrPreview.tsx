import React from 'react';
import {
  Button,
  ButtonGroup,
  Switch,
  Typography
} from '@material-tailwind/react';
import { Link } from 'react-router-dom';

import zarr from '@/assets/zarr.jpg';
import neuroglancer_logo from '@/assets/neuroglancer.png';
import validator_logo from '@/assets/ome-ngff-validator.png';
import volE_logo from '@/assets/aics_website-3d-cell-viewer.png';
import copy_logo from '@/assets/copy-link-64.png';

import ZarrMetadataTable from '@/components/ui/BrowsePage/ZarrMetadataTable';
import DataLinkDialog from '@/components/ui/Dialogs/DataLink';
import Loader from '@/components/ui/widgets/Loader';
import FgTooltip from '@/components/ui/widgets/FgTooltip';
import type { OpenWithToolUrls, ZarrMetadata } from '@/hooks/useZarrMetadata';
import useDataLinkDialog from '@/hooks/useDataLinkDialog';
import { useProxiedPathContext } from '@/contexts/ProxiedPathContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { Metadata } from '@/omezarr-helper';
import { copyToClipboard } from '@/utils/copyText';

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
  const [showCopiedTooltip, setShowCopiedTooltip] = React.useState(false);

  const { showDataLinkDialog, setShowDataLinkDialog } = useDataLinkDialog();
  const { proxiedPath } = useProxiedPathContext();
  const { currentFolder } = useFileBrowserContext();

  React.useEffect(() => {
    setIsImageShared(proxiedPath !== null);
  }, [proxiedPath]);

  const handleCopyUrl = async () => {
    if (openWithToolUrls?.copy) {
      await copyToClipboard(openWithToolUrls.copy);
      setShowCopiedTooltip(true);
      setTimeout(() => {
        setShowCopiedTooltip(false);
      }, 1000);
    }
  };

  const tooltipTriggerClasses =
    'rounded-sm m-0 p-0 transform active:scale-90 transition-transform duration-75';

  return (
    <div className="my-4 p-4 shadow-sm rounded-md bg-primary-light/30">
      <div className="flex gap-12 w-full h-fit max-h-100">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 max-h-full">
            {loadingThumbnail ? (
              <>
                <Typography className="text-surface-foreground">
                  Loading OME-Zarr image thumbnail...
                </Typography>
                <Loader />
              </>
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
                  src={zarr}
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
              filePathWithoutFsp={currentFolder?.path || ''}
              showDataLinkDialog={showDataLinkDialog}
              setShowDataLinkDialog={setShowDataLinkDialog}
              proxiedPath={proxiedPath}
            />
          ) : null}

          {openWithToolUrls && isImageShared ? (
            <div>
              <Typography className="font-semibold text-sm text-surface-foreground">
                Open with:
              </Typography>
              <ButtonGroup className="relative">
                {openWithToolUrls.validator ? (
                  <FgTooltip
                    as={Button}
                    variant="ghost"
                    triggerClasses={tooltipTriggerClasses}
                    label="View in OME-Zarr Validator"
                  >
                    <Link
                      to={openWithToolUrls.validator}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={validator_logo}
                        alt="OME-Zarr Validator logo"
                        className="max-h-8 max-w-8 m-1 rounded-sm"
                      />
                    </Link>{' '}
                  </FgTooltip>
                ) : null}

                {openWithToolUrls.neuroglancer ? (
                  <FgTooltip
                    as={Button}
                    variant="ghost"
                    triggerClasses={tooltipTriggerClasses}
                    label="View in Neuroglancer"
                  >
                    <Link
                      to={openWithToolUrls.neuroglancer}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={neuroglancer_logo}
                        alt="Neuroglancer logo"
                        className="max-h-8 max-w-8 m-1 rounded-sm"
                      />
                    </Link>
                  </FgTooltip>
                ) : null}

                {openWithToolUrls.vole ? (
                  <FgTooltip
                    as={Button}
                    variant="ghost"
                    triggerClasses={tooltipTriggerClasses}
                    label="View in Vol-E"
                  >
                    <Link
                      to={openWithToolUrls.vole}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={volE_logo}
                        alt="Vol-E logo"
                        className="max-h-8 max-w-8 m-1 rounded-sm"
                      />
                    </Link>
                  </FgTooltip>
                ) : null}

                {openWithToolUrls.copy ? (
                  <FgTooltip
                    as={Button}
                    variant="ghost"
                    triggerClasses={tooltipTriggerClasses}
                    label={
                      showCopiedTooltip
                        ? 'Copied!'
                        : 'Copy data URL to clipboard'
                    }
                    onClick={handleCopyUrl}
                  >
                    <img
                      src={copy_logo}
                      alt="Copy URL icon"
                      className="max-h-8 max-w-8 m-1 rounded-sm"
                    />
                  </FgTooltip>
                ) : null}
              </ButtonGroup>
            </div>
          ) : null}
        </div>
        {metadata && 'arr' in metadata && (
          <ZarrMetadataTable metadata={metadata as Metadata} />
        )}
      </div>
    </div>
  );
}
