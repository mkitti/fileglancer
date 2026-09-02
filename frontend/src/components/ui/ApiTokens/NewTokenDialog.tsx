import { useState } from 'react';
import { Typography } from '@material-tailwind/react';
import {
  HiOutlineClipboardCopy,
  HiOutlineExclamation,
  HiOutlineCheck
} from 'react-icons/hi';
import toast from 'react-hot-toast';

import FgButton from '@/components/designSystem/atoms/FgButton';
import FgIcon from '@/components/designSystem/atoms/FgIcon';
import FgDialog from '@/components/ui/Dialogs/FgDialog';
import type { CreateTokenResult } from '@/queries/apiTokenQueries';

type NewTokenDialogProps = {
  readonly result: CreateTokenResult | null;
  readonly onClose: () => void;
};

export default function NewTokenDialog({
  result,
  onClose
}: NewTokenDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return null;
  }

  const snippet = `export FILEGLANCER_URL=${window.location.origin}\nexport FILEGLANCER_TOKEN=${result.secret}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success('Token copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <FgDialog className="max-w-lg" onClose={handleClose} open={true}>
      <div className="flex items-center gap-2 mb-4">
        <FgIcon
          className="h-6 w-6"
          color="warning"
          icon={HiOutlineExclamation}
        />
        <Typography className="text-foreground font-semibold text-lg">
          Token created
        </Typography>
      </div>

      <div className="p-3 bg-warning/10 border border-warning/20 rounded-md mb-4">
        <Typography className="text-warning font-semibold text-md">
          Copy this now. It will not be shown again.
        </Typography>
        <Typography className="text-warning mt-1">
          The token secret is not stored anywhere. Save the two lines below
          somewhere safe, such as your shell profile or a <code>.env</code>{' '}
          file.
        </Typography>
      </div>

      <pre className="mb-4 overflow-x-auto rounded bg-surface-light p-3 text-xs text-foreground">
        {snippet}
      </pre>

      <div className="flex justify-start gap-2">
        <FgButton
          color={copied ? 'success' : 'primary'}
          icon={copied ? HiOutlineCheck : HiOutlineClipboardCopy}
          onClick={handleCopy}
          size="sm"
        >
          Copy
        </FgButton>
        <FgButton onClick={handleClose} size="sm" variant="outline">
          Done
        </FgButton>
      </div>
    </FgDialog>
  );
}
