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

// Name is set by the autosaveId prop in PanelGroup
const LAYOUT_NAME = 'react-resizable-panels:layout';
// Confusingly, the names are in alphabetical order, but the order of the sizes is set by the order prop in the respective Panel components
const DEFAULT_LAYOUT =
  '{"main,properties,sidebar":{"expandToSizes":{},"layout":[24,50,24]}}';
const DEFAULT_PROPERTIES_SIZE = 24; // Default size for properties panel in percentage

// Layout keys for the two possible panel combinations
const WITH_PROPERTIES = 'main,properties,sidebar';
const WITHOUT_PROPERTIES = 'main,sidebar';

export default function useLayoutPrefs() {
  const [showPropertiesDrawer, setShowPropertiesDrawer] =
    React.useState<boolean>(false);
  const { layout, handleUpdateLayout, isLayoutLoadedFromDB } =
    usePreferencesContext();

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
    if (!isLayoutLoadedFromDB) {
      return;
    } else if (layout === '') {
      // default layout includes properties drawer
      setShowPropertiesDrawer(true);
    } else {
      try {
        const parsedLayout = JSON.parse(layout);
        const panelGroupData = parsedLayout[LAYOUT_NAME];

        if (panelGroupData) {
          if (panelGroupData[WITH_PROPERTIES]) {
            setShowPropertiesDrawer(true);
          } else if (panelGroupData[WITHOUT_PROPERTIES]) {
            setShowPropertiesDrawer(false);
          }
        }
      } catch (error) {
        logger.debug('Error parsing layout:', error);
      }
    }
  }, [layout, isLayoutLoadedFromDB]);

  const layoutPrefsStorage = React.useMemo(
    () => ({
      getItem(name: string): string {
        logger.debug('getItem called with name:', name);
        logger.debug('current layout value:', layout);
        logger.debug('isLayoutLoadedFromDB:', isLayoutLoadedFromDB);

        // Don't try to parse layout until it's loaded from the database
        if (!isLayoutLoadedFromDB) {
          logger.debug('Layout not loaded from DB yet, returning empty string');
          return '';
        }
        // If layout is empty, return default layout
        if (layout === '') {
          logger.debug(
            'Layout is empty, returning default layout',
            DEFAULT_LAYOUT
          );
          return DEFAULT_LAYOUT;
        }

        try {
          const layoutObj = JSON.parse(layout);
          logger.debug('parsed layout object:', layoutObj);
          const storedLayout = JSON.stringify(layoutObj[name]);

          if (!storedLayout) {
            logger.debug('No stored layout found for name:', name);
            return '';
          } else {
            logger.debug('getItem returning storedLayout:', storedLayout);
            return storedLayout;
          }
        } catch (error) {
          logger.debug('Error getting layout item:', error);
          return '';
        }
      },
      setItem(name: string, value: string) {
        if (!isLayoutLoadedFromDB) {
          logger.debug('Layout not loaded from DB yet');
          return;
        }
        try {
          const incomingLayout = JSON.parse(value);
          const incomingLayoutKeys = Object.keys(incomingLayout);
          logger.debug(
            'setItem called with name:',
            name,
            'parsed value:',
            incomingLayout,
            'showPropertiesDrawer:',
            showPropertiesDrawer
          );
          let newLayoutObj = {};

          // First handle cases where the new layout has both key sets, indicating the presence of the properties panel
          // has been toggled
          if (
            incomingLayoutKeys.includes(WITH_PROPERTIES) &&
            incomingLayoutKeys.includes(WITHOUT_PROPERTIES) &&
            layout !== ''
          ) {
            const prevLayout = JSON.parse(layout);
            console.log('showPropertiesDrawer:', showPropertiesDrawer);
            if (showPropertiesDrawer) {
              // If the new layout has properties panel but the previous one didn't,
              // subtract the properties panel size from the main panel size in the prev panel. Keep the sidebar size the same.
              // To access array of sizes, prevLayout[name][KEY]['layout']. The order of panel sizes is [sidebar, main, properties]
              const mainPanelSize =
                prevLayout[name][WITHOUT_PROPERTIES]['layout'][1] -
                DEFAULT_PROPERTIES_SIZE;
              const sidebarSize =
                prevLayout[name][WITHOUT_PROPERTIES]['layout'][0];
              const propertiesPanelSize = DEFAULT_PROPERTIES_SIZE; // Default size for properties panel
              newLayoutObj = {
                [name]: {
                  expandToSizes: {},
                  [WITH_PROPERTIES]: {
                    layout: [sidebarSize, mainPanelSize, propertiesPanelSize]
                  }
                }
              };
            } else {
              // If the new layout doesn't have properties panel but the previous one did,
              // add the properties panel size to the main panel size in the prev panel. Keep the sidebar size the same.
              const mainPanelSize =
                prevLayout[name][WITH_PROPERTIES]['layout'][1] +
                prevLayout[name][WITH_PROPERTIES]['layout'][2];
              const sidebarSize =
                prevLayout[name][WITH_PROPERTIES]['layout'][0];
              newLayoutObj = {
                [name]: {
                  expandToSizes: {},
                  [WITHOUT_PROPERTIES]: {
                    layout: [sidebarSize, mainPanelSize]
                  }
                }
              };
            }
          } else if (incomingLayout[WITH_PROPERTIES] && showPropertiesDrawer) {
            //Now handle the cases where the new layout has only one of the two keys
            // This menas the properties panel state has not changed
            // The new layout should use the key that matches the current state of the properties panel
            newLayoutObj = {
              expandToSizes: {},
              [name]: {
                [WITH_PROPERTIES]: incomingLayout[WITH_PROPERTIES]
              }
            };
          } else if (
            incomingLayout[WITHOUT_PROPERTIES] &&
            !showPropertiesDrawer
          ) {
            newLayoutObj = {
              expandToSizes: {},
              [name]: {
                [WITHOUT_PROPERTIES]: incomingLayout[WITHOUT_PROPERTIES]
              }
            };
          } else {
            logger.debug('Invalid layout value:', value);
            return;
          }

          // Pass to debounce func, eventually preferences API
          // Note: setItem has to be synchronous for react-resizable-panels,
          // which is there's no await here even though handleUpdateLayout is async
          const newLayoutString = JSON.stringify(newLayoutObj);
          logger.debug('setting layout with newLayoutString:', newLayoutString);
          debouncedUpdateLayout(newLayoutString);
        } catch (error) {
          logger.debug('Error setting layout item:', error);
        }
      }
    }),
    [layout, debouncedUpdateLayout, isLayoutLoadedFromDB, showPropertiesDrawer]
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

/** 
 * Failed attempt to try to keep the sidebar panel size the same when toggling properties panel
 * 
            // */
