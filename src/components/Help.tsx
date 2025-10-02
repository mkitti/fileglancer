import { Card, Typography } from '@material-tailwind/react';
import { Link } from 'react-router';
import { TbBrandGithub } from 'react-icons/tb';
import { SiClickup, SiSlack } from 'react-icons/si';
import { IconType } from 'react-icons/lib';
import { LuBookOpenText } from 'react-icons/lu';
import { HiExternalLink } from 'react-icons/hi';

import useVersionNo from '@/hooks/useVersionState';
import useCentralVersion from '@/hooks/useCentralVersion';

type HelpLink = {
  icon: IconType;
  title: string;
  description: string;
  url: string;
};

export default function Help() {
  const { versionNo } = useVersionNo();
  const { centralVersionState } = useCentralVersion();

  const helpLinks: HelpLink[] = [
    {
      icon: LuBookOpenText,
      title: 'User Manual',
      description:
        'Comprehensive guide to Fileglancer features and functionality',
      url: `https://janeliascicomp.github.io/fileglancer-user-docs/`
    },
    {
      icon: TbBrandGithub,
      title: 'Release Notes',
      description: `What's new and improved in Fileglancer version ${versionNo}`,
      url: `https://github.com/JaneliaSciComp/fileglancer/releases/tag/${versionNo}`
    },
    {
      icon: SiClickup,
      title: 'Submit Tickets',
      description: 'Report bugs or request features through a ClickUp form',
      url: `https://forms.clickup.com/10502797/f/a0gmd-713/NBUCBCIN78SI2BE71G?Version=${versionNo}&URL=${window.location}`
    },
    {
      icon: SiSlack,
      title: 'Community Support',
      description: 'Get help from the community on our dedicated Slack channel',
      url: 'https://hhmi.enterprise.slack.com/archives/C0938N06YN8'
    }
  ];

  return (
    <>
      <div className="flex justify-between mb-6">
        <Typography type="h5" className="text-foreground font-bold">
          Help
        </Typography>
        <div className="text-right">
          <Typography type="lead" className="text-foreground font-bold">
            {`Fileglancer Version ${versionNo}`}
          </Typography>
          {centralVersionState.status === 'loaded' ? (
            <Typography type="small" className="text-muted-foreground">
              {`Fileglancer Central Version ${centralVersionState.version}`}
            </Typography>
          ) : centralVersionState.status === 'loading' ? (
            <Typography type="small" className="text-muted-foreground">
              Loading Fileglancer Central version...
            </Typography>
          ) : centralVersionState.status === 'error' ? (
            <Typography type="small" className="text-muted-foreground">
              Fileglancer Central version unavailable
            </Typography>
          ) : centralVersionState.status === 'not-configured' ? (
            <Typography type="small" className="text-muted-foreground">
              Fileglancer Central server not configured
            </Typography>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-10">
        {helpLinks.map(({ icon: Icon, title, description, url }, index) => (
          <Card
            key={url}
            as={Link}
            to={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group min-h-44 p-8 md:p-12 flex flex-col gap-2 text-left w-full hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center gap-2">
              <Icon className="hidden md:block icon-default lg:icon-large text-primary" />
              <div className="flex items-center gap-1 text-nowrap">
                <Typography className="text-base md:text-lg lg:text-xl text-primary font-semibold group-hover:underline">
                  {title}
                </Typography>
                <HiExternalLink className="icon-xsmall md:icon-small text-primary" />
              </div>
            </div>
            <Typography className="text-sm md:text-base text-muted-foreground">
              {description}
            </Typography>
          </Card>
        ))}
      </div>
    </>
  );
}
