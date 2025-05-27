import React from 'react';
import { Outlet } from 'react-router';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import useShowPropertiesDrawer from '@/hooks/useShowPropertiesDrawer';
import usePropertiesTarget from '@/hooks/usePropertiesTarget';

import Sidebar from '@/components/ui/Sidebar/Sidebar';
import PropertiesDrawer from '@/components/ui/PropertiesDrawer/PropertiesDrawer';

export const BrowseLayout = () => {
  const [showPermissionsDialog, setShowPermissionsDialog] =
    React.useState(false);
  const [showSidebar, setShowSidebar] = React.useState(true);

  const { showPropertiesDrawer, setShowPropertiesDrawer } =
    useShowPropertiesDrawer();
  const { propertiesTarget, setPropertiesTarget } = usePropertiesTarget();

  const outletContextValue = {
    setShowPermissionsDialog: setShowPermissionsDialog,
    setShowPropertiesDrawer: setShowPropertiesDrawer,
    setPropertiesTarget: setPropertiesTarget,
    setShowSidebar: setShowSidebar,
    showPermissionsDialog: showPermissionsDialog,
    showPropertiesDrawer: showPropertiesDrawer,
    propertiesTarget: propertiesTarget,
    showSidebar: showSidebar
  };

  return (
    <div className="flex h-full w-full overflow-y-hidden">
      <PanelGroup autoSaveId="conditional" direction="horizontal">
        {showSidebar ? (
          <>
            <Panel id="sidebar" order={1} defaultSize={18} maxSize={50}>
              <Sidebar />
            </Panel>
            <PanelResizeHandle className="bg-background shadow-lg border-l border-surface shadow-surface relative" />
          </>
        ) : null}
        <Panel id="main" order={2}>
          <Outlet context={outletContextValue} />
        </Panel>
        {showPropertiesDrawer ? (
          <>
            <PanelResizeHandle className="w-1 bg-surface shadow-xl" />
            <Panel id="properties" order={3}>
              <PropertiesDrawer
                propertiesTarget={propertiesTarget}
                open={showPropertiesDrawer}
                setShowPropertiesDrawer={setShowPropertiesDrawer}
                setShowPermissionsDialog={setShowPermissionsDialog}
              />
            </Panel>
          </>
        ) : null}
      </PanelGroup>
    </div>
  );
};
