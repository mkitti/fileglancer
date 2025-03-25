import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { MainAreaWidget } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { requestAPI } from './handler';
import { AppWidget } from './App';
import { LabIcon } from '@jupyterlab/ui-components';
import iconStr from '../style/img/fileglancer.svg';

/**
 * Custom icon
 */
const FileglancerIcon = new LabIcon({
  name: 'fileglancer',
  svgstr: iconStr
});

/**
 * The command IDs used by the react-widget plugin.
 */
namespace CommandIDs {
  export const createReactWidget = 'create-react-widget';
}

/**
 * Initialization data for the fileglancer extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'fileglancer:plugin',
  description: 'Browse, share, and publish files on the Janelia file system',
  autoStart: true,
  optional: [ILauncher],
  activate: (app: JupyterFrontEnd, launcher: ILauncher) => {
    console.log('JupyterLab extension fileglancer is activated!');

    const { commands } = app;
    const command = CommandIDs.createReactWidget;

    commands.addCommand(command, {
      label: 'Fileglancer',
      icon: FileglancerIcon,
      execute: () => {
        console.log('Create React widget command executed');
        const content = new AppWidget();
        const widget = new MainAreaWidget<AppWidget>({ content });
        widget.title.label = 'Fileglancer';
        widget.title.icon = FileglancerIcon;
        app.shell.add(widget, 'main');
      }
    });

    if (launcher) {
      console.log('Adding command to launcher');
      launcher.add({ command });
    }

    requestAPI<any>('file-share-paths')
      .then(data => {
        console.log('DEMO File share paths:');
        console.log(data);
      })
      .catch(reason => {
        console.error(`Problem calling file-share-paths API:\n${reason}`);
      });

    requestAPI<any>('files/local')
      .then(data => {
        console.log('DEMO File listing /local:');
        console.log(data);
      })
      .catch(reason => {
        console.error(`Problem getting file listing:\n${reason}`);
      });

    requestAPI<any>('files/local?subpath=src')
      .then(data => {
        console.log('DEMO File listing /local/src:');
        console.log(data);
      })
      .catch(reason => {
        console.error(`Problem getting file listing:\n${reason}`);
      });
  }
};

export default plugin;
