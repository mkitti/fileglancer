import {
  Alert,
  Button,
  ButtonGroup,
  Typography
} from '@material-tailwind/react';
import { Link } from 'react-router-dom';
import { Square2StackIcon, XMarkIcon } from '@heroicons/react/24/outline';

import neuroglancer_logo from '../../../assets/neuroglancer.png';
import volE_logo from '../../../assets/aics_website-3d-cell-viewer.png';
import napari_logo from '../../../assets/napari.png';

import useCopyPath from '../../../hooks/useCopyPath';
import type { Metadata } from '../../../omezarr-helper';
import ZarrMetadataTable from './ZarrMetadataTable';

type ZarrPreviewProps = {
  thumbnailSrc: string | null;
  loadingThumbnail: boolean;
  neuroglancerUrl: string | null;
  metadata: Metadata | null;
};

export default function ZarrPreview({
  thumbnailSrc,
  loadingThumbnail,
  neuroglancerUrl,
  metadata
}: ZarrPreviewProps): React.ReactNode {
  const { copyToClipboard, showCopyAlert, dismissCopyAlert } = useCopyPath();
  return (
    <div className="flex gap-12 my-4 p-4 bg-primary-light/30 shadow-sm rounded-md w-full h-fit max-h-96">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 max-h-full">
          <Typography variant="small" className="text-surface-foreground">
            {loadingThumbnail ? 'Loading OME-Zarr image thumbnail...' : ''}
          </Typography>
          {loadingThumbnail ? (
            <div
              className="w-10 h-10 border-4 border-surface-foreground border-t-transparent rounded-full animate-spin"
              title="Loading Thumbnail..."
            ></div>
          ) : null}
          {!loadingThumbnail && thumbnailSrc ? (
            <img
              id="thumbnail"
              src={thumbnailSrc}
              alt="Thumbnail"
              className="max-h-72 max-w-max rounded-md"
            />
          ) : null}
        </div>

        {neuroglancerUrl ? (
          <div>
            <Typography className="font-semibold text-sm text-surface-foreground">
              Open with:
            </Typography>
            <ButtonGroup className="relative">
              <Button
                as={Link}
                to={neuroglancerUrl}
                title="View in Neuroglancer"
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost"
                className="rounded-sm m-0 p-0"
              >
                <img
                  src={neuroglancer_logo}
                  alt="Neuroglancer logo"
                  className="max-h-8 max-w-8 m-1 rounded-sm"
                />
              </Button>
              <Button
                as={Link}
                to="#"
                title="View in Vol-E"
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost"
                className="rounded-sm m-0 p-0"
              >
                <img
                  src={volE_logo}
                  alt="Vol-E logo"
                  className="max-h-8 max-w-8 m-1 rounded-sm"
                />
              </Button>
              <Button
                title="Copy link to view in Napari"
                variant="ghost"
                className="group peer/napari rounded-sm m-0 p-0 relative"
                onClick={() => {
                  copyToClipboard('Napari URL');
                }}
              >
                <img
                  src={napari_logo}
                  alt="Napari logo"
                  className="max-h-8 max-w-8 m-1 rounded-sm"
                />
                <Square2StackIcon className="w-4 h-4 text-transparent group-hover:text-foreground absolute top-0 right-0 bg-transparent group-hover:bg-background" />
              </Button>
              <Typography
                className={`text-transparent
              ${showCopyAlert !== true && 'peer-hover/napari:text-foreground peer-hover/napari:bg-background'}
              absolute
              top-12
              left-0
              bg-transparent
              w-fit
              px-1
              rounded-sm`}
              >
                See <a href="https://napari.org">napari.org</a> for
                instructions. Then <code>napari URL</code>
              </Typography>
            </ButtonGroup>
            {showCopyAlert === true ? (
              <Alert className="flex items-center max-w-max p-1 bg-secondary-light/70 border-none">
                <Alert.Content>URL copied to clipboard!</Alert.Content>
                <XMarkIcon
                  className="h-5 w-5 cursor-pointer"
                  onClick={dismissCopyAlert}
                />
              </Alert>
            ) : null}
          </div>
        ) : null}
      </div>
      {metadata && <ZarrMetadataTable metadata={metadata} />}
    </div>
  );
}
