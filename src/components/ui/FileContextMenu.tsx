import * as React from 'react';
import ReactDOM from 'react-dom';
import { Typography } from '@material-tailwind/react';

type ContextMenuProps = {
  x: number;
  y: number;
  menuRef: React.RefObject<HTMLDivElement>;
  setShowFileDrawer: (show: boolean) => void;
  setShowFileContextMenu: (show: boolean) => void;
};

export default function FileContextMenu({
  x,
  y,
  menuRef,
  setShowFileDrawer,
  setShowFileContextMenu
}: ContextMenuProps): JSX.Element {
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-background shadow-lg shadow-surface rounded-md p-2"
      style={{
        left: `${x}px`,
        top: `${y}px`
      }}
    >
      <div className="flex flex-col gap-2">
        <Typography
          className="text-sm p-1 cursor-pointer text-secondary-light hover:bg-secondary-light/30 transition-colors whitespace-nowrap"
          onClick={() => {
            setShowFileDrawer(true);
            setShowFileContextMenu(false);
          }}
        >
          View file properties
        </Typography>
      </div>
    </div>,
    document.body // Render directly to body
  );
}
