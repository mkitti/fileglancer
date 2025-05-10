import * as React from 'react';
import { Alert, Typography, IconButton } from '@material-tailwind/react';
import { Square2StackIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { File } from '../../../shared.types';
import OverviewTable from './OverviewTable';

interface OverviewProps {
  fullPath: string;
  file: File;
  copiedText: { value: string; isCopied: boolean };
  showCopyAlert: boolean;
  copyToClipboard: (text: string) => void;
  dismissCopyAlert: () => void;
}

export default function Overview({
  fullPath,
  file,
  copiedText,
  showCopyAlert,
  copyToClipboard,
  dismissCopyAlert
}: OverviewProps) {
  return (
    <>
      <div className="group flex justify-between items-center">
        <Typography className="text-foreground font-medium text-sm">
          <span className="!font-bold">Path: </span>
          {fullPath}
        </Typography>
        <IconButton
          variant="ghost"
          isCircular
          className="text-transparent group-hover:text-foreground"
          onClick={() => copyToClipboard(fullPath)}
        >
          <Square2StackIcon className="h-4 w-4" />
        </IconButton>
      </div>
      {copiedText.value === fullPath && copiedText.isCopied === true && showCopyAlert === true ? (
        <Alert className="flex items-center justify-between bg-secondary-light/70 border-none">
          <Alert.Content>Path copied to clipboard!</Alert.Content>
          <XMarkIcon
            className="h-5 w-5 cursor-pointer"
            onClick={dismissCopyAlert}
          />
        </Alert>
      ) : null}
      <OverviewTable file={file} />
    </>
  );
} 