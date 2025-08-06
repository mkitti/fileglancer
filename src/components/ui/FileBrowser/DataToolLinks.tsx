import React from 'react';
import {
  Button,
  ButtonGroup,
  Tooltip,
  Typography
} from '@material-tailwind/react';
import { Link } from 'react-router';

import neuroglancer_logo from '@/assets/neuroglancer.png';
import validator_logo from '@/assets/ome-ngff-validator.png';
import volE_logo from '@/assets/aics_website-3d-cell-viewer.png';
import copy_logo from '@/assets/copy-link-64.png';
import type { OpenWithToolUrls } from '@/hooks/useZarrMetadata';
import { copyToClipboard } from '@/utils/copyText';

export default function DataToolLinks({
  title,
  urls
}: {
  title: string;
  urls: OpenWithToolUrls;
}): React.ReactNode {
  const [showCopiedTooltip, setShowCopiedTooltip] = React.useState(false);

  const handleCopyUrl = async () => {
    if (urls?.copy) {
      await copyToClipboard(urls.copy);
      setShowCopiedTooltip(true);
      setTimeout(() => {
        setShowCopiedTooltip(false);
      }, 1000);
    }
  };
  return (
    <div className="my-1">
      <Typography className="font-semibold text-sm text-surface-foreground">
        {title}
      </Typography>
      <ButtonGroup className="relative">
        {urls.validator ? (
          <Tooltip placement="top">
            <Tooltip.Trigger
              as={Button}
              variant="ghost"
              className="rounded-sm m-0 p-0 transform active:scale-90 transition-transform duration-75"
            >
              <Link
                to={urls.validator}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={validator_logo}
                  alt="OME-Zarr Validator logo"
                  className="max-h-8 max-w-8 m-1 rounded-sm"
                />
              </Link>
              <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
                <Typography type="small" className="opacity-90">
                  View in OME-Zarr Validator
                </Typography>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Trigger>
          </Tooltip>
        ) : null}

        {urls.neuroglancer ? (
          <Tooltip placement="top">
            <Tooltip.Trigger
              as={Button}
              variant="ghost"
              className="rounded-sm m-0 p-0 transform active:scale-90 transition-transform duration-75"
            >
              <Link
                to={urls.neuroglancer}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={neuroglancer_logo}
                  alt="Neuroglancer logo"
                  className="max-h-8 max-w-8 m-1 rounded-sm"
                />
              </Link>
              <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
                <Typography type="small" className="opacity-90">
                  View in Neuroglancer
                </Typography>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Trigger>
          </Tooltip>
        ) : null}

        {urls.vole ? (
          <Tooltip placement="top">
            <Tooltip.Trigger
              as={Button}
              variant="ghost"
              className="rounded-sm m-0 p-0 transform active:scale-90 transition-transform duration-75"
            >
              <Link to={urls.vole} target="_blank" rel="noopener noreferrer">
                <img
                  src={volE_logo}
                  alt="Vol-E logo"
                  className="max-h-8 max-w-8 m-1 rounded-sm"
                />
              </Link>
              <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
                <Typography type="small" className="opacity-90">
                  View in Vol-E
                </Typography>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Trigger>
          </Tooltip>
        ) : null}

        {urls.copy ? (
          <Tooltip placement="top" open={showCopiedTooltip ? true : undefined}>
            <Tooltip.Trigger
              as={Button}
              variant="ghost"
              className="rounded-sm m-0 p-0 transform active:scale-90 transition-transform duration-75"
              onClick={handleCopyUrl}
            >
              <img
                src={copy_logo}
                alt="Copy URL icon"
                className="max-h-8 max-w-8 m-1 rounded-sm"
              />
              <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground">
                <Typography type="small" className="opacity-90">
                  {showCopiedTooltip ? 'Copied!' : 'Copy data URL'}
                </Typography>
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Trigger>
          </Tooltip>
        ) : null}
      </ButtonGroup>
    </div>
  );
}
