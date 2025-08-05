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
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('displays permissions dialog for file in URL', async () => {
    await waitFor(() => {
      expect(
        screen.getByText('Change permissions for file:')
      ).toBeInTheDocument();
      expect(screen.getByText('my_file')).toBeInTheDocument();
    });
  });

  it('calls toast.success for an ok HTTP response', async () => {
    // Workaround for error: "element.animate" is not a function, caused by ripple animation on btn
    // https://github.com/jsdom/jsdom/issues/3429#issuecomment-1936128876
    Element.prototype.animate = vi
      .fn()
      .mockImplementation(() => ({ finished: Promise.resolve() }));
    const user = userEvent.setup();

    // First ensure the button is in the document and wait for it
    const changePermissionsButton = await waitFor(() => {
      const btn = screen.getByText('Change Permissions', {
        selector: 'button[type="submit"]'
      });
      expect(btn).toBeInTheDocument();
      return btn;
    });

    // Click the button to submit the form
    await user.click(changePermissionsButton);

    // Now check that toast.success was called with the right message
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Permissions changed!');
    });
  });
});
