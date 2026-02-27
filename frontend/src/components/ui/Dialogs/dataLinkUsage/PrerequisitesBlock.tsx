import { Typography } from '@material-tailwind/react';

import ExternalLink from '@/components/ui/Dialogs/dataLinkUsage/ExternalLink';

const PREREQUISITE_OPTIONS = {
  pixi: { label: 'Pixi', href: 'https://pixi.prefix.dev/latest/installation/' },
  fiji: { label: 'Fiji', href: 'https://imagej.net/software/fiji/downloads' },
  java: { label: 'Java JDK', href: 'https://jdk.java.net/' },
  gradle: {
    label: 'Gradle',
    href: 'https://docs.gradle.org/current/userguide/installation.html'
  },
  vvdviewer: {
    label: 'VVDViewer',
    href: 'https://github.com/JaneliaSciComp/VVDViewer/releases'
  }
} as const;

type PrerequisiteKey = keyof typeof PREREQUISITE_OPTIONS;

interface PrerequisitesBlockProps {
  readonly prerequisites: PrerequisiteKey[];
}

export default function PrerequisitesBlock({
  prerequisites
}: PrerequisitesBlockProps) {
  if (prerequisites.length === 0) {
    return null;
  }

  return (
    <div className="text-foreground">
      <Typography className="font-semibold text-lg">Prerequisites:</Typography>
      <ul className="mt-1 list-disc pl-5 space-y-1">
        {prerequisites.map(key => {
          const { label, href } = PREREQUISITE_OPTIONS[key];
          return (
            <li className="text-base" key={key}>
              <ExternalLink href={href}>{label}</ExternalLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
