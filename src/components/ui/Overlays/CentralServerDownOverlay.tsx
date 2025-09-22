import { Dialog, Button, Typography } from '@material-tailwind/react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import { HiRefresh } from 'react-icons/hi';

type CentralServerDownOverlayProps = {
  open: boolean;
  onRetry: () => void;
  retryCountdown: number | null;
};

export function CentralServerDownOverlay({
  open,
  onRetry,
  retryCountdown
}: CentralServerDownOverlayProps): JSX.Element {
  return (
    <Dialog open={open}>
      <Dialog.Overlay className="bg-black/50">
        <Dialog.Content className="p-8 bg-surface-light max-w-md mx-auto">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-warning/10 rounded-full">
              <HiOutlineExclamationTriangle className="w-8 h-8 text-warning" />
            </div>

            <div className="space-y-2">
              <Typography type="h5" className="text-foreground font-bold">
                Central Server Unavailable
              </Typography>
              <Typography type="p" className="text-muted-foreground">
                The Fileglancer Central server is currently down or unreachable.
              </Typography>
            </div>

            {retryCountdown !== null && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 w-full">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                  <Typography type="small" className="text-primary font-medium">
                    Automatically retrying in {retryCountdown} second
                    {retryCountdown !== 1 ? 's' : ''}
                  </Typography>
                </div>
              </div>
            )}

            <div className="space-y-4 w-full">
              <div className="text-left space-y-2">
                <Typography
                  type="small"
                  className="text-muted-foreground font-medium"
                >
                  What you can do:
                </Typography>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Try again in a few moments</li>
                  <li>
                    Contact{' '}
                    <a
                      className="text-primary-light hover:underline focus:underline"
                      href="mailto:support@hhmi.org"
                    >
                      support
                    </a>{' '}
                    if the issue persists
                  </li>
                </ul>
              </div>

              <Button
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2"
                color="primary"
              >
                <HiRefresh className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
}
