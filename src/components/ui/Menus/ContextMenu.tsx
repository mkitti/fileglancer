import React from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';

import FgMenuItems, { MenuItem } from './FgMenuItems';
import type { Result } from '@/shared.types';
import { makeMapKey } from '@/utils';
import { usePreferencesContext } from '@/contexts/PreferencesContext';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';

type ContextMenuProps = {
  x: number;
  y: number;
  menuRef: React.RefObject<HTMLDivElement | null>;
  togglePropertiesDrawer: () => void;
  setShowContextMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPermissionsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConvertFileDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

type ContextMenuActionProps = {
  handleContextMenuFavorite: () => Promise<Result<boolean>>;
  togglePropertiesDrawer: () => void;
  setShowContextMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPermissionsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConvertFileDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ContextMenu({
  x,
  y,
  menuRef,
  togglePropertiesDrawer,
  setShowContextMenu,
  setShowRenameDialog,
  setShowDeleteDialog,
  setShowPermissionsDialog,
  setShowConvertFileDialog
}: ContextMenuProps): React.ReactNode {
  const { fileBrowserState } = useFileBrowserContext();
  const { folderPreferenceMap, handleContextMenuFavorite } =
    usePreferencesContext();

  const isFavorite: boolean = Boolean(
    folderPreferenceMap[
      makeMapKey(
        'folder',
        `${fileBrowserState.currentFileSharePath?.name}_${fileBrowserState.selectedFiles[0].path}`
      )
    ]
  );

  const menuItems: MenuItem<ContextMenuActionProps>[] = [
    {
      name: 'View file properties',
      action: (props: ContextMenuActionProps) => {
        props.togglePropertiesDrawer();
        props.setShowContextMenu(false);
      },
      shouldShow: true
    },
    {
      name: isFavorite ? 'Unset favorite' : 'Set favorite',
      action: async (props: ContextMenuActionProps) => {
        const result = await props.handleContextMenuFavorite();
        if (!result.success) {
          toast.error(`Error toggling favorite: ${result.error}`);
        } else {
          toast.success(`Favorite ${isFavorite ? 'removed!' : 'added!'}`);
        }
        setShowContextMenu(false);
      },
      shouldShow: fileBrowserState.selectedFiles[0].is_dir
    },
    {
      name: 'Convert to ZARR',
      action: (props: ContextMenuActionProps) => {
        setShowConvertFileDialog(true);
        props.setShowContextMenu(false);
      }
    },
    {
      name: 'Rename',
      action: (props: ContextMenuActionProps) => {
        props.setShowRenameDialog(true);
        props.setShowContextMenu(false);
      },
      shouldShow: true
    },
    {
      name: 'Change permissions',
      action: (props: ContextMenuActionProps) => {
        props.setShowPermissionsDialog(true);
        props.setShowContextMenu(false);
      },
      shouldShow: !fileBrowserState.selectedFiles[0].is_dir
    },
    {
      name: 'Delete',
      action: (props: ContextMenuActionProps) => {
        props.setShowDeleteDialog(true);
        props.setShowContextMenu(false);
      },
      color: 'text-red-600',
      shouldShow: true
    }
  ];

  const actionProps = {
    fileBrowserState,
    handleContextMenuFavorite,
    togglePropertiesDrawer,
    setShowContextMenu,
    setShowRenameDialog,
    setShowDeleteDialog,
    setShowPermissionsDialog,
    setShowConvertFileDialog
  };

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-40 rounded-lg space-y-0.5 border border-surface bg-background p-1"
      style={{
        left: `${x}px`,
        top: `${y}px`
      }}
    >
      <FgMenuItems<ContextMenuActionProps>
        menuItems={menuItems}
        actionProps={actionProps}
      />
    </div>,

    document.body // Render context menu directly to body
  );
}
