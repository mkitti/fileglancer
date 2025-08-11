import { List, Typography } from '@material-tailwind/react';
import { TbBrandGithub } from 'react-icons/tb';
import { SiClickup, SiSlack } from 'react-icons/si';
import { IconType } from 'react-icons/lib';

import useVersionNo from '@/hooks/useVersionState';
import { FgStyledLink } from './ui/Links';
import { FgCard } from './Cards';

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
    <div className="flex flex-col ">
      <div className="flex justify-between mb-6">
        <Typography type="h5" className="text-foreground font-bold">
          Help
        </Typography>
        <Typography type="lead" className="text-foreground font-bold">
          {`Fileglancer version ${versionNo}`}
        </Typography>
      </div>
      <FgCard>
        <List className="w-fit gap-2">
          {helpLinks.map(({ icon: Icon, title, url }) => (
            <List.Item className="hover:bg-transparent focus:bg-transparent">
              <List.ItemStart>
                <Icon className="icon-large" />
              </List.ItemStart>
              <Typography
                as={FgStyledLink}
                target="_blank"
                rel="noopener noreferrer"
                textSize="large"
                to={url}
              >
                {title}
              </Typography>
            </List.Item>
          ))}
        </List>
      </FgCard>
    </div>
  );
}
