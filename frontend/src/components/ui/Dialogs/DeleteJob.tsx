import { Typography } from '@material-tailwind/react';
import { HiOutlineTrash } from 'react-icons/hi';

import FgButton from '@/components/designSystem/atoms/FgButton';
import FgDialog from '@/components/ui/Dialogs/FgDialog';

type DeleteJobDialogProps = {
  readonly open: boolean;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
};

export default function DeleteJobDialog({
  open,
  isPending,
  onClose,
  onConfirm
}: DeleteJobDialogProps) {
  return (
    <FgDialog onClose={onClose} open={open}>
      <Typography className="text-foreground font-bold mb-2" type="h6">
        Delete Job
      </Typography>
      <Typography className="text-foreground mb-4">
        Are you sure you want to delete this job? Its record, parameters, and
        logs will be removed. This cannot be undone.
      </Typography>
      <div className="flex justify-end gap-2">
        <FgButton onClick={onClose} variant="ghost">
          Keep job
        </FgButton>
        <FgButton
          color="error"
          disabled={isPending}
          icon={HiOutlineTrash}
          loading={isPending}
          loadingText="Deleting..."
          onClick={onConfirm}
        >
          Delete Job
        </FgButton>
      </div>
    </FgDialog>
  );
}
