import type { ReactNode } from 'react';

import FgExternalLink from '@/components/designSystem/atoms/FgExternalLink';
import FgLink from '@/components/designSystem/atoms/FgLink';
import GithubUrlValue from '@/components/ui/AppsPage/GithubUrlValue';
import type { AppListing, AppManifest, UserApp } from '@/shared.types';
import { formatDateString } from '@/utils';
import {
  buildAppDetailPath,
  buildGithubFileUrl,
  manifestPathInfo,
  parseGithubUrl
} from '@/utils/appUrls';

const labelClass =
  'text-foreground font-medium pr-4 py-1.5 align-top whitespace-nowrap';
const valueClass = 'text-foreground py-1.5';

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
  listing,
  manifest
}: {
  readonly installedApp?: UserApp;
  readonly listing: AppListing;
  readonly manifest?: AppManifest;
}) {
  const publishedAt = formatDateString(listing.published_at);
  const editedAt = listing.updated_at
    ? formatDateString(listing.updated_at)
    : 'Not edited since publish';
  const revision = listingRevision(listing);
  const manifestPath = manifestPathInfo(
    listing.manifest_path,
    manifest?.source_filename
  );
  const manifestUrl = buildGithubFileUrl(
    listing.url,
    revision,
    manifestPath.filePath
  );

  return (
    <table className="w-full text-sm mb-6">
      <tbody>
        <InfoRow label="URL">
          <GithubUrlValue url={listing.url} />
        </InfoRow>
        {revision ? (
          <InfoRow label="Revision">
            <span className="break-all">{revision}</span>
          </InfoRow>
        ) : null}
        <InfoRow label="Manifest path">
          {manifestUrl ? (
            <FgExternalLink className="break-all" href={manifestUrl} size="sm">
              {manifestPath.label}
            </FgExternalLink>
          ) : (
            manifestPath.label
          )}
        </InfoRow>
        <InfoRow label="Shared by">{listing.owner_username}</InfoRow>
        <InfoRow label="Published">{publishedAt}</InfoRow>
        <InfoRow label="Last edited">{editedAt}</InfoRow>
        <InfoRow label="Installs">{listing.install_count}</InfoRow>
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
        {listing.description ? (
          <InfoRow label="Description">{listing.description}</InfoRow>
        ) : null}
      </tbody>
    </table>
  );
}
