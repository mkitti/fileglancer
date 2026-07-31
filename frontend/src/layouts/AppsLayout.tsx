import { NavLink, Outlet, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { PiDotsSixVerticalBold } from 'react-icons/pi';
import {
  HiOutlineQueueList,
  HiOutlineRocketLaunch,
  HiOutlineSquares2X2
} from 'react-icons/hi2';

import FgBadge from '@/components/designSystem/atoms/FgBadge';
import FgIcon from '@/components/designSystem/atoms/FgIcon';
import { useActiveJobCount } from '@/hooks/useActiveJobCount';
import type { LaunchOrigin } from '@/shared.types';

interface TabItem {
  to: string;
  label: string;
  icon: IconType;
  end?: boolean;
  badge?: ReactNode;
  /** Overrides NavLink's own active-state matching when set. */
  isActive?: boolean;
}

function tabClass({ isActive }: { isActive: boolean }) {
  const base =
    'relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary';
  const state = isActive
    ? 'bg-primary/10 text-primary'
    : 'text-foreground/70 hover:bg-surface/60 hover:text-foreground dark:hover:bg-surface';
  return `${base} ${state}`;
}

/** Vertical accent bar marking the selected tab. */
function TabAccent({ active }: { readonly active: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-y-2 left-0 w-[3px] rounded-full transition-colors duration-150 ${
        active ? 'bg-primary' : 'bg-transparent'
      }`}
    />
  );
}

export default function AppsLayout() {
  const activeJobCount = useActiveJobCount();
  const location = useLocation();
  const { pathname } = location;

  // The launch/relaunch pages are drill-downs with no tab of their own, so keep
  // the originating tab selected. The origin is recorded in navigation state
  // (My Apps vs App Catalog); without it (reload/direct nav) default to My Apps.
  const launchOrigin = (location.state as { from?: LaunchOrigin } | null)?.from;
  const onLaunchPage =
    pathname.startsWith('/apps/launch/') ||
    pathname.startsWith('/apps/relaunch/');
  const catalogLaunch =
    onLaunchPage && launchOrigin?.homeTo === '/apps/catalog';

  // App detail and launches originating from My Apps keep My Apps highlighted
  // (NavLink's own matching would mark it inactive on these drill-downs).
  const myAppsActive =
    pathname === '/apps' ||
    pathname.startsWith('/apps/detail/') ||
    (onLaunchPage && !catalogLaunch);

  // App Catalog stays highlighted on its own pages and on a catalog-originated
  // launch (where the pathname alone wouldn't match).
  const catalogActive =
    pathname === '/apps/catalog' ||
    pathname.startsWith('/apps/catalog/') ||
    catalogLaunch;

  const tabs: TabItem[] = [
    {
      to: '/apps',
      label: 'My Apps',
      icon: HiOutlineRocketLaunch,
      end: true,
      isActive: myAppsActive
    },
    {
      to: '/apps/catalog',
      label: 'App Catalog',
      icon: HiOutlineSquares2X2,
      isActive: catalogActive
    },
    {
      to: '/apps/jobs',
      label: 'Jobs',
      icon: HiOutlineQueueList,
      badge:
        activeJobCount > 0 ? (
          <FgBadge color="secondary" size="sm" variant="pill">
            {activeJobCount > 9 ? '9+' : activeJobCount}
          </FgBadge>
        ) : null
    }
  ];

  return (
    <div className="flex h-full w-full overflow-y-hidden">
      <PanelGroup autoSaveId="apps-layout" direction="horizontal">
        <Panel
          defaultSize={15}
          id="apps-nav"
          maxSize={30}
          minSize={10}
          order={1}
        >
          <nav
            aria-label="Apps sections"
            className="h-full overflow-y-auto p-4"
          >
            <ul className="flex flex-col gap-2">
              {tabs.map(tab => (
                <li key={tab.to}>
                  <NavLink
                    className={({ isActive }) =>
                      tabClass({ isActive: tab.isActive ?? isActive })
                    }
                    end={tab.end}
                    to={tab.to}
                  >
                    {({ isActive }) => (
                      <>
                        <TabAccent active={tab.isActive ?? isActive} />
                        <FgIcon className="shrink-0" icon={tab.icon} />
                        <span className="flex-1 truncate">{tab.label}</span>
                        {tab.badge}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </Panel>
        <PanelResizeHandle className="group relative w-3 bg-surface border-r border-surface hover:border-secondary/60">
          <FgIcon
            className="stroke-2 absolute -right-1 top-1/2 stroke-surface-foreground pointer-events-none"
            icon={PiDotsSixVerticalBold}
          />
        </PanelResizeHandle>
        <Panel id="apps-main" order={2}>
          <div className="h-full overflow-y-auto px-8 py-6">
            <Outlet />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
