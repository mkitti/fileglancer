import { Typography } from '@material-tailwind/react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

import FgIcon from '@/components/designSystem/atoms/FgIcon';

/**
 * Warns that adding/launching an app executes code from its repository on the
 * cluster as the current user. Shown at the add entry points (add-from-URL and
 * add-from-catalog) so users understand the trust implication before installing
 * something another user shared.
 */
export default function AppTrustNotice({
  className = ''
}: {
  readonly className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 ${className}`}
    >
      <FgIcon
        className="text-warning shrink-0 mt-0.5"
        icon={HiOutlineExclamationTriangle}
        size="sm"
      />
      <Typography className="text-foreground text-sm">
        Apps run code from their repository on the compute cluster as you, with
        access to your files. Only add apps from sources you trust.
      </Typography>
    </div>
  );
}
