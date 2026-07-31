import type { ReactNode } from 'react';
import { TbBrandGithub } from 'react-icons/tb';

import FgExternalLink from '@/components/designSystem/atoms/FgExternalLink';
import FgIcon from '@/components/designSystem/atoms/FgIcon';
import FgLink from '@/components/designSystem/atoms/FgLink';
import type { UserApp } from '@/shared.types';
import { formatDateString } from '@/utils';
import {
  appRevision,
  buildGithubCommitUrl,
  buildGithubFileUrl,
  canonicalGithubUrl,
  manifestPathInfo
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

function CommitValue({
  sha,
  href
}: {
  readonly sha: string;
  readonly href: string | null;
}) {
  // Short SHA in monospace, formatted identically to the Job page "Commit" row.
  const short = sha.slice(0, 7);
  if (href) {
    return (
      <FgExternalLink className="text-xs font-mono" href={href}>
        {short}
      </FgExternalLink>
    );
  }

  return <span className="text-xs font-mono">{short}</span>;
}

function GithubUrlValue({ url }: { readonly url: string }) {
  return (
    <div className="flex items-center gap-1.5 text-foreground">
      <FgIcon className="shrink-0" icon={TbBrandGithub} size="sm" />
      <FgExternalLink
        className="break-all"
        href={url}
        showIcon={false}
        size="sm"
      >
        {url}
      </FgExternalLink>
    </div>
  );
}

export default function AppInfoTable({ app }: { readonly app: UserApp }) {
  const revision = appRevision(app.url, app.branch);
  const manifestPath = manifestPathInfo(
    app.manifest_path,
    app.manifest?.source_filename
  );
  const commitUrl = app.commit_sha
    ? buildGithubCommitUrl(app.url, app.commit_sha)
    : null;
  const manifestUrl = buildGithubFileUrl(
    app.url,
    app.commit_sha ?? revision,
    manifestPath.filePath
  );
  const codeRepoUrl = app.manifest?.repo_url;
  const separateCodeRepoUrl =
    codeRepoUrl &&
    canonicalGithubUrl(codeRepoUrl) !== canonicalGithubUrl(app.url)
      ? codeRepoUrl
      : null;
  const codeCommitUrl =
    app.code_commit_sha && separateCodeRepoUrl
      ? buildGithubCommitUrl(separateCodeRepoUrl, app.code_commit_sha)
      : null;
  const updatedAt = app.updated_at
    ? formatDateString(app.updated_at)
    : 'Not updated since added';

  return (
    <table className="w-full text-sm mb-6">
      <tbody>
        <InfoRow label="URL">
          <GithubUrlValue url={app.url} />
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
        {app.commit_sha ? (
          <InfoRow label="Commit">
            <CommitValue href={commitUrl} sha={app.commit_sha} />
          </InfoRow>
        ) : null}
        {separateCodeRepoUrl ? (
          <InfoRow label="Code repo">
            <FgExternalLink
              className="break-all"
              href={separateCodeRepoUrl}
              size="sm"
            >
              {separateCodeRepoUrl}
            </FgExternalLink>
          </InfoRow>
        ) : null}
        {app.code_commit_sha ? (
          <InfoRow label="Code commit">
            <CommitValue href={codeCommitUrl} sha={app.code_commit_sha} />
          </InfoRow>
        ) : null}
        <InfoRow label="Added">{formatDateString(app.added_at)}</InfoRow>
        <InfoRow label="Last updated">{updatedAt}</InfoRow>
        {app.listing_id ? (
          <InfoRow label="Catalog listing">
            <FgLink size="sm" to={`/apps/catalog/${app.listing_id}`}>
              View catalog listing
            </FgLink>
          </InfoRow>
        ) : null}
        {app.description ? (
          <InfoRow label="Description">{app.description}</InfoRow>
        ) : null}
      </tbody>
    </table>
  );
}
