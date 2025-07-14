import { ReactNode } from 'react';
import { Dialog, IconButton } from '@material-tailwind/react';
import { HiX } from 'react-icons/hi';

type FgDialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export default function FgDialog({
  open,
  onClose,
  children,
  className = ''
}: FgDialogProps): JSX.Element {
  return (
    <Dialog open={open}>
      <Dialog.Overlay>
        <Dialog.Content
          className={`p-6 bg-surface-light dark:bg-surface ${className}`}
        >
          <IconButton
            size="sm"
            variant="outline"
            color="secondary"
            className="absolute right-4 top-4 text-secondary hover:text-background rounded-full"
            onClick={onClose}
          >
            <HiX className="icon-default" />
          </IconButton>
          {children}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
}
