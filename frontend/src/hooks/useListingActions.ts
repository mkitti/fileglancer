import { useState } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';

import {
  useAddFromListingMutation,
  useUnshareListingMutation,
  useUpdateListingMutation
} from '@/queries/appsQueries';
import { buildAppDetailPath } from '@/utils';
import { showErrorToast } from '@/utils/errorToast';
import type { AppListing, UserApp } from '@/shared.types';

export function buildListingDetailPath(listingId: number): string {
  return `/apps/catalog/${listingId}`;
}

export interface ListingActions {
  view: (listing: AppListing) => void;
  viewInMyApps: (app: UserApp) => void;
  add: (listing: AppListing) => Promise<void>;
  unshare: (listing: AppListing) => Promise<void>;
  saveEdit: (params: {
    listing_id: number;
    url: string;
    name: string;
    description: string;
  }) => Promise<void>;
  requestEdit: (listing: AppListing) => void;
  editTarget: AppListing | null;
  closeEdit: () => void;
  saving: boolean;
  /** Listing id the add/unshare mutation is currently running for, if any. */
  addingId: number | null;
  unsharingId: number | null;
}

/**
 * Navigation and mutation handlers for the actions offered on a catalog
 * listing (view details, add to my apps, edit, unshare), shared by the
 * catalog cards and the listing detail page. Edit is a two-step flow:
 * `requestEdit` sets a target listing whose dialog is rendered by
 * `ListingActionDialogs`.
 */
export function useListingActions(opts?: {
  onUnshared?: () => void;
}): ListingActions {
  const navigate = useNavigate();
  const [editTarget, setEditTarget] = useState<AppListing | null>(null);
  const addFromListingMutation = useAddFromListingMutation();
  const unshareListingMutation = useUnshareListingMutation();
  const updateListingMutation = useUpdateListingMutation();

  const view = (listing: AppListing) => {
    navigate(buildListingDetailPath(listing.id));
  };

  const viewInMyApps = (app: UserApp) => {
    navigate(buildAppDetailPath(app.url, app.manifest_path));
  };

  const add = async (listing: AppListing) => {
    try {
      await addFromListingMutation.mutateAsync({ listing_id: listing.id });
      toast.success(`Added "${listing.name}"`);
    } catch (e) {
      showErrorToast(e, 'Failed to add app');
    }
  };

  const unshare = async (listing: AppListing) => {
    try {
      await unshareListingMutation.mutateAsync({ listing_id: listing.id });
      toast.success('Removed from catalog');
      opts?.onUnshared?.();
    } catch (e) {
      showErrorToast(e, 'Failed to unshare');
    }
  };

  // Errors intentionally propagate so EditListingDialog can show them inline.
  const saveEdit = async (params: {
    listing_id: number;
    url: string;
    name: string;
    description: string;
  }) => {
    await updateListingMutation.mutateAsync(params);
    toast.success('Listing updated');
  };

  return {
    view,
    viewInMyApps,
    add,
    unshare,
    saveEdit,
    requestEdit: setEditTarget,
    editTarget,
    closeEdit: () => setEditTarget(null),
    saving: updateListingMutation.isPending,
    addingId: addFromListingMutation.isPending
      ? (addFromListingMutation.variables?.listing_id ?? null)
      : null,
    unsharingId: unshareListingMutation.isPending
      ? (unshareListingMutation.variables?.listing_id ?? null)
      : null
  };
}
