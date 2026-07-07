import { useState } from 'react';

export type ViewMode = 'cards' | 'table';

/**
 * Card/table view mode persisted to localStorage under the given key, shared
 * by the My Apps and App Catalog pages.
 */
export function useViewMode(
  storageKey: string
): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    localStorage.getItem(storageKey) === 'table' ? 'table' : 'cards'
  );

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(storageKey, mode);
  };

  return [viewMode, changeViewMode];
}
