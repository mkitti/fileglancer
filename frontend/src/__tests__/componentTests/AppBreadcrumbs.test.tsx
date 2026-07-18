import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { IoTerminal } from 'react-icons/io5';

import AppBreadcrumbs from '@/components/ui/AppsPage/AppBreadcrumbs';

function renderCrumbs(props: React.ComponentProps<typeof AppBreadcrumbs>) {
  return render(
    <MemoryRouter>
      <AppBreadcrumbs {...props} />
    </MemoryRouter>
  );
}

describe('AppBreadcrumbs', () => {
  it('links home and app-name, and renders the entry point as a non-link leaf', () => {
    renderCrumbs({
      homeTo: '/apps',
      homeLabel: 'My Apps',
      appName: 'Demo App',
      appTo: '/apps/detail/org/repo',
      entryPointName: 'Run',
      entryPointIcon: IoTerminal
    });

    // Leading icon links back to the top apps page (named by its sr-only label).
    expect(screen.getByRole('link', { name: 'My Apps' })).toHaveAttribute(
      'href',
      '/apps'
    );
    // App name links to the detail page.
    expect(screen.getByRole('link', { name: 'Demo App' })).toHaveAttribute(
      'href',
      '/apps/detail/org/repo'
    );
    // Entry point is the current, non-clickable leaf.
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Run' })).toBeNull();
  });

  it('renders the app name as plain text when no detail link is available', () => {
    renderCrumbs({
      homeTo: '/apps/catalog',
      homeLabel: 'App Catalog',
      appName: 'Uninstalled App'
    });

    expect(screen.getByRole('link', { name: 'App Catalog' })).toHaveAttribute(
      'href',
      '/apps/catalog'
    );
    expect(screen.getByText('Uninstalled App')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Uninstalled App' })).toBeNull();
  });
});
