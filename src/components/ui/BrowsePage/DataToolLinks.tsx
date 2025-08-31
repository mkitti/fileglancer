import React from 'react';
import { Button, ButtonGroup, Typography } from '@material-tailwind/react';
import { Link } from 'react-router';

import neuroglancer_logo from '@/assets/neuroglancer.png';
import validator_logo from '@/assets/ome-ngff-validator.png';
import volE_logo from '@/assets/aics_website-3d-cell-viewer.png';
import avivator_logo from '@/assets/vizarr_logo.png';
import copy_logo from '@/assets/copy-link-64.png';
import type { OpenWithToolUrls } from '@/hooks/useZarrMetadata';
import { copyToClipboard } from '@/utils/copyText';
import FgTooltip from '../widgets/FgTooltip';

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
      }, 2000);
    }
  };

  const tooltipTriggerClasses =
    'rounded-sm m-0 p-0 transform active:scale-90 transition-transform duration-75';

  return (
    <div className="my-1">
      <Typography className="font-semibold text-sm text-surface-foreground">
        {title}
      </Typography>
      <ButtonGroup className="relative">
        {urls.validator ? (
          <FgTooltip
            as={Button}
            variant="ghost"
            triggerClasses={tooltipTriggerClasses}
            label="View in OME-Zarr Validator"
          >
            <Link to={urls.validator} target="_blank" rel="noopener noreferrer">
              <img
                src={validator_logo}
                alt="OME-Zarr Validator logo"
                className="max-h-8 max-w-8 m-1 rounded-sm"
              />
            </Link>
          </FgTooltip>
        ) : null}

        {urls.neuroglancer ? (
          <FgTooltip
            as={Button}
            variant="ghost"
            triggerClasses={tooltipTriggerClasses}
            label="View in Neuroglancer"
          >
            {' '}
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
          </FgTooltip>
        ) : null}

        {urls.vole ? (
          <FgTooltip
            as={Button}
            variant="ghost"
            triggerClasses={tooltipTriggerClasses}
            label="View in Vol-E"
          >
            {' '}
            <Link to={urls.vole} target="_blank" rel="noopener noreferrer">
              <img
                src={volE_logo}
                alt="Vol-E logo"
                className="max-h-8 max-w-8 m-1 rounded-sm"
              />
            </Link>
          </FgTooltip>
        ) : null}


        {urls.avivator ? (
          <FgTooltip
            as={Button}
            variant="ghost"
            triggerClasses={tooltipTriggerClasses}
            label="View in Avivator"
          >
            {' '}
            <Link to={urls.avivator} target="_blank" rel="noopener noreferrer">
              <img
                src={avivator_logo}
                alt="Avivator logo"
                className="max-h-8 max-w-8 m-1 rounded-sm"
              />
            </Link>
          </FgTooltip>
        ) : null}

        {urls.copy ? (
          <FgTooltip
            as={Button}
            variant="ghost"
            triggerClasses={tooltipTriggerClasses}
            label={showCopiedTooltip ? 'Copied!' : 'Copy data URL'}
            onClick={handleCopyUrl}
            openCondition={showCopiedTooltip ? true : undefined}
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
  );
}
