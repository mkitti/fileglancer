import { List, Typography } from '@material-tailwind/react';
import { Link } from 'react-router';
import { TbBrandGithub } from 'react-icons/tb';
import { SiClickup, SiSlack } from 'react-icons/si';

import useVersionNo from '@/hooks/useVersionState';
import { IconType } from 'react-icons/lib';

type HelpLink = {
  icon: IconType;
  title: string;
  url: string;
};

export default function Help() {
  const { versionNo } = useVersionNo();

  const helpLinks: HelpLink[] = [
    {
      icon: TbBrandGithub,
      title: `View release notes for Fileglancer version ${versionNo}`,
      url: `https://github.com/JaneliaSciComp/fileglancer/releases/tag/${versionNo}`
    },
    {
      icon: SiClickup,
      title: 'Submit a bug report or feature request via ClickUp',
      url: `https://forms.clickup.com/10502797/f/a0gmd-713/NBUCBCIN78SI2BE71G?Version=${versionNo}&URL=${window.location}`
    },
    {
      icon: SiSlack,
      title: 'Get help on Slack',
      url: 'https://hhmi.enterprise.slack.com/archives/C0938N06YN8'
    }
  ];

  return (
    <>
      <Typography type="h5" className="mb-6 text-foreground font-bold">
        Help
      </Typography>
      <List className="w-fit gap-2">
      {helpLinks.map(({ icon: Icon, title, url }) => (
        <List.Item as={Link} to={url} target="_blank"
            rel="noopener noreferrer" className='px-0'>
          <List.ItemStart>
            <Icon className="icon-large" />
          </List.ItemStart>
          <Typography className="text-lg">{title}</Typography>
        </List.Item>
      ))}
      </List>
    </>
  );
}
