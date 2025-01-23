import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { MainAreaWidget } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { reactIcon } from '@jupyterlab/ui-components';
import { CounterWidget } from './widget';
import { requestAPI } from './handler';

/**
 * The command IDs used by the react-widget plugin.
 */
namespace CommandIDs {
  export const createReactWidget = 'create-react-widget';
}

/**
 * Initialization data for the fileglancer-server extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'fileglancer-server:plugin',
  description: 'Browse, share, and publish files on the Janelia file system',
  autoStart: true,
  optional: [ILauncher],
  activate: (app: JupyterFrontEnd, launcher: ILauncher) => {
    console.log('JupyterLab extension fileglancer-server is activated!');

    const { commands } = app;
    const command = CommandIDs.createReactWidget;

    commands.addCommand(command, {
      label: 'React Widget',
      icon: reactIcon,
      execute: () => {
        console.log('Create React widget command executed');
        const content = new CounterWidget();
        const widget = new MainAreaWidget<CounterWidget>({ content });
        widget.title.label = 'React Widget';
        widget.title.icon = reactIcon;
        app.shell.add(widget, 'main');
      }
    });

    if (launcher) {
      launcher.add({ command });
    }

    requestAPI<any>('get-example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The fileglancer_server server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
