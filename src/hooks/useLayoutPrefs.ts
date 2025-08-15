import React from 'react';

import { usePreferencesContext } from '@/contexts/PreferencesContext';
import logger from '@/logger';

/**
 * Custom hook that provides storage interface for react-resizable-panels
 * with debounced updates to reduce API calls when resizing panels
 * See example implementation here: https://react-resizable-panels.vercel.app/examples/external-persistence
 * Note that the custom storage interface must expose a synchronous getItem and setItem method.
 */

const DEBOUNCE_MS = 500;

// Layout keys for the two possible panel combinations
const LAYOUT_KEYS_WITH_PROPERTIES = 'main, properties, sidebar';
const LAYOUT_KEYS_WITHOUT_PROPERTIES = 'main, sidebar';

export default function useLayoutPrefs() {
  const [showPropertiesDrawer, setShowPropertiesDrawer] =
    React.useState<boolean>(false);
  const { layout, handleUpdateLayout } = usePreferencesContext();

  const timerRef = React.useRef<number | null>(null);

  const debouncedUpdateLayout = React.useCallback(
    (newLayout: string) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        handleUpdateLayout(newLayout).catch(error => {
          logger.debug('Failed to update layout:', error);
        });
        timerRef.current = null;
      }, DEBOUNCE_MS);
    },
    [handleUpdateLayout]
  );

  const togglePropertiesDrawer = () => {
    setShowPropertiesDrawer(prev => !prev);
  };

  // Initialize layouts from saved preferences
  React.useEffect(() => {
    if (!layout || layout === '') {
      return;
    }

    try {
      const parsedLayout = JSON.parse(layout);
      const panelGroupData = parsedLayout['react-resizable-panels:layout'];

      if (panelGroupData) {
        if (panelGroupData[LAYOUT_KEYS_WITH_PROPERTIES]) {
          setShowPropertiesDrawer(true);
        }
      }
    } catch (error) {
      logger.debug('Error parsing layout:', error);
    }
  }, [layout]);

  const layoutPrefsStorage = React.useMemo(
    () => ({
      getItem(name: string) {
        if (!layout) {
          return null;
        }

        try {
          const layoutObj = JSON.parse(layout);
          const storedLayout = layoutObj[name];

          if (!storedLayout) {
            return null;
          }

          // Return the appropriate layout based on the current state
          if (
            showPropertiesDrawer &&
            storedLayout[LAYOUT_KEYS_WITH_PROPERTIES]
          ) {
            return JSON.stringify(storedLayout[LAYOUT_KEYS_WITH_PROPERTIES]);
          } else if (
            !showPropertiesDrawer &&
            storedLayout[LAYOUT_KEYS_WITHOUT_PROPERTIES]
          ) {
            return JSON.stringify(storedLayout[LAYOUT_KEYS_WITHOUT_PROPERTIES]);
          }

          return null;
        } catch (error) {
          logger.debug('Error getting layout item:', error);
          return null;
        }
      },
      setItem(name: string, value: string) {
        try {
          const valueObj = JSON.parse(value);

          let newLayoutObj;
          if (layout) {
            try {
              newLayoutObj = JSON.parse(layout);
            } catch {
              newLayoutObj = {};
            }
          } else {
            newLayoutObj = {};
          }

          // Add name key to layout object, if currently not present (ie., empty)
          if (!newLayoutObj[name]) {
            newLayoutObj[name] = {};
          }

          // Store the layout under the appropriate key based on current state
          const layoutKey = showPropertiesDrawer
            ? LAYOUT_KEYS_WITH_PROPERTIES
            : LAYOUT_KEYS_WITHOUT_PROPERTIES;

          newLayoutObj[name][layoutKey] = valueObj;

          // Pass to debounce func, eventually preferences API
          // Note: setItem has to be synchronous for react-resizable-panels,
          // which is there's no await here even though handleUpdateLayout is async
          const newLayoutString = JSON.stringify(newLayoutObj);
          debouncedUpdateLayout(newLayoutString);

          logger.debug('Setting layout:', newLayoutString);
        } catch (error) {
          logger.debug('Error setting layout item:', error);
        }
      }
    }),
    [layout, debouncedUpdateLayout, showPropertiesDrawer]
  );

  // Clean up the timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    layoutPrefsStorage,
    showPropertiesDrawer,
    togglePropertiesDrawer
  };
}
