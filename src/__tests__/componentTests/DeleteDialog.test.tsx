import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { render, screen } from '@/__tests__/test-utils';
import toast from 'react-hot-toast';
import DeleteDialog from '@/components/ui/Dialogs/Delete';

describe('Delete dialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const setShowDeleteDialog = vi.fn();

    render(
      <DeleteDialog
        targetItem={{
          name: 'target_file',
          path: '/my_folder/target_file',
          size: 1024,
          is_dir: false,
          permissions: 'drwxr-xr-x',
          owner: 'testuser',
          group: 'testgroup',
          last_modified: 1647855213
        }}
        showDeleteDialog={true}
        setShowDeleteDialog={setShowDeleteDialog}
      />,
      { initialEntries: ['/browse/test_fsp/my_folder'] }
    );

    await waitFor(() => {
      expect(
        screen.getByText('/test/fsp', { exact: false })
      ).toBeInTheDocument();
    });
  });

  it('calls toast.success for an ok HTTP response', async () => {
    const user = userEvent.setup();
    await user.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Item deleted!');
    });
  });

  it('calls toast.error for a bad HTTP response', async () => {
    // Override the mock for this specific test to simulate an error
    const { server } = await import('@/__tests__/mocks/node');
    const { http, HttpResponse } = await import('msw');

    server.use(
      http.delete(
        'http://localhost:3000/api/fileglancer/files/test_fsp',
        () => {
          return HttpResponse.json({ error: 'Unknown error' }, { status: 500 });
        }
      )
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Error deleting item: Unknown error'
      );
    });
  });
});
