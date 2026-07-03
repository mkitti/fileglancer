import type { ReactNode } from 'react';

import FgExternalLink from '@/components/designSystem/atoms/FgExternalLink';
import FgLink from '@/components/designSystem/atoms/FgLink';
import type { AppListing, UserApp } from '@/shared.types';
import { formatDateString } from '@/utils';
import {
  buildAppDetailPath,
  buildGithubCommitUrl,
  parseGithubUrl
} from '@/utils/appUrls';

const labelClass =
  'text-foreground font-medium pr-4 py-1.5 align-top whitespace-nowrap';
const valueClass = 'text-foreground py-1.5';

function manifestPathLabel(path: string): string {
  return path || 'Repository root';
}

function InfoRow({
  label,
  children
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <tr>
      <td className={labelClass}>{label}</td>
      <td className={valueClass}>{children}</td>
    </tr>
  );
}

function CommitValue({
  sha,
  href
}: {
  readonly sha: string;
  readonly href: string | null;
}) {
  if (href) {
    return (
      <FgExternalLink className="break-all text-xs font-mono" href={href}>
        {sha}
      </FgExternalLink>
    );
  }

  return <span className="break-all text-xs font-mono">{sha}</span>;
}

/**
 * The revision actually cloned, parsed out of the canonical listing URL (which
 * always carries it). Falls back to the requested branch, then null.
 */
function listingRevision(listing: AppListing): string | null {
  try {
    return parseGithubUrl(listing.url).branch;
  } catch {
    return listing.branch || null;
  }
}

export default function ListingInfoTable({
  installedApp,
  listing
}: {
  readonly installedApp?: UserApp;
  readonly listing: AppListing;
}) {
  const publishedAt = formatDateString(listing.published_at);
  const editedAt = listing.updated_at
    ? formatDateString(listing.updated_at)
    : 'Not edited since publish';
  const revision = listingRevision(listing);
  const installedCommitUrl = installedApp?.commit_sha
    ? buildGithubCommitUrl(installedApp.url, installedApp.commit_sha)
    : null;

  return (
    <table className="w-full text-sm mb-6">
      <tbody>
        <InfoRow label="URL">
          <span className="py-1.5">
            <FgExternalLink className="break-all" href={listing.url}>
              {listing.url}
            </FgExternalLink>
          </span>
        </InfoRow>
        {revision ? (
          <InfoRow label="Revision">
            <span className="break-all">{revision}</span>
          </InfoRow>
        ) : null}
        <InfoRow label="Manifest path">
          {manifestPathLabel(listing.manifest_path)}
        </InfoRow>
        <InfoRow label="Shared by">{listing.owner_username}</InfoRow>
        <InfoRow label="Published">{publishedAt}</InfoRow>
        <InfoRow label="Last edited">{editedAt}</InfoRow>
        {installedApp ? (
          <InfoRow label="In My Apps">
            <FgLink
              size="sm"
              to={buildAppDetailPath(
                installedApp.url,
                installedApp.manifest_path
              )}
            >
              View installed app
            </FgLink>
          </InfoRow>
        ) : null}
        {installedApp?.commit_sha ? (
          <InfoRow label="Installed commit">
            <CommitValue
              href={installedCommitUrl}
              sha={installedApp.commit_sha}
            />
          </InfoRow>
        ) : null}
        {listing.description ? (
          <InfoRow label="Description">{listing.description}</InfoRow>
        ) : null}
      </tbody>
    </table>
  );
}
