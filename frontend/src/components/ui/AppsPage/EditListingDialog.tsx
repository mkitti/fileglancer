import { useEffect, useState } from 'react';
import { Typography } from '@material-tailwind/react';
import { HiOutlinePencilSquare } from 'react-icons/hi2';

import FgDialog from '@/components/ui/Dialogs/FgDialog';
import FgButton from '@/components/designSystem/atoms/FgButton';
import FgFormField from '@/components/designSystem/molecules/FgFormField';
import FgInput from '@/components/designSystem/atoms/formElements/FgInput';
import FgTextarea from '@/components/designSystem/atoms/formElements/FgTextarea';
import {
  appRevision,
  buildAppUrl,
  buildGithubUrl,
  isGithubRepoUrl,
  manifestPathInfo,
  parseGithubUrl
} from '@/utils';
import type { AppListing } from '@/shared.types';

interface EditListingDialogProps {
  readonly listing: AppListing | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSave: (params: {
    listing_id: number;
    url: string;
    name: string;
    description: string;
  }) => Promise<void>;
  readonly saving: boolean;
}

/** The listing URL split into a bare repo URL and its revision, for editing. */
function splitListingUrl(listing: AppListing): {
  repoUrl: string;
  revision: string;
} {
  try {
    const { owner, repo } = parseGithubUrl(listing.url);
    return {
      repoUrl: buildGithubUrl(owner, repo, 'main'),
      revision: appRevision(listing.url, listing.branch) ?? ''
    };
  } catch {
    return { repoUrl: listing.url, revision: listing.branch ?? '' };
  }
}

export default function EditListingDialog({
  listing,
  open,
  onClose,
  onSave,
  saving
}: EditListingDialogProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [revision, setRevision] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saveError, setSaveError] = useState('');

  // Prefill from the listing each time the dialog is (re)opened.
  useEffect(() => {
    if (open && listing) {
      const { repoUrl: url, revision: rev } = splitListingUrl(listing);
      setRepoUrl(url);
      setRevision(rev);
      setName(listing.name);
      setDescription(listing.description ?? '');
      setUrlError('');
      setSaveError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const urlIsValid = repoUrl.trim() !== '' && isGithubRepoUrl(repoUrl);

  // Whether the edit repoints the listing (as opposed to a metadata-only
  // change), so the user knows a slower validation step is coming.
  let newUrl: string | null = null;
  try {
    newUrl = buildAppUrl(repoUrl, revision);
  } catch {
    newUrl = null;
  }
  const urlChanged =
    listing !== null && newUrl !== null && newUrl !== listing.url;

  const handleSave = async () => {
    if (!listing) {
      return;
    }
    if (!urlIsValid || newUrl === null) {
      setUrlError('Please enter a valid GitHub repository URL (HTTPS or SSH)');
      return;
    }
    if (!name.trim()) {
      setSaveError('Name is required');
      return;
    }
    try {
      await onSave({
        listing_id: listing.id,
        url: newUrl,
        name: name.trim(),
        description: description.trim()
      });
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update listing');
    }
  };

  // Not linked to GitHub like on the detail page: the revision (and thus the
  // link target) may be about to change.
  const manifestLabel = listing
    ? manifestPathInfo(listing.manifest_path).label
    : '';

  return (
    <FgDialog className="max-w-2xl" onClose={onClose} open={open}>
      <Typography className="text-foreground font-bold mb-4 pr-8" type="h6">
        Edit Listing
      </Typography>
      <Typography className="mb-4 text-foreground text-sm">
        Changing the repository or revision re-validates that the app manifest{' '}
        <code>{manifestLabel}</code> still exists there.
      </Typography>

      <FgFormField
        error={urlError || undefined}
        htmlFor="edit-listing-url"
        label="GitHub Repository URL"
      >
        <FgInput
          onChange={e => {
            setRepoUrl(e.target.value);
            setUrlError('');
            setSaveError('');
          }}
          placeholder="https://github.com/org/repo or git@github.com:org/repo.git"
          type="text"
          value={repoUrl}
        />
      </FgFormField>

      <FgFormField
        helperText="Tag or branch name"
        htmlFor="edit-listing-revision"
        label="Revision"
        optional
      >
        <FgInput
          onChange={e => {
            setRevision(e.target.value);
            setSaveError('');
          }}
          placeholder="main"
          type="text"
          value={revision}
        />
      </FgFormField>

      <FgFormField htmlFor="edit-listing-name" label="Name">
        <FgInput
          onChange={e => {
            setName(e.target.value);
            setSaveError('');
          }}
          type="text"
          value={name}
        />
      </FgFormField>

      <FgFormField
        className="mb-2"
        htmlFor="edit-listing-description"
        label="Description"
        optional
      >
        <FgTextarea
          onChange={e => setDescription(e.target.value)}
          rows={3}
          value={description}
        />
      </FgFormField>

      {urlChanged ? (
        <Typography className="mb-3 text-foreground text-sm">
          The new repository and revision will be checked before saving. Users
          who have already added this app will keep their current copies; only
          users who add it from now on will get it from the new location.
        </Typography>
      ) : null}

      {saveError ? (
        <Typography className="text-error mb-3" type="small">
          {saveError}
        </Typography>
      ) : null}

      <div className="flex gap-3">
        <FgButton
          disabled={!urlIsValid || !name.trim() || saving}
          icon={HiOutlinePencilSquare}
          loading={saving}
          loadingText={urlChanged ? 'Validating repository...' : 'Saving...'}
          onClick={handleSave}
        >
          Save
        </FgButton>
        <FgButton onClick={onClose} variant="ghost">
          Cancel
        </FgButton>
      </div>
    </FgDialog>
  );
}
