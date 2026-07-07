import { TbBrandGithub } from 'react-icons/tb';

import FgExternalLink from '@/components/designSystem/atoms/FgExternalLink';
import FgIcon from '@/components/designSystem/atoms/FgIcon';

/** A GitHub repo URL rendered with the GitHub icon and an external link. */
export default function GithubUrlValue({ url }: { readonly url: string }) {
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
