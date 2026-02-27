import { Fragment } from 'react/jsx-runtime';

import CodeBlock from '@/components/ui/Dialogs/dataLinkUsage/CodeBlock';
import InstructionBlock from '@/components/ui/Dialogs/dataLinkUsage/InstructionBlock';
import ExternalLink from '@/components/ui/Dialogs/dataLinkUsage/ExternalLink';
import PrerequisitesBlock from '@/components/ui/Dialogs/dataLinkUsage/PrerequisitesBlock';

export default function getNapariTab(
  dataLinkUrl: string,
  tooltipTriggerClasses: string
) {
  return {
    id: 'napari',
    label: 'Napari',
    content: (
      <>
        <PrerequisitesBlock prerequisites={['pixi']} />
        <InstructionBlock
          steps={[
            <Fragment key="one-line-command">
              <span>
                Run this command to use pixi to install the required
                dependencies and launch napari:
              </span>
              <CodeBlock
                code={`pixi exec --spec python=3.12 --spec napari --spec pyqt --spec napari-ome-zarr -- napari ${dataLinkUrl}`}
                copyLabel="Copy code"
                copyable={true}
                language="bash"
                tooltipTriggerClasses={tooltipTriggerClasses}
              />
              <ExternalLink href="https://napari.org/stable/tutorials/fundamentals/installation.html">
                Napari documentation
              </ExternalLink>
            </Fragment>,
            'In the pop-up, select the napari-ome-zarr plugin to open the image. Optionally, save this as the default choice for all files ending with .zarr.'
          ]}
        />
      </>
    )
  };
}
