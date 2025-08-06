import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import toast from 'react-hot-toast';

// Define mock functions using vi.hoisted to ensure they're available to vi.mock,
// which is hoisted to be executed before all imports
const mockFns = vi.hoisted(() => ({
  handleLocalPermissionChange: vi.fn()
}));

// Mock only parts of usePermissionsDialog hook without mocking handleChangePermissions
vi.mock(import('../../hooks/usePermissionsDialog'), async importOriginal => {
  const originalModule = await importOriginal();

  return {
    // The default export is our hook function
    default: () => {
      // We're not executing the original hook here to avoid context issues
      // Instead, we're returning an object with the properties we want
      return {
        handleChangePermissions:
          originalModule.default().handleChangePermissions,
        handleLocalPermissionChange: mockFns.handleLocalPermissionChange,
        localPermissions: 'drwxrwxr-x'
      };
    }
  };
});

import ChangePermissions from '@/components/ui/Dialogs/ChangePermissions';
import { render, screen } from '@/__tests__/test-utils';

describe('Change Permissions dialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const setShowPermissionsDialog = vi.fn();

    render(
      <ChangePermissions
        showPermissionsDialog={true}
        setShowPermissionsDialog={setShowPermissionsDialog}
      />,
      { initialEntries: ['/browse/test_fsp/my_folder/my_file'] }
    );

    await waitFor(() => {
      const btn = screen.getByText('Change Permissions', {
        selector: 'button[type="submit"]'
      });
      expect(btn).toBeInTheDocument();
    });
  });

  it('displays permissions dialog for file in URL', () => {
    expect(screen.getByText('my_file')).toBeInTheDocument();
  });

  it('calls toast.success for an ok HTTP response', async () => {
    const user = userEvent.setup();
    await user.click(
      screen.getByText('Change Permissions', {
        selector: 'button[type="submit"]'
      })
    );
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Permissions changed!');
    });
  });

  it('calls toast.error for a bad HTTP response', async () => {
    // Override the mock for this specific test to simulate an error
    const { server } = await import('@/__tests__/mocks/node');
    const { http, HttpResponse } = await import('msw');

    server.use(
      http.patch('http://localhost:3000/api/fileglancer/files/:fspName', () => {
        return HttpResponse.json(
          { error: 'Permission denied' },
          { status: 500 }
        );
      })
    );

    const user = userEvent.setup();
    await user.click(
      screen.getByText('Change Permissions', {
        selector: 'button[type="submit"]'
      })
    );
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Error changing permissions: Permission denied'
      );
    });
  });
});
