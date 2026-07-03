import FgExternalLink from '@/components/designSystem/atoms/FgExternalLink';
import type { UserApp } from '@/shared.types';
import { buildGithubCommitUrl, parseGithubUrl } from '@/utils/appUrls';

/**
 * The revision actually cloned, parsed out of the canonical app URL (which
 * always carries it). Falls back to the requested branch, then null.
 */
function appRevision(app: UserApp): string | null {
  try {
    return parseGithubUrl(app.url).branch;
  } catch {
    return app.branch || null;
  }
}

export default function AppInfoTable({ app }: { readonly app: UserApp }) {
  const labelClass =
    'text-foreground font-medium pr-4 py-1.5 align-top whitespace-nowrap';
  const valueClass = 'text-foreground py-1.5';
  const revision = appRevision(app);
  const commitUrl = app.commit_sha
    ? buildGithubCommitUrl(app.url, app.commit_sha)
    : null;

  return (
    <table className="w-full text-sm mb-6">
      <tbody>
        <tr>
          <td className={labelClass}>URL</td>
          <td className="py-1.5">
            <FgExternalLink className="break-all" href={app.url}>
              {app.url}
            </FgExternalLink>
          </td>
        </tr>
        {revision ? (
          <tr>
            <td className={labelClass}>Revision</td>
            <td className={valueClass}>{revision}</td>
          </tr>
        ) : null}
        {app.commit_sha ? (
          <tr>
            <td className={labelClass}>Version</td>
            <td className={valueClass}>
              {commitUrl ? (
                <FgExternalLink className="font-mono" href={commitUrl}>
                  {app.commit_sha.slice(0, 7)}
                </FgExternalLink>
              ) : (
                <span className="font-mono">{app.commit_sha.slice(0, 7)}</span>
              )}
            </td>
          </tr>
        ) : null}
        {app.description ? (
          <tr>
            <td className={labelClass}>Description</td>
            <td className={valueClass}>{app.description}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
