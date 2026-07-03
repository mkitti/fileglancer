import type { ReactNode } from 'react';

import FgExternalLink from '@/components/designSystem/atoms/FgExternalLink';
import FgLink from '@/components/designSystem/atoms/FgLink';
import type { UserApp } from '@/shared.types';
import { formatDateString } from '@/utils';
import {
  appRevision,
  buildGithubCommitUrl,
  canonicalGithubUrl
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

export default function AppInfoTable({ app }: { readonly app: UserApp }) {
  const revision = appRevision(app.url, app.branch);
  const commitUrl = app.commit_sha
    ? buildGithubCommitUrl(app.url, app.commit_sha)
    : null;
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
          <span className="py-1.5">
            <FgExternalLink className="break-all" href={app.url}>
              {app.url}
            </FgExternalLink>
          </span>
        </InfoRow>
        {revision ? (
          <InfoRow label="Revision">
            <span className="break-all">{revision}</span>
          </InfoRow>
        ) : null}
        <InfoRow label="Manifest path">
          {manifestPathLabel(app.manifest_path)}
        </InfoRow>
        {app.commit_sha ? (
          <InfoRow label="App commit">
            <CommitValue href={commitUrl} sha={app.commit_sha} />
          </InfoRow>
        ) : null}
        {separateCodeRepoUrl ? (
          <InfoRow label="Code repo">
            <FgExternalLink className="break-all" href={separateCodeRepoUrl}>
              {separateCodeRepoUrl}
            </FgExternalLink>
          </InfoRow>
        ) : null}
        {app.code_commit_sha ? (
          <InfoRow label="Code commit">
            <CommitValue href={codeCommitUrl} sha={app.code_commit_sha} />
          </InfoRow>
        ) : null}
        <InfoRow label="Added to My Apps">
          {formatDateString(app.added_at)}
        </InfoRow>
        <InfoRow label="Last updated">{updatedAt}</InfoRow>
        {app.listing_id ? (
          <InfoRow label="Catalog listing">
            <FgLink size="sm" to={`/apps/catalog/${app.listing_id}`}>
              #{app.listing_id}
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
