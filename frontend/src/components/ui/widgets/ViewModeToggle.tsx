import { IconButton } from '@material-tailwind/react';
import { HiOutlineSquares2X2, HiOutlineTableCells } from 'react-icons/hi2';

import FgTooltip from '@/components/ui/widgets/FgTooltip';
import type { ViewMode } from '@/hooks/useViewMode';

interface ViewModeToggleProps {
  readonly viewMode: ViewMode;
  readonly onChange: (mode: ViewMode) => void;
}

/** Card/table view switcher shared by the My Apps and App Catalog pages. */
export default function ViewModeToggle({
  viewMode,
  onChange
}: ViewModeToggleProps) {
  const triggerClasses = (active: boolean) =>
    active
      ? 'text-primary bg-primary/10'
      : 'text-foreground/60 hover:text-foreground';
  return (
    <div className="flex items-center gap-1">
      <FgTooltip
        as={IconButton}
        icon={HiOutlineSquares2X2}
        label="Card view"
        onClick={() => onChange('cards')}
        triggerClasses={triggerClasses(viewMode === 'cards')}
        variant="ghost"
      />
      <FgTooltip
        as={IconButton}
        icon={HiOutlineTableCells}
        label="Table view"
        onClick={() => onChange('table')}
        triggerClasses={triggerClasses(viewMode === 'table')}
        variant="ghost"
      />
    </div>
  );
}
